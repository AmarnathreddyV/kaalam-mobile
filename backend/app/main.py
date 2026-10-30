import os
from datetime import date as date_type
from typing import Any

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
    allow_methods=["GET"],
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
