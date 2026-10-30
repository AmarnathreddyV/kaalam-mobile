import os
from datetime import date as date_type
from typing import Any

from pydantic import BaseModel, Field

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

NAVAMSHA_URL = "https://api.navamsha.in/api/v1/panchang/full"
API_KEY = os.getenv("NAVAMSHA_API_KEY", "").strip()

app = FastAPI(title="KAALAM API", version="0.2.0")

origins_value = os.getenv("CORS_ORIGINS", "*")
origins = ["*"] if origins_value == "*" else [x.strip() for x in origins_value.split(",") if x.strip()]

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
    day: date_type = Query(default_factory=date_type.today, description="Local calendar date, YYYY-MM-DD"),
    latitude: float = Query(17.3850, ge=-90, le=90),
    longitude: float = Query(78.4867, ge=-180, le=180),
    timezone: float = Query(5.5, ge=-12, le=14, description="UTC offset in hours; Hyderabad is 5.5"),
    hours: int = Query(12, ge=0, le=23),
    minutes: int = Query(0, ge=0, le=59),
) -> dict[str, Any]:
    """
    Server-side proxy to Navamsha. The Navamsha key is never sent to the mobile app.
    Coordinates/timezone default to Hyderabad for the initial app preview.
    """
    if not API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Navamsha API key is not configured. Add NAVAMSHA_API_KEY to backend/.env.",
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
                    "X-API-Key": API_KEY,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        response.raise_for_status()
        data = response.json()
    except httpx.HTTPStatusError as exc:
        # Avoid returning provider secrets or internal request headers.
        raise HTTPException(
            status_code=502,
            detail=f"Navamsha returned HTTP {exc.response.status_code}. Check the API key, plan and request.",
        ) from exc
    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Could not retrieve Panchangam data from Navamsha.") from exc

    if not isinstance(data, dict) or "output" not in data:
        raise HTTPException(status_code=502, detail="Navamsha returned an unexpected response.")

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
    tradition: str = Field(default="Telugu Drik Panchangam", max_length=80)
    language: str = Field(default="English", max_length=30)


@app.post("/api/occasion/analyze")
async def analyze_custom_occasion(request: OccasionAnalysisRequest) -> dict[str, Any]:
    """
    Uses Gemini to understand a user-entered occasion and outline the traditional
    Muhurtham factors to evaluate. It deliberately does NOT invent dates or timings.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()

    if not gemini_key:
        raise HTTPException(
            status_code=503,
            detail="AI is not configured yet. Add GEMINI_API_KEY to the KAALAM backend environment variables.",
        )

    prompt = f"""
You are KAALAM, a careful assistant for Hindu Panchangam and Muhurtham traditions.
A user entered an occasion that was not in the preset list.

Occasion: {request.occasion}
Location: {request.location}
Tradition: {request.tradition}
Response language: {request.language}

Analyze what the occasion means and identify the relevant traditional Muhurtham considerations.
Return a concise response in {request.language} using exactly these headings:
1. Occasion understood
2. Relevant traditional considerations
3. Details needed (if any)
4. What KAALAM should check before suggesting a date

Rules:
- Do not invent auspicious dates, Panchangam values, planetary positions, or time windows.
- Do not claim that a date is auspicious without verified location-specific Panchangam data and event-specific rules.
- If customs differ by region or family tradition, say so.
- Treat astrology as traditional/cultural guidance, not a guarantee.
- If the occasion is unclear, ask one focused clarification.
- Keep the answer concise and practical.
"""

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                headers={
                    "x-goog-api-key": gemini_key,
                    "Content-Type": "application/json",
                },
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 700},
                },
            )
        response.raise_for_status()
        result = response.json()
        answer = "\n".join(
            part.get("text", "")
            for candidate in result.get("candidates", [])
            for part in candidate.get("content", {}).get("parts", [])
            if part.get("text")
        ).strip()
        if not answer:
            raise ValueError("Gemini returned an empty response.")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"AI provider returned HTTP {exc.response.status_code}. Check GEMINI_API_KEY and GEMINI_MODEL.",
        ) from exc
    except (httpx.RequestError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=502, detail="Could not analyze this occasion with the AI service.") from exc

    return {
        "occasion": request.occasion,
        "analysis": answer,
        "next_step": "After this analysis, KAALAM must evaluate candidate dates using verified Panchangam data and event-specific rules.",
    }
