"""Live eight-state Panchangam coverage smoke test.

Tests 10 geographically distributed place queries per launch state against the
deployed KAALAM API. This validates geocoding/state attribution, exact-coordinate
round-tripping, response completeness, and basic solar-time plausibility.

It is an operational/consistency test, NOT an independent astronomical
accuracy certification. Independent Drik Panchang reference comparison is a
separate sign-off requirement.
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

API_BASE = os.getenv("KAALAM_API_BASE", "https://kaalam-mobile.onrender.com").rstrip("/")
TEST_DATE = os.getenv("KAALAM_TEST_DATE", "2026-11-05")

PLACES = {
    "Telangana": [
        "Hyderabad, Telangana, India", "Warangal, Telangana, India",
        "Karimnagar, Telangana, India", "Nizamabad, Telangana, India",
        "Khammam, Telangana, India", "Mahabubnagar, Telangana, India",
        "Nalgonda, Telangana, India", "Adilabad, Telangana, India",
        "Siddipet, Telangana, India", "Mancherial, Telangana, India",
    ],
    "Andhra Pradesh": [
        "Visakhapatnam, Andhra Pradesh, India", "Vijayawada, Andhra Pradesh, India",
        "Guntur, Andhra Pradesh, India", "Tirupati, Andhra Pradesh, India",
        "Kurnool, Andhra Pradesh, India", "Nellore, Andhra Pradesh, India",
        "Rajamahendravaram, Andhra Pradesh, India", "Kakinada, Andhra Pradesh, India",
        "Anantapur, Andhra Pradesh, India", "Srikakulam, Andhra Pradesh, India",
    ],
    "Karnataka": [
        "Bengaluru, Karnataka, India", "Mysuru, Karnataka, India",
        "Mangaluru, Karnataka, India", "Hubballi, Karnataka, India",
        "Belagavi, Karnataka, India", "Kalaburagi, Karnataka, India",
        "Shivamogga, Karnataka, India", "Ballari, Karnataka, India",
        "Davanagere, Karnataka, India", "Udupi, Karnataka, India",
    ],
    "Tamil Nadu": [
        "Chennai, Tamil Nadu, India", "Coimbatore, Tamil Nadu, India",
        "Madurai, Tamil Nadu, India", "Tiruchirappalli, Tamil Nadu, India",
        "Salem, Tamil Nadu, India", "Tirunelveli, Tamil Nadu, India",
        "Erode, Tamil Nadu, India", "Vellore, Tamil Nadu, India",
        "Thanjavur, Tamil Nadu, India", "Nagercoil, Tamil Nadu, India",
    ],
    "Kerala": [
        "Thiruvananthapuram, Kerala, India", "Kochi, Kerala, India",
        "Kozhikode, Kerala, India", "Thrissur, Kerala, India",
        "Kollam, Kerala, India", "Kannur, Kerala, India",
        "Alappuzha, Kerala, India", "Palakkad, Kerala, India",
        "Kottayam, Kerala, India", "Kasaragod, Kerala, India",
    ],
    "Maharashtra": [
        "Mumbai, Maharashtra, India", "Pune, Maharashtra, India",
        "Nagpur, Maharashtra, India", "Nashik, Maharashtra, India",
        "Chhatrapati Sambhajinagar, Maharashtra, India", "Kolhapur, Maharashtra, India",
        "Solapur, Maharashtra, India", "Amravati, Maharashtra, India",
        "Nanded, Maharashtra, India", "Ratnagiri, Maharashtra, India",
    ],
    "Gujarat": [
        "Ahmedabad, Gujarat, India", "Surat, Gujarat, India",
        "Vadodara, Gujarat, India", "Rajkot, Gujarat, India",
        "Bhavnagar, Gujarat, India", "Jamnagar, Gujarat, India",
        "Junagadh, Gujarat, India", "Gandhinagar, Gujarat, India",
        "Bhuj, Gujarat, India", "Valsad, Gujarat, India",
    ],
    "Rajasthan": [
        "Jaipur, Rajasthan, India", "Jodhpur, Rajasthan, India",
        "Udaipur, Rajasthan, India", "Kota, Rajasthan, India",
        "Ajmer, Rajasthan, India", "Bikaner, Rajasthan, India",
        "Jaisalmer, Rajasthan, India", "Alwar, Rajasthan, India",
        "Bharatpur, Rajasthan, India", "Sikar, Rajasthan, India",
    ],
}


def request_json(url: str, payload: dict | None = None) -> dict:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"User-Agent": "KAALAM-eight-state-validation/1.0"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


def offset_hours(iana_timezone: str, on_date: date) -> float:
    local = datetime(on_date.year, on_date.month, on_date.day, 12, 0, tzinfo=ZoneInfo(iana_timezone))
    offset = local.utcoffset()
    if offset is None:
        raise ValueError(f"No UTC offset for timezone {iana_timezone}")
    return offset.total_seconds() / 3600


def check_location(state: str, place: str) -> dict:
    resolved = request_json(f"{API_BASE}/api/location/resolve", {"place": place})
    actual_state = (resolved.get("state") or "").strip()
    if actual_state.casefold() != state.casefold():
        raise AssertionError(f"state mismatch: expected {state}, resolver returned {actual_state!r}")
    lat = float(resolved["latitude"])
    lon = float(resolved["longitude"])
    tz_name = str(resolved["timezone"])
    expected_offset = offset_hours(tz_name, date.fromisoformat(TEST_DATE))
    query = urllib.parse.urlencode({
        "day": TEST_DATE,
        "latitude": f"{lat:.6f}",
        "longitude": f"{lon:.6f}",
        "timezone": str(expected_offset),
    })
    daily = request_json(f"{API_BASE}/api/panchang/daily?{query}")
    returned = daily.get("location") or {}
    if abs(float(returned.get("latitude", 999)) - lat) > 0.00000051:
        raise AssertionError("latitude was rounded or changed by the daily endpoint")
    if abs(float(returned.get("longitude", 999)) - lon) > 0.00000051:
        raise AssertionError("longitude was rounded or changed by the daily endpoint")
    if abs(float(returned.get("timezone", 999)) - expected_offset) > 0.0001:
        raise AssertionError("UTC offset was changed by the daily endpoint")
    if daily.get("tradition") != "Telugu Drik":
        raise AssertionError(f"unexpected Panchangam tradition: {daily.get('tradition')!r}")
    if daily.get("data_complete") is not True:
        raise AssertionError(f"incomplete daily response: {daily.get('unavailable')}")
    data = daily.get("data") or {}
    panchang = data.get("panchang") or {}
    def limb_name(value):
        if isinstance(value, str):
            return value.strip()
        if isinstance(value, dict):
            for key in ("name", "value", "label", "display"):
                candidate = value.get(key)
                if isinstance(candidate, str) and candidate.strip():
                    return candidate.strip()
        return ""

    limbs = {}
    for limb in ("tithi", "nakshatra", "yoga", "karana"):
        limbs[limb] = limb_name(panchang.get(limb))
        if not limbs[limb]:
            raise AssertionError(f"missing core Panchangam limb: {limb}")
    rise = (((data.get("sun_times") or {}).get("rise") or {}).get("local_datetime"))
    setting = (((data.get("sun_times") or {}).get("set") or {}).get("local_datetime"))
    if not rise or not setting:
        raise AssertionError("sunrise or sunset is missing")
    rise_dt = datetime.fromisoformat(rise)
    set_dt = datetime.fromisoformat(setting)
    if not rise_dt < set_dt:
        raise AssertionError(f"sunset does not follow sunrise: {rise} / {setting}")
    if not (4 <= rise_dt.hour <= 8):
        raise AssertionError(f"sunrise outside broad plausibility window: {rise}")
    if not (16 <= set_dt.hour <= 20):
        raise AssertionError(f"sunset outside broad plausibility window: {setting}")
    return {
        "state": state,
        "place_query": place,
        "resolved_place": resolved.get("display_name"),
        "latitude": lat,
        "longitude": lon,
        "iana_timezone": tz_name,
        "utc_offset_hours": expected_offset,
        "sunrise_local": rise,
        "sunset_local": setting,
        "tithi": limbs["tithi"],
        "nakshatra": limbs["nakshatra"],
        "yoga": limbs["yoga"],
        "karana": limbs["karana"],
        "data_complete": True,
        "checks_passed": [
            "state_attribution", "coordinate_round_trip", "timezone_offset",
            "telugu_drik_source", "complete_provider_response", "core_panchang_limbs",
            "sunrise_sunset_order", "solar_time_plausibility",
        ],
    }


def main() -> int:
    results: list[dict] = []
    failures: list[dict] = []
    for state, places in PLACES.items():
        print(f"\n[{state}] {len(places)} locations", flush=True)
        for place in places:
            try:
                row = check_location(state, place)
                results.append(row)
                print(f"PASS {place}: sunrise {row['sunrise_local']}, sunset {row['sunset_local']}", flush=True)
            except Exception as exc:
                failures.append({"state": state, "place": place, "error": str(exc)})
                print(f"FAIL {place}: {exc}", flush=True)
            # Geocoder policy is one request/second; a small pause also spaces
            # provider traffic across this end-to-end test. Each daily call fans
            # out to six provider routes, so 2.1 seconds spaces bursts below
            # the documented 10-requests-per-3-seconds free-tier ceiling.
            time.sleep(2.1)

    by_state = {
        state: {
            "tested": sum(1 for item in results + failures if item["state"] == state),
            "passed": sum(1 for item in results if item["state"] == state),
            "failed": sum(1 for item in failures if item["state"] == state),
        }
        for state in PLACES
    }
    report = {
        "test_date": TEST_DATE,
        "api_base": API_BASE,
        "test_type": "live_operational_location_and_response_consistency",
        "independent_astronomical_reference_comparison": "not_performed",
        "target_locations": 80,
        "passed": len(results),
        "failed": len(failures),
        "by_state": by_state,
        "results": results,
        "failures": failures,
        "limitations": [
            "Passing this test does not prove astronomical accuracy against an independent Drik Panchang reference.",
            "Test points are selected towns/cities, not every village or every point in each state.",
            "Sunrise/sunset checks use broad plausibility windows, not a minute-level reference tolerance.",
        ],
    }
    out = Path("coverage-validation-report.json")
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("\nSUMMARY")
    print(json.dumps({"passed": len(results), "failed": len(failures), "by_state": by_state}, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
