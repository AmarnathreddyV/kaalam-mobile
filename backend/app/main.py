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

from app.coverage import coverage_for_state, launch_coverage_summary
from app.solar import daily_timing_windows

import httpx

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator


load_dotenv()


NAVAMSHA_URL = "https://api.navamsha.in/api/v1/panchang/full"

NAVAMSHA_API_KEY = os.getenv("NAVAMSHA_API_KEY", "").strip()

# Shared Supabase Postgres cache + a small process-local hot cache.
# Location-sensitive calculations and cache keys preserve resolved coordinates;
# regional coverage groups are never used as substitute calculation locations.
PANCHANG_CACHE_TTL_SECONDS = max(60, int(os.getenv("PANCHANG_CACHE_TTL_SECONDS", "86400")))
PANCHANG_CACHE_MAX_ENTRIES = max(100, int(os.getenv("PANCHANG_CACHE_MAX_ENTRIES", "2000")))
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_CACHE_KEY = (
    os.getenv("SUPABASE_SECRET_KEY", "").strip()
    or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
)
# Legacy service-role keys are JWTs and are accepted in Authorization.
# New sb_secret_* keys are supplied via apikey; do not send them as Bearer JWTs.
def _supabase_cache_headers() -> dict[str, str]:
    headers = {"apikey": SUPABASE_CACHE_KEY}
    if SUPABASE_CACHE_KEY.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {SUPABASE_CACHE_KEY}"
    return headers
_panchang_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_panchang_inflight: dict[str, asyncio.Task] = {}
_panchang_cache_lock = asyncio.Lock()
_panchang_usage = {
    "provider_calls": 0, "cache_hits": 0, "cache_misses": 0,
    "provider_errors": 0, "shared_cache_hits": 0, "shared_cache_errors": 0,
}

def _panchang_cache_key(kind: str, day: date_type, latitude: float, longitude: float, timezone: float, precision: int = 5, **extra: Any) -> str:
    parts = [kind, day.isoformat(), f"{latitude:.{precision}f}", f"{longitude:.{precision}f}", f"{timezone:.4f}"]
    parts.extend(f"{key}={extra[key]}" for key in sorted(extra))
    raw_key = "|".join(parts)
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

def _shared_cache_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_CACHE_KEY)

async def _shared_cache_get(key: str):
    if not _shared_cache_configured():
        return None
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(
                f"{SUPABASE_URL}/rest/v1/panchang_cache",
                params={"cache_key": f"eq.{key}", "select": "payload,expires_at", "limit": "1"},
                headers=_supabase_cache_headers(),
            )
            response.raise_for_status()
            rows = response.json()
        if not rows:
            return None
        row = rows[0]
        expiry = datetime.fromisoformat(str(row["expires_at"]).replace("Z", "+00:00")).timestamp()
        if expiry <= time.time():
            return None
        return row["payload"]
    except (httpx.HTTPError, ValueError, KeyError, TypeError, IndexError):
        _panchang_usage["shared_cache_errors"] += 1
        return None

async def _shared_cache_put(key: str, payload: dict[str, Any]):
    if not _shared_cache_configured():
        return
    expires_at = datetime.fromtimestamp(time.time() + PANCHANG_CACHE_TTL_SECONDS, tz=__import__("datetime").timezone.utc).isoformat()
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.post(
                f"{SUPABASE_URL}/rest/v1/panchang_cache",
                params={"on_conflict": "cache_key"},
                headers={
                    **_supabase_cache_headers(),
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates,return=minimal",
                },
                json={"cache_key": key, "payload": payload, "expires_at": expires_at, "updated_at": datetime.now().astimezone().isoformat()},
            )
            response.raise_for_status()
    except (httpx.HTTPError, ValueError, TypeError):
        _panchang_usage["shared_cache_errors"] += 1

async def _cached_panchang(key: str, loader):
    async with _panchang_cache_lock:
        cached = _panchang_cache.get(key)
        if cached and cached[0] > time.monotonic():
            _panchang_usage["cache_hits"] += 1
            return copy.deepcopy(cached[1])
        if cached:
            _panchang_cache.pop(key, None)
        task = _panchang_inflight.get(key)
        owner = task is None
        if owner:
            async def load_or_retrieve():
                shared = await _shared_cache_get(key)
                if shared is not None:
                    _panchang_usage["shared_cache_hits"] += 1
                    return shared
                _panchang_usage["cache_misses"] += 1
                result = await loader()
                if result.get("data_complete", True):
                    await _shared_cache_put(key, result)
                return result
            task = asyncio.create_task(load_or_retrieve())
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
    return {
        **_panchang_usage,
        "cache_entries": len(_panchang_cache),
        "cache_ttl_seconds": PANCHANG_CACHE_TTL_SECONDS,
        "cache_scope": "Supabase shared cache when configured; process-local fallback",
        "shared_cache_configured": _shared_cache_configured(),
        "coordinate_grid_degrees": None,
        "coordinate_precision_decimals": 6,
        "calculation_location_policy": "exact_resolved_user_coordinates",
    }

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


@app.api_route("/", methods=["GET", "HEAD"])
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
async def health() -> dict[str, Any]:

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
    seconds: int = 0,
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
        "seconds": seconds,
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
    seconds: int = 0,
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
        "seconds": seconds,
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
    Build a Telugu Drik daily Panchang using the apparent local sunrise.

    Navamsha supplies the sidereal Panchang limbs. KAALAM calculates apparent
    sunrise/sunset and all sunrise-derived daily windows locally so they use
    the same convention as the independent Drik city references.
    """
    async def load_daily():
        try:
            timing_data = daily_timing_windows(day, latitude, longitude, timezone)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

        sunrise_value = timing_data["sun_times"]["rise"]["local_datetime"]
        sunrise = datetime.fromisoformat(sunrise_value)
        # Preserve the exact sunrise boundary. The provider accepts seconds;
        # a full extra minute can cross a Tithi/Yoga transition near sunrise.
        panchang_at = sunrise + timedelta(seconds=1)

        async with httpx.AsyncClient(timeout=30.0) as client:
            panchang = await fetch_navamsha_route(
                client,
                "panchang/full",
                day,
                latitude,
                longitude,
                timezone,
                hours=panchang_at.hour,
                minutes=panchang_at.minute,
                seconds=panchang_at.second,
            )

        data: dict[str, Any] = {
            **timing_data,
            "panchang": panchang,
        }
        return {
            "provider": "Navamsha",
            "tradition": "Telugu Drik",
            "date": day.isoformat(),
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "timezone": timezone,
            },
            "data": data,
            "unavailable": {},
            "data_complete": True,
            "recommendations_ready": False,
            "panchang_reference": "apparent_local_sunrise_plus_one_second",
            "calculation_metadata": {
                "panchang_limbs": "Navamsha Lahiri sidereal calculation at apparent local sunrise + 1 second",
                "sunrise_sunset": "KAALAM NOAA apparent-sunrise calculation, zenith 90.8333 degrees",
                "daily_periods": "KAALAM local sunrise/sunset and weekday-based calculation",
                "provider_calls_per_daily_location": 1,
                "cache_namespace": "daily-apparent-v2",
            },
            "message": "Panchangam limbs are evaluated just after apparent local sunrise. Daily timing windows are calculated for the selected coordinates. This is not, by itself, an event-specific Muhurtham recommendation.",
        }

    # Six decimal places preserve resolved coordinates and prevent nearby
    # locations from sharing potentially different sunrise/tithi boundaries.
    key = _panchang_cache_key(
        "daily-apparent-v2", day, latitude, longitude, timezone, precision=6
    )
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
INDIA_TIMEZONE = "Asia/Kolkata"
NOMINATIM_MIN_INTERVAL_SECONDS = 1.1
LOCATION_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60
_location_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_location_lookup_lock = asyncio.Lock()
_last_nominatim_request_at = 0.0


@app.get("/api/coverage")
async def get_launch_coverage() -> dict[str, Any]:
    """Return KAALAM's initial eight-state launch scope and planning allocation."""
    return launch_coverage_summary()


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

        # India has one civil time zone across all launch states and
        # locations. Avoid a second external lookup whose failure or incorrect
        # result could shift sunrise-based Panchangam timings.
        timezone_name = INDIA_TIMEZONE

        address = match.get("address") or {}
        state_name = str(address.get("state") or "").strip()
        coverage = coverage_for_state(state_name)

        result = {
            "query": query,
            "display_name": match.get("display_name", query),
            "state": state_name or None,
            "coverage_supported": coverage["supported"],
            "coverage_priority": coverage["priority"],
            "regional_group_target": coverage["regional_group_target"],
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


# --------------------------------------------------
# INTERNAL PREVIEW PHONE LOGIN (fixed OTP)
# --------------------------------------------------
class PreviewPhoneLoginRequest(BaseModel):
    phone: str = Field(pattern=r"^\+91[6-9]\d{9}$")
    otp: str = Field(pattern=r"^\d{6}$")
    full_name: str = Field(default="", max_length=120)


@app.post("/api/auth/preview-phone-login")
async def preview_phone_login(request: PreviewPhoneLoginRequest) -> dict[str, Any]:
    """Internal-only fixed-OTP login. Creates one distinct Supabase Auth user per phone."""
    if os.getenv("KAALAM_TEST_OTP_ENABLED", "").lower() != "true":
        raise HTTPException(status_code=404, detail="Not found.")
    if not hmac.compare_digest(request.otp, "123456"):
        raise HTTPException(status_code=401, detail="Incorrect test OTP.")
    admin_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    public_key = os.getenv("SUPABASE_ANON_KEY", "").strip()
    auth_secret = os.getenv("KAALAM_TEST_AUTH_SECRET", "").strip()
    auth_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    if not all((admin_key, public_key, auth_secret, auth_url)):
        raise HTTPException(status_code=503, detail="Preview phone login is not configured on the server.")

    # Derive a stable, server-only password so each phone maps to one persistent
    # Auth user without exposing a reusable credential to the mobile app.
    password = hmac.new(auth_secret.encode(), request.phone.encode(), hashlib.sha256).hexdigest()
    admin_headers = {"apikey": admin_key, "Authorization": f"Bearer {admin_key}", "Content-Type": "application/json"}
    public_headers = {"apikey": public_key, "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        # First try signing into an account previously provisioned by this flow.
        token_response = await client.post(
            f"{auth_url}/auth/v1/token?grant_type=password",
            headers=public_headers,
            json={"phone": request.phone, "password": password},
        )
        if token_response.status_code in (400, 401):
            # No matching preview account yet: provision a confirmed phone user.
            create_response = await client.post(
                f"{auth_url}/auth/v1/admin/users",
                headers=admin_headers,
                json={
                    "phone": request.phone,
                    "phone_confirm": True,
                    "password": password,
                    "user_metadata": {
                        "full_name": request.full_name.strip(),
                        "kaalam_preview_fixed_otp": True,
                    },
                },
            )
            if create_response.status_code not in (200, 201):
                # A concurrent request may have created it; retry password sign-in.
                token_response = await client.post(
                    f"{auth_url}/auth/v1/token?grant_type=password",
                    headers=public_headers,
                    json={"phone": request.phone, "password": password},
                )
                if token_response.status_code not in (200, 201):
                    raise HTTPException(status_code=409, detail="This number already has an account created through a different sign-in method. Contact the test administrator.")
            else:
                token_response = await client.post(
                    f"{auth_url}/auth/v1/token?grant_type=password",
                    headers=public_headers,
                    json={"phone": request.phone, "password": password},
                )
        if token_response.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail="Could not create a preview login session.")
        session = token_response.json()
    return {
        "access_token": session["access_token"],
        "refresh_token": session["refresh_token"],
        "token_type": session.get("token_type", "bearer"),
        "expires_in": session.get("expires_in", 3600),
    }
