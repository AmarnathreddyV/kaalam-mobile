"""Strict independent-reference acceptance gate for KAALAM daily Panchangam.

This is a release gate, not a universal-accuracy guarantee. It requires
independent, attributable references across distinct places and dates in every
launch state. Never manufacture reference rows to make CI green.
"""
from __future__ import annotations

import csv
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

API_BASE = os.getenv("KAALAM_API_BASE", "https://kaalam-mobile.onrender.com").rstrip("/")
CSV_PATH = Path(__file__).resolve().parents[1] / "data" / "accuracy_reference.csv"
REPORT_PATH = Path("independent-accuracy-report.json")
REQUIRED_STATES = {
    "Telangana", "Andhra Pradesh", "Karnataka", "Tamil Nadu",
    "Kerala", "Maharashtra", "Gujarat", "Rajasthan",
}
REQUIRED_COLUMNS = {
    "state", "place_name", "date", "latitude", "longitude",
    "timezone_offset_hours", "reference_source", "reference_url", "sun_reference_url",
    "expected_sunrise_local", "expected_sunset_local",
    "expected_tithi", "expected_nakshatra", "expected_yoga", "expected_karana",
}
MIN_UNIQUE_PLACES_PER_STATE = 10
MIN_DISTINCT_DATES_PER_STATE = 3
ALLOWED_REFERENCE_HOSTS = {"www.drikpanchang.com", "drikpanchang.com", "nityapanchangam.com"}
# Broad state envelopes catch obvious city/state mix-ups without pretending
# that a rectangular envelope is a precise administrative boundary.
STATE_BOUNDS = {
    "Telangana": (15.5, 19.9, 77.0, 81.5),
    "Andhra Pradesh": (12.5, 19.2, 76.7, 84.8),
    "Karnataka": (11.5, 18.5, 74.0, 78.7),
    "Tamil Nadu": (8.0, 13.6, 76.0, 80.5),
    "Kerala": (8.0, 12.9, 74.8, 77.5),
    "Maharashtra": (15.5, 22.1, 72.5, 80.9),
    "Gujarat": (20.0, 24.8, 68.0, 74.5),
    "Rajasthan": (23.0, 30.3, 69.0, 78.3),
}


def get_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "KAALAM-independent-accuracy-check/2.0"})
    retryable_statuses = {429, 500, 502, 503, 504}
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("API returned a non-object JSON response")
            return payload
        except urllib.error.HTTPError as exc:
            if exc.code not in retryable_statuses or attempt == 2:
                raise
            retry_after = exc.headers.get("Retry-After") if exc.headers else None
            try:
                delay = min(max(float(retry_after), 1.0), 8.0) if retry_after else 2 ** attempt
            except ValueError:
                delay = 2 ** attempt
            print(f"Transient HTTP {exc.code}; retrying {url} in {delay:.0f}s", flush=True)
            time.sleep(delay)
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            if attempt == 2:
                raise
            delay = 2 ** attempt
            print(f"Transient network error ({exc}); retrying {url} in {delay}s", flush=True)
            time.sleep(delay)
    raise RuntimeError(f"request retry loop exhausted for {url}")


def limb_name(value) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, dict):
        for key in ("name", "value", "label", "display"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()
    return ""


def minutes(value: str) -> int:
    parsed = datetime.strptime(value.strip()[:5], "%H:%M")
    return parsed.hour * 60 + parsed.minute


def circular_minute_difference(a: str, b: str) -> int:
    delta = abs(minutes(a) - minutes(b))
    return min(delta, 1440 - delta)


def structural_errors(rows: list[dict[str, str]]) -> tuple[list[dict], dict]:
    errors: list[dict] = []
    seen: dict[tuple, int] = {}
    places = defaultdict(set)
    dates = defaultdict(set)
    for index, row in enumerate(rows, start=2):
        state = (row.get("state") or "").strip()
        place = (row.get("place_name") or "").strip().casefold()
        day = (row.get("date") or "").strip()
        try:
            lat, lon = float(row.get("latitude", "")), float(row.get("longitude", ""))
            offset = float(row.get("timezone_offset_hours", ""))
        except (TypeError, ValueError):
            errors.append({"csv_line": index, "state": state, "place_name": row.get("place_name"), "errors": ["invalid_coordinates_or_timezone"]})
            continue
        row_errors = []
        if state not in REQUIRED_STATES:
            row_errors.append("unsupported_state")
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            row_errors.append("coordinates_out_of_range")
        elif state in STATE_BOUNDS:
            south, north, west, east = STATE_BOUNDS[state]
            if not (south <= lat <= north and west <= lon <= east):
                row_errors.append("coordinates_outside_state_envelope")
        if offset != 5.5:
            row_errors.append("india_timezone_must_be_utc_plus_5_5")
        try:
            datetime.strptime(day, "%Y-%m-%d")
        except ValueError:
            row_errors.append("invalid_date")
        for field in ("reference_url", "sun_reference_url"):
            parsed_url = urllib.parse.urlparse((row.get(field) or "").strip())
            if parsed_url.scheme != "https" or parsed_url.hostname not in ALLOWED_REFERENCE_HOSTS:
                row_errors.append(f"{field}_not_on_allowlist")
        if not (row.get("reference_source") or "").strip():
            row_errors.append("missing_reference_source")
        key = (state, place, day, round(lat, 6), round(lon, 6))
        if key in seen:
            row_errors.append(f"duplicate_reference_of_csv_line_{seen[key]}")
        else:
            seen[key] = index
        if state in REQUIRED_STATES and place and day:
            places[state].add(place)
            dates[state].add(day)
        if row_errors:
            errors.append({"csv_line": index, "state": state, "place_name": row.get("place_name"), "errors": row_errors})

    per_state = {}
    for state in sorted(REQUIRED_STATES):
        per_state[state] = {
            "unique_places": len(places[state]),
            "distinct_dates": len(dates[state]),
            "place_requirement": MIN_UNIQUE_PLACES_PER_STATE,
            "date_requirement": MIN_DISTINCT_DATES_PER_STATE,
        }
        if len(places[state]) < MIN_UNIQUE_PLACES_PER_STATE:
            errors.append({"state": state, "errors": [f"insufficient_unique_places:{len(places[state])}/{MIN_UNIQUE_PLACES_PER_STATE}"]})
        if len(dates[state]) < MIN_DISTINCT_DATES_PER_STATE:
            errors.append({"state": state, "errors": [f"insufficient_distinct_dates:{len(dates[state])}/{MIN_DISTINCT_DATES_PER_STATE}"]})
    return errors, per_state


def validate_row(row: dict[str, str]) -> dict:
    errors: list[str] = []
    for field in REQUIRED_COLUMNS:
        if not (row.get(field) or "").strip():
            errors.append(f"missing_{field}")
    if errors:
        return {"state": row.get("state"), "place_name": row.get("place_name"), "date": row.get("date"), "passed": False, "errors": errors}

    state = row["state"].strip()
    try:
        latitude = float(row["latitude"])
        longitude = float(row["longitude"])
        timezone = float(row["timezone_offset_hours"])
        datetime.strptime(row["date"], "%Y-%m-%d")
        for key in ("expected_sunrise_local", "expected_sunset_local"):
            datetime.strptime(row[key], "%H:%M")
    except ValueError as exc:
        return {"state": state, "place_name": row["place_name"], "date": row["date"], "passed": False, "errors": [f"invalid_reference_value:{exc}"]}

    query = urllib.parse.urlencode({
        "day": row["date"],
        "latitude": f"{latitude:.6f}",
        "longitude": f"{longitude:.6f}",
        "timezone": f"{timezone:.4f}",
    })
    try:
        response = get_json(f"{API_BASE}/api/panchang/daily?{query}")
    except Exception as exc:
        return {"state": state, "place_name": row["place_name"], "date": row["date"], "passed": False, "errors": [f"api_error:{type(exc).__name__}:{exc}"]}

    data = response.get("data") or {}
    panchang = data.get("panchang") or {}
    sun = data.get("sun_times") or {}
    rise_obj, set_obj = sun.get("rise") or {}, sun.get("set") or {}
    rise_dt, set_dt = rise_obj.get("local_datetime"), set_obj.get("local_datetime")
    rise = rise_dt[11:16] if isinstance(rise_dt, str) and len(rise_dt) >= 16 else ""
    setting = set_dt[11:16] if isinstance(set_dt, str) and len(set_dt) >= 16 else ""
    actual = {
        "sunrise": rise, "sunset": setting,
        "tithi": limb_name(panchang.get("tithi")),
        "nakshatra": limb_name(panchang.get("nakshatra")),
        "yoga": limb_name(panchang.get("yoga")),
        "karana": limb_name(panchang.get("karana")),
    }
    expected = {
        "sunrise": row["expected_sunrise_local"].strip(),
        "sunset": row["expected_sunset_local"].strip(),
        "tithi": row["expected_tithi"].strip(),
        "nakshatra": row["expected_nakshatra"].strip(),
        "yoga": row["expected_yoga"].strip(),
        "karana": row["expected_karana"].strip(),
    }
    differences = {"sunrise_minutes": None, "sunset_minutes": None}
    for key in ("sunrise", "sunset"):
        if actual[key]:
            try:
                differences[f"{key}_minutes"] = circular_minute_difference(actual[key], expected[key])
            except ValueError:
                errors.append(f"invalid_actual_{key}_time")
        else:
            errors.append(f"missing_actual_{key}")
    if not response.get("data_complete"):
        errors.append("daily_response_incomplete")
    if response.get("date") not in (None, row["date"]):
        errors.append("response_date_mismatch")
    metadata = response.get("calculation_metadata") or {}
    if not str(metadata.get("sunrise_sunset", "")).startswith("KAALAM NOAA apparent-sunrise"):
        errors.append("apparent_sunrise_engine_not_active")
    if metadata.get("provider_calls_per_daily_location") != 1:
        errors.append("unexpected_provider_call_budget")
    if metadata.get("cache_namespace") not in (None, "daily-apparent-v2"):
        errors.append("unexpected_daily_cache_namespace")
    if response.get("panchang_reference") != "apparent_local_sunrise_plus_one_second":
        errors.append("panchang_not_sampled_at_sunrise_boundary")
    for key in ("tithi", "nakshatra", "yoga", "karana"):
        if actual[key].casefold() != expected[key].casefold():
            errors.append(f"{key}_mismatch")
    for key in ("sunrise", "sunset"):
        delta = differences[f"{key}_minutes"]
        if delta is None or delta > 2:
            errors.append(f"{key}_difference_over_2_minutes")
    return {
        "state": state, "place_name": row["place_name"], "date": row["date"],
        "reference_source": row["reference_source"], "reference_url": row["reference_url"],
        "sun_reference_url": row["sun_reference_url"], "actual": actual, "expected": expected, "differences_minutes": differences,
        "passed": not errors, "errors": errors,
    }


def main() -> int:
    if not CSV_PATH.exists():
        print(f"Missing reference file: {CSV_PATH}", file=sys.stderr)
        return 2
    with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        missing_headers = sorted(REQUIRED_COLUMNS - set(reader.fieldnames or []))
        if missing_headers:
            print("Missing CSV columns: " + ", ".join(missing_headers), file=sys.stderr)
            return 2
        rows = list(reader)
    if not rows:
        print("Reference CSV is empty. Add independently sourced reference rows before certification.", file=sys.stderr)
        return 2

    structural, state_coverage = structural_errors(rows)
    counts = Counter((row.get("state") or "").strip() for row in rows)
    results = []
    # Structural defects are reported before live calls; still run valid rows
    # so the report remains diagnostic and useful to maintainers.
    for row in rows:
        results.append(validate_row(row))
        time.sleep(2.1)
    passed = sum(1 for result in results if result["passed"])
    failed = len(results) - passed
    certification_ready = not structural and failed == 0
    report = {
        "test_type": "independent_telugu_drik_reference_comparison",
        "api_base": API_BASE, "reference_rows": len(rows), "passed": passed, "failed": failed,
        "state_reference_counts": dict(counts), "state_coverage": state_coverage,
        "structural_errors": structural,
        "tolerances": {"sunrise_minutes": 2, "sunset_minutes": 2, "panchang_limb_names": "exact case-insensitive match"},
        "certification_ready": certification_ready, "results": results,
        "important": "Passing this suite is a validation gate, not a claim of universal accuracy for every village. References must be independently sourced and span distinct places and dates.",
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = {key: report[key] for key in (
        "reference_rows", "passed", "failed", "state_reference_counts",
        "state_coverage", "structural_errors", "certification_ready"
    )}
    if failed:
        summary["failed_results"] = [result for result in results if not result["passed"]]
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if certification_ready else 1


if __name__ == "__main__":
    sys.exit(main())
