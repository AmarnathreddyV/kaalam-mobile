import os
import json
import asyncio
import base64
import copy
import hashlib
import hmac
import time
from pathlib import Path

from datetime import date as date_type
from datetime import datetime
from datetime import timedelta
from typing import Any

import httpx

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator


load_dotenv()


NAVAMSHA_URL = "https://api.navamsha.in/api/v1/panchang/full"

OPENAI_URL = "https://api.openai.com/v1/responses"

NAVAMSHA_API_KEY = os.getenv("NAVAMSHA_API_KEY", "").strip()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()

OPENAI_MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-5.5"
).strip()

# Process-local cache; use Redis for multi-instance production deployments.
PANCHANG_CACHE_TTL_SECONDS = max(60, int(os.getenv("PANCHANG_CACHE_TTL_SECONDS", "86400")))
PANCHANG_CACHE_MAX_ENTRIES = max(100, int(os.getenv("PANCHANG_CACHE_MAX_ENTRIES", "2000")))
_panchang_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_panchang_inflight: dict[str, asyncio.Task] = {}
_panchang_cache_lock = asyncio.Lock()
_panchang_usage = {"provider_calls": 0, "cache_hits": 0, "cache_misses": 0, "provider_errors": 0}

def _panchang_cache_key(kind: str, day: date_type, latitude: float, longitude: float, timezone: float, **extra: Any) -> str:
    parts = [kind, day.isoformat(), f"{latitude:.5f}", f"{longitude:.5f}", f"{timezone:.4f}"]
    parts.extend(f"{key}={extra[key]}" for key in sorted(extra))
    return "|".join(parts)

async def _cached_panchang(key: str, loader):
    async with _panchang_cache_lock:
        cached = _panchang_cache.get(key)
        if cached and cached[0] > time.monotonic():
            _panchang_usage["cache_hits"] += 1
            return copy.deepcopy(cached[1])
        if cached:
            _panchang_cache.pop(key, None)
        _panchang_usage["cache_misses"] += 1
        task = _panchang_inflight.get(key)
        owner = task is None
        if owner:
            task = asyncio.create_task(loader())
            _panchang_inflight[key] = task
    try:
        result = await task
        if owner:
            async with _panchang_cache_lock:
                if len(_panchang_cache) >= PANCHANG_CACHE_MAX_ENTRIES:
                    oldest = min(_panchang_cache, key=lambda k: _panchang_cache[k][0])
                    _panchang_cache.pop(oldest, None)
                _panchang_cache[key] = (time.monotonic() + PANCHANG_CACHE_TTL_SECONDS, copy.deepcopy(result))
        return copy.deepcopy(result)
    finally:
        if owner:
            async with _panchang_cache_lock:
                if _panchang_inflight.get(key) is task:
                    _panchang_inflight.pop(key, None)

def _panchang_usage_snapshot() -> dict[str, Any]:
    return {**_panchang_usage, "cache_entries": len(_panchang_cache), "cache_ttl_seconds": PANCHANG_CACHE_TTL_SECONDS, "cache_scope": "single backend instance; resets on restart"}

app = FastAPI(
    title="KAALAM API",
    version="0.4.0"
)


origins_value = os.getenv("CORS_ORIGINS", "*")

origins = (
    ["*"]
    if origins_value == "*"
    else [
        x.strip()
        for x in origins_value.split(",")
        if x.strip()
    ]
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    # Friendly root response for platform probes and quick manual checks.
    return {"status": "ok", "service": "kaalam-api", "health": "/health"}




# --------------------------------------------------
# SUPABASE AUTH -> MSG91 SMS DELIVERY
# Supabase generates/verifies the OTP. MSG91 only delivers it.
# --------------------------------------------------

MSG91_AUTHKEY = os.getenv("MSG91_AUTHKEY", "").strip()
MSG91_OTP_TEMPLATE_ID = os.getenv("MSG91_OTP_TEMPLATE_ID", "").strip()
SUPABASE_AUTH_SMS_HOOK_SECRET = os.getenv("SUPABASE_AUTH_SMS_HOOK_SECRET", "").strip()


def verify_supabase_sms_hook(request: Request, raw_body: bytes) -> bool:
    """Verify the Standard Webhooks signature sent by Supabase Auth."""
    secret = SUPABASE_AUTH_SMS_HOOK_SECRET
    webhook_id = request.headers.get("webhook-id", "")
    timestamp = request.headers.get("webhook-timestamp", "")
    signature_header = request.headers.get("webhook-signature", "")
    if not (secret and webhook_id and timestamp and signature_header):
        return False

    try:
        timestamp_seconds = int(timestamp)
        if abs(time.time() - timestamp_seconds) > 300:
            return False
        encoded_secret = secret.removeprefix("whsec_")
        key = base64.b64decode(encoded_secret, validate=True)
    except (ValueError, TypeError):
        return False

    signed_content = webhook_id.encode() + b"." + timestamp.encode() + b"." + raw_body
    digest = base64.b64encode(hmac.new(key, signed_content, hashlib.sha256).digest()).decode()
    expected = f"v1,{digest}"
    supplied = [part.strip() for part in signature_header.split() if part.strip()]
    return any(hmac.compare_digest(expected, candidate) for candidate in supplied)


@app.post("/api/auth/send-sms")
async def send_supabase_auth_sms(request: Request) -> dict[str, str]:
    """Deliver Supabase-generated phone OTPs through the MSG91 India route."""
    raw_body = await request.body()
    if not verify_supabase_sms_hook(request, raw_body):
        raise HTTPException(status_code=401, detail="Invalid or expired authentication webhook signature.")

    if not MSG91_AUTHKEY or not MSG91_OTP_TEMPLATE_ID:
        raise HTTPException(status_code=503, detail="MSG91 SMS delivery is not configured.")

    try:
        event = json.loads(raw_body)
        phone = str((event.get("user") or {}).get("phone") or "")
        otp = str((event.get("sms") or {}).get("otp") or "")
    except (ValueError, AttributeError, TypeError) as exc:
        raise HTTPException(status_code=400, detail="Invalid SMS hook payload.") from exc

    # KAALAM is India-only at launch. Never send international SMS by mistake.
    if not phone.startswith("+91") or len(phone) != 13 or not phone[3:].isdigit() or phone[3] not in "6789":
        raise HTTPException(status_code=400, detail="Only valid +91 Indian mobile numbers are supported.")
    if len(otp) != 6 or not otp.isdigit():
        raise HTTPException(status_code=400, detail="Supabase did not provide a valid six-digit OTP.")

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                "https://control.msg91.com/api/v5/otp",
                params={
                    "template_id": MSG91_OTP_TEMPLATE_ID,
                    "mobile": phone,
                    "otp": otp,
                    "otp_length": "6",
                    "otp_expiry": "5",
                    "unicode": "0",
                },
                headers={
                    "authkey": MSG91_AUTHKEY,
                    "Content-Type": "application/json",
                },
                json={},
            )
            response.raise_for_status()
            provider_result = response.json()
            if not isinstance(provider_result, dict) or provider_result.get("type") != "success":
                raise HTTPException(status_code=502, detail="MSG91 did not accept the OTP message.")
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError) as exc:
        # Do not log or return the OTP, authkey, or full provider payload.
        raise HTTPException(status_code=502, detail="MSG91 could not deliver the verification message.") from exc

    return {"status": "sent"}


@app.get("/health")
async def health() -> dict[str, str]:

    return {"status": "ok", "service": "kaalam-api", "panchang_usage": _panchang_usage_snapshot()}


@app.get("/api/usage")
async def usage() -> dict[str, Any]:
    return {"service": "kaalam-api", "panchang": _panchang_usage_snapshot()}


async def fetch_panchang(
    client: httpx.AsyncClient,
    day: date_type,
    latitude: float,
    longitude: float,
    timezone: float,
    hours: int = 12,
    minutes: int = 0,
) -> dict[str, Any]:

    if not NAVAMSHA_API_KEY:

        raise HTTPException(
            status_code=503,
            detail="Navamsha API key is not configured."
        )

    payload = {
        "year": day.year,
        "month": day.month,
        "date": day.day,
        "hours": hours,
        "minutes": minutes,
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
    }

    try:

        # Navamsha may apply request-rate limits. Retry 429 responses
        # with exponential backoff and honour Retry-After when present.
        _panchang_usage["provider_calls"] += 1
        response = None
        for attempt in range(4):
            response = await client.post(
                NAVAMSHA_URL,
                headers={
                    "X-API-Key": NAVAMSHA_API_KEY,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if response.status_code != 429:
                break
            if attempt == 3:
                break
            retry_after = response.headers.get("Retry-After")
            try:
                wait_seconds = float(retry_after) if retry_after else (2 ** (attempt + 1))
            except ValueError:
                wait_seconds = 2 ** (attempt + 1)
            await asyncio.sleep(min(max(wait_seconds, 1), 30))

        response.raise_for_status()
        data = response.json()

    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Navamsha rate limit reached while checking {day.isoformat()}. "
                    "KAALAM paused the search to avoid sending more requests. "
                    "Wait before retrying, or ask Navamsha to increase the API quota."
                ),
                headers={"Retry-After": exc.response.headers.get("Retry-After", "60")},
            ) from exc

        raise HTTPException(
            status_code=502,
            detail=(
                f"Navamsha returned HTTP "
                f"{exc.response.status_code} "
                f"for {day.isoformat()}."
            )
        ) from exc

    except (httpx.RequestError, ValueError) as exc:

        raise HTTPException(
            status_code=502,
            detail=(
                f"Could not retrieve Panchangam "
                f"for {day.isoformat()}."
            )
        ) from exc

    if not isinstance(data, dict) or "output" not in data:

        raise HTTPException(
            status_code=502,
            detail="Navamsha returned an unexpected response."
        )

    return {
        "date": day.isoformat(),
        "data": data["output"],
    }


@app.get("/api/panchang")
async def get_panchang(
    day: date_type = Query(
        default_factory=date_type.today
    ),

    latitude: float = Query(
        17.3850,
        ge=-90,
        le=90
    ),

    longitude: float = Query(
        78.4867,
        ge=-180,
        le=180
    ),

    timezone: float = Query(
        5.5,
        ge=-12,
        le=14
    ),

    hours: int = Query(
        12,
        ge=0,
        le=23
    ),

    minutes: int = Query(
        0,
        ge=0,
        le=59
    ),
) -> dict[str, Any]:

    async def load():
        async with httpx.AsyncClient(timeout=30.0) as client:
            return await fetch_panchang(client, day, latitude, longitude, timezone, hours, minutes)

    key = _panchang_cache_key("single", day, latitude, longitude, timezone, hours=hours, minutes=minutes)
    result = await _cached_panchang(key, load)

    return {
        "provider": "Navamsha",
        "date": day.isoformat(),
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone,
        },
        "data": result["data"],
    }


# --------------------------------------------------
# DAILY PANCHANGAM WITH TIMING WINDOWS
# --------------------------------------------------

NAVAMSHA_BASE_URL = "https://api.navamsha.in/api/v1"


async def fetch_navamsha_route(
    client: httpx.AsyncClient,
    route: str,
    day: date_type,
    latitude: float,
    longitude: float,
    timezone: float,
    hours: int = 12,
    minutes: int = 0,
) -> dict[str, Any]:
    """
    Fetch one documented Navamsha Panchang route.
    Keep the provider key on the backend only.
    """
    if not NAVAMSHA_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Navamsha API key is not configured."
        )

    payload = {
        "year": day.year,
        "month": day.month,
        "date": day.day,
        "hours": hours,
        "minutes": minutes,
        "latitude": latitude,
        "longitude": longitude,
        "timezone": timezone,
    }

    _panchang_usage["provider_calls"] += 1
    response = await client.post(
        f"{NAVAMSHA_BASE_URL}/{route.lstrip('/')}",
        headers={
            "X-API-Key": NAVAMSHA_API_KEY,
            "Content-Type": "application/json",
        },
        json=payload,
    )
    try:
        response.raise_for_status()
    except httpx.HTTPStatusError:
        _panchang_usage["provider_errors"] += 1
        raise

    body = response.json()
    if not isinstance(body, dict) or "output" not in body:
        raise ValueError(
            f"Unexpected Navamsha response for {route}."
        )

    return body["output"]


@app.get("/api/panchang/daily")
async def get_daily_panchang_with_timings(
    day: date_type = Query(default_factory=date_type.today),
    latitude: float = Query(17.3850, ge=-90, le=90),
    longitude: float = Query(78.4867, ge=-180, le=180),
    timezone: float = Query(5.5, ge=-12, le=14),
) -> dict[str, Any]:
    """
    Aggregates real Navamsha Panchang and daily timing routes.
    This endpoint reports source data; it does not certify
    event-specific Muhurtham suitability.
    """
    routes = {
        "panchang": "panchang/full",
        "sun_times": "panchang/sun-times",
        "inauspicious_periods": "panchang/inauspicious-periods",
        "choghadiya": "panchang/choghadiya",
        "hora": "panchang/hora",
        "abhijit_muhurat": "panchang/abhijit-muhurat",
    }

    async def load_daily():
        async with httpx.AsyncClient(timeout=30.0) as client:
            # First obtain local sunrise. The five Panchang limbs must be
            # calculated just after sunrise so the response represents the
            # sunrise-based Panchang day, not an arbitrary noon snapshot.
            sun_times = await fetch_navamsha_route(
                client, routes["sun_times"], day, latitude, longitude, timezone,
                hours=12, minutes=0,
            )
            sunrise_value = (sun_times.get("rise") or {}).get("local_datetime")
            if not isinstance(sunrise_value, str):
                raise HTTPException(
                    status_code=502,
                    detail="Navamsha did not return a usable local sunrise time.",
                )
            try:
                sunrise = datetime.fromisoformat(sunrise_value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=502,
                    detail="Navamsha returned an invalid local sunrise time.",
                ) from exc

            # Add one minute to avoid evaluating at the exact sunrise boundary.
            panchang_minute = sunrise.minute + 1
            panchang_hour = sunrise.hour
            if panchang_minute >= 60:
                panchang_minute = 0
                panchang_hour = (panchang_hour + 1) % 24

            remaining_routes = {
                key: route for key, route in routes.items()
                if key != "sun_times"
            }
            tasks = {
                key: fetch_navamsha_route(
                    client, route, day, latitude, longitude, timezone,
                    hours=panchang_hour, minutes=panchang_minute,
                )
                for key, route in remaining_routes.items()
            }
            results = await asyncio.gather(*tasks.values(), return_exceptions=True)

        data: dict[str, Any] = {"sun_times": sun_times}
        unavailable: dict[str, str] = {}
        for key, result in zip(tasks.keys(), results):
            if isinstance(result, Exception):
                if isinstance(result, httpx.HTTPStatusError):
                    unavailable[key] = f"Navamsha HTTP {result.response.status_code}"
                elif isinstance(result, httpx.RequestError):
                    unavailable[key] = "Navamsha request failed"
                else:
                    unavailable[key] = str(result)[:240]
            else:
                data[key] = result
        if "panchang" not in data:
            raise HTTPException(status_code=502, detail={"message": "Could not retrieve core sunrise-based Panchangam data.", "unavailable": unavailable})
        return {
            "provider": "Navamsha", "tradition": "Telugu Drik", "date": day.isoformat(),
            "location": {"latitude": latitude, "longitude": longitude, "timezone": timezone},
            "data": data, "unavailable": unavailable, "data_complete": len(data) == len(routes),
            "recommendations_ready": False,
            "panchang_reference": "local_sunrise_plus_one_minute",
            "message": "Daily Panchangam limbs are evaluated just after local sunrise. Daily timing data is not, by itself, an event-specific Muhurtham recommendation.",
        }


    key = _panchang_cache_key("daily", day, latitude, longitude, timezone)
    result = await _cached_panchang(key, load_daily)
    if not result.get("data_complete"):
        async with _panchang_cache_lock:
            _panchang_cache.pop(key, None)
    return result

# --------------------------------------------------
# MUHURTHAM SEARCH
# --------------------------------------------------


class MuhurthamSearchRequest(BaseModel):

    occasion: str = Field(
        min_length=3,
        max_length=160
    )

    start_date: date_type

    end_date: date_type

    latitude: float = Field(
        default=17.3850,
        ge=-90,
        le=90
    )

    longitude: float = Field(
        default=78.4867,
        ge=-180,
        le=180
    )

    timezone: float = Field(
        default=5.5,
        ge=-12,
        le=14
    )

    tradition: str = Field(
        default="Telugu Drik",
        max_length=80
    )

    @model_validator(mode="after")
    def validate_dates(self):

        if self.end_date < self.start_date:

            raise ValueError(
                "End date cannot be earlier than start date."
            )

        total_days = (
            self.end_date - self.start_date
        ).days + 1

        if total_days > 366:

            raise ValueError(
                "Search period cannot exceed 366 days."
            )

        return self


MUHURTHAM_DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "muhurtham_sources_2026_2027.json"


def load_muhurtham_dataset() -> dict[str, Any]:
    try:
        with MUHURTHAM_DATA_FILE.open("r", encoding="utf-8") as dataset_file:
            dataset = json.load(dataset_file)
        if not isinstance(dataset, dict) or not isinstance(dataset.get("records"), list):
            raise ValueError("Dataset must contain a records array.")
        return dataset
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail="Published Muhurtham dataset is not installed on the server.") from exc
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=500, detail="Published Muhurtham dataset is invalid.") from exc


def normalize_occasion(value: str) -> str:
    normalized = " ".join(value.lower().replace("-", " ").replace("_", " ").split())
    if any(term in normalized for term in ("gruhapraves", "griha praves", "house warming", "housewarming", "house warming ceremony")):
        return "griha_pravesham"
    if any(term in normalized for term in ("vivah", "marriage", "wedding")):
        return "vivaha"
    if any(term in normalized for term in ("annaprash", "anna prash")):
        return "annaprashana"
    if any(term in normalized for term in ("namakaran", "naming ceremony", "name giving")):
        return "namakarana"
    if any(term in normalized for term in ("upanayan", "upanayana")):
        return "upanayana"
    if any(term in normalized for term in ("vehicle", "car purchase", "bike purchase")):
        return "vehicle_purchase"
    return normalized.replace(" ", "_")


@app.post("/api/muhurtham/search")
async def search_muhurtham(
    request: MuhurthamSearchRequest
) -> dict[str, Any]:
    """
    Search source-attributed published Muhurtham records.
    Results are presented as publisher listings, not as independently
    certified or personalized auspicious recommendations.
    """
    if request.tradition.lower() not in (
        "telugu drik",
        "telugu drik panchangam",
    ):
        raise HTTPException(
            status_code=400,
            detail="KAALAM currently supports Telugu Drik only.",
        )

    dataset = load_muhurtham_dataset()
    requested_occasion = normalize_occasion(request.occasion)
    sources = {
        source.get("source_id"): source
        for source in dataset.get("sources", [])
        if isinstance(source, dict)
    }

    matches = []
    for record in dataset["records"]:
        if not isinstance(record, dict):
            continue
        if record.get("occasion") != requested_occasion:
            continue
        record_date = record.get("date")
        try:
            parsed_date = date_type.fromisoformat(record_date)
        except (TypeError, ValueError):
            continue
        if not (request.start_date <= parsed_date <= request.end_date):
            continue

        source = sources.get(record.get("source_id"), {})
        start_value = record.get("interval_start", "")
        end_value = record.get("interval_end", "")
        start_time = start_value[11:16] if len(start_value) >= 16 else ""
        end_time = end_value[11:16] if len(end_value) >= 16 else ""
        crosses_midnight = bool(end_value[:10] and end_value[:10] != record_date)

        matches.append({
            "date": record_date,
            "start_time": start_time,
            "end_time": end_time,
            "reason": "Published listing"
                + (f" • {record.get('nakshatra')}" if record.get("nakshatra") else "")
                + (f" • {record.get('tithi')}" if record.get("tithi") else "")
                + (f" • {source.get('publisher', 'Source not specified')}" if source.get("publisher") else "")
                + (" • ends next day" if crosses_midnight else ""),
            "occasion": record.get("occasion"),
            "nakshatra": record.get("nakshatra"),
            "tithi": record.get("tithi"),
            "source": source.get("publisher", "Source not specified"),
            "source_url": source.get("url"),
            "source_status": record.get("source_status", "published_unverified"),
            "interval_start": start_value,
            "interval_end": end_value,
        })

    matches.sort(key=lambda item: (item["date"], item["start_time"]))
    total_days = (request.end_date - request.start_date).days + 1
    return {
        "provider": "KAALAM published Muhurtham dataset",
        "tradition": "Telugu Drik (source-attributed listings)",
        "occasion": request.occasion,
        "start_date": request.start_date.isoformat(),
        "end_date": request.end_date.isoformat(),
        "location": {
            "latitude": request.latitude,
            "longitude": request.longitude,
            "timezone": request.timezone,
        },
        "total_days": total_days,
        "recommendations": matches,
        "results": matches,
        "result_type": "published_muhurtham_listings",
        "recommendations_ready": True,
        "data_status": "published_unverified",
        "message": (
            f"Found {len(matches)} published {request.occasion} listing(s). "
            "These are source-attributed calendar entries, not independently "
            "verified or personalized Muhurtham approvals. Confirm the final "
            "timing with your family priest."
            if matches else
            f"No published {request.occasion} entries were found in this date range."
        ),
    }


# --------------------------------------------------
# AI OCCASION ANALYSIS
# --------------------------------------------------


class OccasionAnalysisRequest(BaseModel):

    occasion: str = Field(
        min_length=3,
        max_length=160
    )

    location: str = Field(
        default="Not provided",
        max_length=120
    )

    tradition: str = Field(
        default="Telugu Drik Panchangam",
        max_length=80
    )

    language: str = Field(
        default="English",
        max_length=30
    )


@app.post("/api/occasion/analyze")
async def analyze_custom_occasion(
    request: OccasionAnalysisRequest
) -> dict[str, Any]:

    if not OPENAI_API_KEY:

        raise HTTPException(
            status_code=503,
            detail="OpenAI is not configured."
        )

    language_instructions = {
        "Telugu": "Write the entire response in natural, clear Telugu (తెలుగు). Do not use English headings or English explanatory sentences. Keep traditional Sanskrit terms in common Telugu script.",
        "Hindi": "Write the entire response in natural, clear Hindi (हिन्दी). Do not use English headings or English explanatory sentences. Keep traditional Sanskrit terms in common Devanagari script.",
        "English": "Write the entire response in clear English.",
    }
    requested_language = request.language if request.language in language_instructions else "English"

    prompt = f"""
A user entered an occasion for KAALAM.

Occasion: {request.occasion}
Location: {request.location}
Tradition: {request.tradition}
Required response language: {requested_language}
Language rule: {language_instructions[requested_language]}
Every heading, bullet, explanation, warning and concluding sentence must be in the required response language. Do not switch to English unless English was selected. Preserve the user's occasion name if it is a proper name, but explain it in the required response language.

Analyze the occasion and identify relevant traditional
Hindu Muhurtham considerations.

Use these headings:

1. Occasion understood
2. Relevant traditional considerations
3. Details needed
4. What KAALAM should check before suggesting a date

Rules:

- Never invent auspicious dates or timings.
- Never invent Panchangam values.
- Never claim a date is auspicious without verified data.
- Consider Telugu Drik traditions.
- Mention when customs differ between families.
- Treat astrology as traditional cultural guidance.
- Keep the answer concise.
"""

    try:

        async with httpx.AsyncClient(timeout=45.0) as client:

            response = await client.post(
                OPENAI_URL,

                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },

                json={
                    "model": OPENAI_MODEL,

                    "instructions": (
                        "You are KAALAM, a careful assistant "
                        "specializing in Hindu Panchangam and "
                        "Muhurtham traditions. Never fabricate "
                        "astronomical or Panchangam data. Follow "
                        "the response language explicitly requested "
                        "in the user input for every part of the answer."
                    ),

                    "input": prompt,

                    "max_output_tokens": 700,

                    "store": False,
                },
            )

        response.raise_for_status()

        result = response.json()

        answer_parts = []

        for item in result.get("output", []):

            if item.get("type") == "message":

                for content in item.get("content", []):

                    if content.get("type") == "output_text":

                        answer_parts.append(
                            content.get("text", "")
                        )

        answer = "\n".join(answer_parts).strip()

        if not answer:

            raise ValueError(
                "OpenAI returned an empty response."
            )

    except httpx.HTTPStatusError as exc:

        raise HTTPException(
            status_code=502,
            detail=(
                f"OpenAI returned HTTP "
                f"{exc.response.status_code}."
            )
        ) from exc

    except (
        httpx.RequestError,
        ValueError,
        KeyError
    ) as exc:

        raise HTTPException(
            status_code=502,
            detail="Could not analyze this occasion with OpenAI."
        ) from exc

    return {
        "provider": "OpenAI",
        "model": OPENAI_MODEL,
        "occasion": request.occasion,
        "analysis": answer,
    }


# --------------------------------------------------
# USER-SPECIFIC BIRTH PLACE RESOLUTION AND BIRTH CHART
# --------------------------------------------------

from datetime import datetime
from zoneinfo import ZoneInfo

NAVAMSHA_KUNDALI_BASIC_URL = "https://api.navamsha.in/api/v1/kundali/basic"


class LocationResolveRequest(BaseModel):
    place: str = Field(min_length=2, max_length=180)


class BirthChartRequest(BaseModel):
    date_of_birth: date_type
    time_of_birth: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    timezone: str = Field(min_length=1, max_length=80)


# Nominatim's public service permits at most one request per second
# across the whole application. Serialize calls and cache successful place
# resolutions so reopening the app does not repeatedly geocode the same city.
NOMINATIM_MIN_INTERVAL_SECONDS = 1.1
LOCATION_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60
_location_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_location_lookup_lock = asyncio.Lock()
_last_nominatim_request_at = 0.0


@app.post("/api/location/resolve")
async def resolve_location(request: LocationResolveRequest) -> dict[str, Any]:
    """Resolve an Indian place to coordinates and an IANA timezone."""
    global _last_nominatim_request_at

    query = " ".join(request.place.strip().split())
    cache_key = query.casefold()
    now = time.monotonic()
    cached = _location_cache.get(cache_key)
    if cached and cached[0] > now:
        return copy.deepcopy(cached[1])

    # Keep the lock until timezone resolution and cache insertion finish. This
    # also coalesces simultaneous onboarding requests for the same city.
    async with _location_lookup_lock:
        now = time.monotonic()
        cached = _location_cache.get(cache_key)
        if cached and cached[0] > now:
            return copy.deepcopy(cached[1])

        elapsed = now - _last_nominatim_request_at
        if elapsed < NOMINATIM_MIN_INTERVAL_SECONDS:
            await asyncio.sleep(NOMINATIM_MIN_INTERVAL_SECONDS - elapsed)

        _last_nominatim_request_at = time.monotonic()
        try:
            async with httpx.AsyncClient(
                timeout=15.0,
                headers={"User-Agent": "KAALAM/1.0 (https://github.com/AmarnathreddyV/kaalam-mobile)"},
            ) as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": query,
                        "format": "jsonv2",
                        "limit": 10,
                        "countrycodes": "in",
                        "addressdetails": 1,
                    },
                )
                response.raise_for_status()
                matches = response.json()
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise HTTPException(status_code=502, detail="Location lookup is temporarily unavailable. Please retry shortly.") from exc

        india_matches = [
            item for item in matches
            if isinstance(item, dict)
            and (item.get("address") or {}).get("country_code", "").lower() == "in"
        ]
        if not india_matches:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Could not find an Indian location matching '{query}'. "
                    "Enter a village, town, city, district or state in India."
                ),
            )

        match = india_matches[0]
        latitude = float(match["lat"])
        longitude = float(match["lon"])

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                timezone_response = await client.get(
                    "https://timeapi.io/api/TimeZone/coordinate",
                    params={"latitude": latitude, "longitude": longitude},
                )
                timezone_response.raise_for_status()
                timezone_body = timezone_response.json()
            timezone_name = (
                timezone_body.get("timeZone")
                or timezone_body.get("timeZoneId")
                or timezone_body.get("ianaTimeId")
            )
        except (httpx.RequestError, httpx.HTTPStatusError, ValueError) as exc:
            raise HTTPException(status_code=502, detail="Could not resolve the time zone for this location.") from exc

        if not isinstance(timezone_name, str) or "/" not in timezone_name:
            raise HTTPException(status_code=502, detail="Time zone provider returned an invalid IANA time zone.")

        result = {
            "query": query,
            "display_name": match.get("display_name", query),
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone_name,
        }
        _location_cache[cache_key] = (
            time.monotonic() + LOCATION_CACHE_TTL_SECONDS,
            copy.deepcopy(result),
        )
        return result


@app.post("/api/kundali/basic")
async def calculate_basic_kundali(request: BirthChartRequest) -> dict[str, Any]:
    """Calculate a Vedic basic chart using the authenticated user's supplied birth inputs."""
    if not NAVAMSHA_API_KEY:
        raise HTTPException(status_code=503, detail="Navamsha API key is not configured.")

    try:
        zone = ZoneInfo(request.timezone)
        local_birth = datetime.combine(
            request.date_of_birth,
            datetime.strptime(request.time_of_birth, "%H:%M").time(),
        ).replace(tzinfo=zone)
        offset_seconds = local_birth.utcoffset().total_seconds()
        offset_hours = offset_seconds / 3600
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=422, detail="Invalid IANA time zone or birth time.") from exc

    # Navamsha's Kundali endpoint accepts a numeric UTC offset.
    payload = {
        "year": request.date_of_birth.year,
        "month": request.date_of_birth.month,
        "date": request.date_of_birth.day,
        "hours": int(request.time_of_birth[:2]),
        "minutes": int(request.time_of_birth[3:]),
        "latitude": request.latitude,
        "longitude": request.longitude,
        "timezone": offset_hours,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                NAVAMSHA_KUNDALI_BASIC_URL,
                headers={"X-API-Key": NAVAMSHA_API_KEY, "Content-Type": "application/json"},
                json=payload,
            )
            response.raise_for_status()
            body = response.json()
    except httpx.HTTPStatusError as exc:
        status = 429 if exc.response.status_code == 429 else 502
        detail = "Navamsha rate limit reached. Please wait and retry." if status == 429 else f"Navamsha returned HTTP {exc.response.status_code} for the birth chart."
        raise HTTPException(status_code=status, detail=detail) from exc
    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Could not calculate the birth chart.") from exc

    output = body.get("output") if isinstance(body, dict) else None
    if not isinstance(output, dict):
        raise HTTPException(status_code=502, detail="Navamsha returned an unexpected birth-chart response.")

    moon = (output.get("planets") or {}).get("Moon") or {}
    ascendant = output.get("ascendant") or {}
    return {
        "provider": "Navamsha",
        "calculation": "Vedic sidereal (Lahiri)",
        "birth_inputs": {
            "date": request.date_of_birth.isoformat(),
            "time": request.time_of_birth,
            "latitude": request.latitude,
            "longitude": request.longitude,
            "timezone": request.timezone,
            "utc_offset_hours": offset_hours,
        },
        "chart": output,
        "summary": {
            "rashi": moon.get("zodiac_sign_name"),
            "nakshatra": moon.get("nakshatra_name"),
            "pada": moon.get("nakshatra_pada"),
            "lagna": ascendant.get("zodiac_sign_name"),
        },
    }
