import os
from datetime import date as date_type
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

NAVAMSHA_URL = "https://api.navamsha.in/api/v1/panchang/full"
OPENAI_URL = "https://api.openai.com/v1/responses"

NAVAMSHA_API_KEY = os.getenv("NAVAMSHA_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.5").strip()

app = FastAPI(title="KAALAM API", version="0.3.0")

origins_value = os.getenv("CORS_ORIGINS", "*")
origins = (
    ["*"]
    if origins_value == "*"
    else [x.strip() for x in origins_value.split(",") if x.strip()]
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
    return {"status": "ok", "service": "kaalam-api"}


@app.get("/api/panchang")
async def get_panchang(
    day: date_type = Query(
        default_factory=date_type.today,
        description="Local calendar date, YYYY-MM-DD",
    ),
    latitude: float = Query(17.3850, ge=-90, le=90),
    longitude: float = Query(78.4867, ge=-180, le=180),
    timezone: float = Query(5.5, ge=-12, le=14),
    hours: int = Query(12, ge=0, le=23),
    minutes: int = Query(0, ge=0, le=59),
) -> dict[str, Any]:

    if not NAVAMSHA_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Navamsha API key is not configured.",
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
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                NAVAMSHA_URL,
                headers={
                    "X-API-Key": NAVAMSHA_API_KEY,
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        response.raise_for_status()
        data = response.json()

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Navamsha returned HTTP {exc.response.status_code}. Check your API key and plan.",
        ) from exc

    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve Panchangam data from Navamsha.",
        ) from exc

    if not isinstance(data, dict) or "output" not in data:
        raise HTTPException(
            status_code=502,
            detail="Navamsha returned an unexpected response.",
        )

    return {
        "provider": "Navamsha",
        "date": day.isoformat(),
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone,
        },
        "data": data["output"],
    }


class OccasionAnalysisRequest(BaseModel):
    occasion: str = Field(min_length=3, max_length=160)
    location: str = Field(default="Not provided", max_length=120)
    tradition: str = Field(
        default="Telugu Drik Panchangam",
        max_length=80,
    )
    language: str = Field(default="English", max_length=30)


@app.post("/api/occasion/analyze")
async def analyze_custom_occasion(
    request: OccasionAnalysisRequest,
) -> dict[str, Any]:

    if not OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OpenAI is not configured. Add OPENAI_API_KEY to Render.",
        )

    prompt = f"""
A user entered an occasion that is not in KAALAM's preset list.

Occasion: {request.occasion}
Location: {request.location}
Tradition: {request.tradition}
Response language: {request.language}

Analyze the occasion and identify relevant traditional Hindu
Muhurtham considerations.

Return a concise, practical response in {request.language}.

Use these four headings:

1. Occasion understood
2. Relevant traditional considerations
3. Details needed (if any)
4. What KAALAM should check before suggesting a date

Important rules:

- Do not invent auspicious dates or timings.
- Do not invent Tithi, Nakshatra, Yoga, Karana or planetary positions.
- Do not claim a date is auspicious without verified location-specific
  Panchangam data and applicable event-specific rules.
- Consider the selected regional tradition.
- Mention when customs differ between families or regions.
- Treat astrology as traditional and cultural guidance, not a guarantee.
- If the occasion is unclear, ask one focused clarification.
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
                        "You are KAALAM, a careful assistant specializing "
                        "in Hindu Panchangam and Muhurtham traditions. "
                        "Never fabricate astronomical or Panchangam data."
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
                        answer_parts.append(content.get("text", ""))

        answer = "\n".join(answer_parts).strip()

        if not answer:
            raise ValueError("OpenAI returned an empty response.")

    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                f"OpenAI returned HTTP {exc.response.status_code}. "
                "Check OPENAI_API_KEY, model access and API billing."
            ),
        ) from exc

    except (httpx.RequestError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not analyze this occasion with OpenAI.",
        ) from exc

    return {
        "provider": "OpenAI",
        "model": OPENAI_MODEL,
        "occasion": request.occasion,
        "analysis": answer,
        "next_step": (
            "KAALAM must evaluate candidate dates using verified "
            "location-specific Panchangam data and event-specific rules."
        ),
    }
