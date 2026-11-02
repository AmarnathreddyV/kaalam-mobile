import os
import asyncio

from datetime import date as date_type
from datetime import timedelta
from typing import Any

import httpx

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
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


@app.get("/health")
async def health() -> dict[str, str]:

    return {
        "status": "ok",
        "service": "kaalam-api"
    }


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

    async with httpx.AsyncClient(timeout=30.0) as client:

        result = await fetch_panchang(
            client=client,
            day=day,
            latitude=latitude,
            longitude=longitude,
            timezone=timezone,
            hours=hours,
            minutes=minutes,
        )

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

    response = await client.post(
        f"{NAVAMSHA_BASE_URL}/{route.lstrip('/')}",
        headers={
            "X-API-Key": NAVAMSHA_API_KEY,
            "Content-Type": "application/json",
        },
        json=payload,
    )
    response.raise_for_status()

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

    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = {
            key: fetch_navamsha_route(
                client=client,
                route=route,
                day=day,
                latitude=latitude,
                longitude=longitude,
                timezone=timezone,
                # Noon is after local sunrise and preserves the
                # sunrise-based weekday for this calendar date.
                hours=12,
                minutes=0,
            )
            for key, route in routes.items()
        }

        results = await asyncio.gather(
            *tasks.values(),
            return_exceptions=True,
        )

    data: dict[str, Any] = {}
    unavailable: dict[str, str] = {}

    for key, result in zip(tasks.keys(), results):
        if isinstance(result, Exception):
            if isinstance(result, httpx.HTTPStatusError):
                unavailable[key] = (
                    f"Navamsha HTTP {result.response.status_code}"
                )
            elif isinstance(result, httpx.RequestError):
                unavailable[key] = "Navamsha request failed"
            else:
                unavailable[key] = str(result)[:240]
        else:
            data[key] = result

    if "panchang" not in data:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Could not retrieve core Panchangam data.",
                "unavailable": unavailable,
            },
        )

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
        "unavailable": unavailable,
        "data_complete": len(data) == len(routes),
        "recommendations_ready": False,
        "message": (
            "Daily Panchangam and timing data retrieved. "
            "These timings are not, by themselves, an "
            "event-specific Muhurtham recommendation."
        ),
    }


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


@app.post("/api/muhurtham/search")
async def search_muhurtham(
    request: MuhurthamSearchRequest
) -> dict[str, Any]:

    if not NAVAMSHA_API_KEY:

        raise HTTPException(
            status_code=503,
            detail="Navamsha API key is not configured."
        )

    if request.tradition.lower() not in (
        "telugu drik",
        "telugu drik panchangam",
    ):

        raise HTTPException(
            status_code=400,
            detail="KAALAM currently supports Telugu Drik only."
        )

    total_days = (
        request.end_date - request.start_date
    ).days + 1

    dates = [
        request.start_date + timedelta(days=i)
        for i in range(total_days)
    ]

    # Keep provider traffic gentle: one request at a time.\n    semaphore = asyncio.Semaphore(1)

    async with httpx.AsyncClient(timeout=30.0) as client:

        async def fetch_one(day):

            async with semaphore:
                # Small spacing between date requests reduces burst 429s.
                await asyncio.sleep(1.0)
                return await fetch_panchang(
                    client=client,
                    day=day,
                    latitude=request.latitude,
                    longitude=request.longitude,
                    timezone=request.timezone,
                    hours=12,
                    minutes=0,
                )

        try:

            results = await asyncio.gather(
                *[
                    fetch_one(day)
                    for day in dates
                ]
            )

        except HTTPException as exc:
            if exc.status_code == 429:
                raise
            raise

        except Exception as exc:

            raise HTTPException(
                status_code=502,
                detail="Unable to complete Panchangam search."
            ) from exc

    return {
        "provider": "Navamsha",

        "tradition": "Telugu Drik",

        "occasion": request.occasion,

        "start_date": request.start_date.isoformat(),

        "end_date": request.end_date.isoformat(),

        "location": {
            "latitude": request.latitude,
            "longitude": request.longitude,
            "timezone": request.timezone,
        },

        "total_days": total_days,

        "results": results,

        "result_type": "daily_panchangam_snapshots",

        "recommendations_ready": False,

        "message": (
            "Daily Panchangam snapshots retrieved successfully. "
            "Occasion-specific Muhurtham evaluation and verified "
            "auspicious timings have not yet been implemented."
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

    prompt = f"""
A user entered an occasion for KAALAM.

Occasion: {request.occasion}
Location: {request.location}
Tradition: {request.tradition}
Language: {request.language}

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
                        "astronomical or Panchangam data."
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
