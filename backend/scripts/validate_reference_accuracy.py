"""Compare KAALAM against manually curated independent Telugu Drik references.

Populate backend/data/accuracy_reference.csv using the accompanying README,
then run:
  python backend/scripts/validate_reference_accuracy.py

A result is marked verified only when the location has at least ten reference
rows (one for each test location) and every checked field is within tolerance.
No reference values are fabricated or downloaded from the same provider.
"""
from __future__ import annotations

import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
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
    "timezone_offset_hours", "reference_source", "reference_url",
    "expected_sunrise_local", "expected_sunset_local",
    "expected_tithi", "expected_nakshatra", "expected_yoga", "expected_karana",
}


def get_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "KAALAM-independent-accuracy-check/1.0"})
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.loads(response.read().decode("utf-8"))


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


def validate_row(row: dict[str, str]) -> dict:
    errors: list[str] = []
    for field in REQUIRED_COLUMNS:
        if not (row.get(field) or "").strip():
            errors.append(f"missing_{field}")
    if errors:
        return {"state": row.get("state"), "place_name": row.get("place_name"), "passed": False, "errors": errors}

    state = row["state"].strip()
    if state not in REQUIRED_STATES:
        return {"state": state, "place_name": row["place_name"], "passed": False, "errors": ["unsupported_state"]}
    try:
        latitude = float(row["latitude"])
        longitude = float(row["longitude"])
        timezone = float(row["timezone_offset_hours"])
        datetime.strptime(row["date"], "%Y-%m-%d")
        for key in ("expected_sunrise_local", "expected_sunset_local"):
            datetime.strptime(row[key], "%H:%M")
    except ValueError as exc:
        return {"state": state, "place_name": row["place_name"], "passed": False, "errors": [f"invalid_reference_value:{exc}"]}

    query = urllib.parse.urlencode({
        "day": row["date"],
        "latitude": f"{latitude:.6f}",
        "longitude": f"{longitude:.6f}",
        "timezone": f"{timezone:.4f}",
    })
    try:
        response = get_json(f"{API_BASE}/api/panchang/daily?{query}")
    except Exception as exc:
        return {"state": state, "place_name": row["place_name"], "passed": False, "errors": [f"api_error:{exc}"]}

    data = response.get("data") or {}
    panchang = data.get("panchang") or {}
    sun = data.get("sun_times") or {}
    rise = ((sun.get("rise") or {}).get("local_datetime") or "")[11:16]
    setting = ((sun.get("set") or {}).get("local_datetime") or "")[11:16]
    actual = {
        "sunrise": rise,
        "sunset": setting,
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
    differences = {
        "sunrise_minutes": circular_minute_difference(actual["sunrise"], expected["sunrise"]) if actual["sunrise"] else None,
        "sunset_minutes": circular_minute_difference(actual["sunset"], expected["sunset"]) if actual["sunset"] else None,
    }
    if not response.get("data_complete"):
        errors.append("daily_response_incomplete")
    metadata = response.get("calculation_metadata") or {}
    if not str(metadata.get("sunrise_sunset", "")).startswith("KAALAM NOAA apparent-sunrise"):
        errors.append("apparent_sunrise_engine_not_active")
    if metadata.get("provider_calls_per_daily_location") != 1:
        errors.append("unexpected_provider_call_budget")
    # Older entries already stored under the versioned apparent-sunrise
    # namespace may predate the optional metadata field; their timings remain
    # valid. Reject only an explicitly different namespace.
    if metadata.get("cache_namespace") not in (None, "daily-apparent-v2"):
        errors.append("unexpected_daily_cache_namespace")
    if response.get("panchang_reference") != "apparent_local_sunrise_plus_one_second":
        errors.append("panchang_not_sampled_at_sunrise_boundary")
    for key in ("tithi", "nakshatra", "yoga", "karana"):
        if actual[key].casefold() != expected[key].casefold():
            errors.append(f"{key}_mismatch")
    if differences["sunrise_minutes"] is None or differences["sunrise_minutes"] > 2:
        errors.append("sunrise_difference_over_2_minutes")
    if differences["sunset_minutes"] is None or differences["sunset_minutes"] > 2:
        errors.append("sunset_difference_over_2_minutes")

    return {
        "state": state,
        "place_name": row["place_name"],
        "date": row["date"],
        "reference_source": row["reference_source"],
        "reference_url": row["reference_url"],
        "actual": actual,
        "expected": expected,
        "differences_minutes": differences,
        "passed": not errors,
        "errors": errors,
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

    counts = Counter((row.get("state") or "").strip() for row in rows)
    missing_states = sorted(REQUIRED_STATES - set(counts))
    under_sampled = {state: count for state, count in counts.items() if state in REQUIRED_STATES and count < 10}
    results = []
    for row in rows:
        results.append(validate_row(row))
        # Each uncached daily request currently makes one Navamsha provider call.
        # Keep a conservative pause between independent reference checks.
        time.sleep(2.1)
    passed = sum(1 for result in results if result["passed"])
    failed = len(results) - passed
    certification_ready = not missing_states and not under_sampled and failed == 0

    report = {
        "test_type": "independent_telugu_drik_reference_comparison",
        "api_base": API_BASE,
        "reference_rows": len(rows),
        "passed": passed,
        "failed": failed,
        "state_reference_counts": dict(counts),
        "missing_states": missing_states,
        "states_with_fewer_than_10_reference_rows": under_sampled,
        "tolerances": {"sunrise_minutes": 2, "sunset_minutes": 2, "panchang_limb_names": "exact case-insensitive match"},
        "certification_ready": certification_ready,
        "results": results,
        "important": "Only independently sourced, same-date, same-coordinate, Telugu Drik references may be used. Passing this suite is a validation gate, not a claim of universal accuracy for every village.",
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: report[key] for key in (
        "reference_rows", "passed", "failed", "state_reference_counts",
        "missing_states", "states_with_fewer_than_10_reference_rows", "certification_ready"
    )}, indent=2))
    # Production certification is a hard gate: all eight states need at least\n    # ten independent reference rows, and every row must pass. A workflow must\n    # never show green while the reference sample is incomplete.\n    return 0 if certification_ready else 1


if __name__ == "__main__":
    sys.exit(main())
