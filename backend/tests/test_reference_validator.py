import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate_reference_accuracy.py"
SPEC = importlib.util.spec_from_file_location("reference_validator", SCRIPT)
validator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validator)


def row(state="Telangana", place="Hyderabad", day="2026-11-05", lat="17.385", lon="78.4867"):
    return {
        "state": state, "place_name": place, "date": day,
        "latitude": lat, "longitude": lon, "timezone_offset_hours": "5.5",
        "reference_source": "Drik Panchang",
        "reference_url": "https://www.drikpanchang.com/panchang/day-panchang.html",
    }


def test_duplicate_reference_rows_are_rejected():
    errors, _ = validator.structural_errors([row(), row()])
    assert any("duplicate_reference" in str(item) for item in errors)


def test_wrong_state_coordinate_envelope_is_rejected():
    errors, _ = validator.structural_errors([row(state="Kerala", lat="17.385", lon="78.4867")])
    assert any("coordinates_outside_state_envelope" in str(item) for item in errors)


def test_non_https_or_unapproved_reference_is_rejected():
    bad = row()
    bad["reference_url"] = "http://example.com/panchang"
    errors, _ = validator.structural_errors([bad])
    assert any("reference_url_not_on_allowlist" in str(item) for item in errors)


def test_state_coverage_requires_unique_places_and_multiple_dates():
    rows = [row(place=f"Place{i}", day="2026-11-05") for i in range(12)]
    errors, coverage = validator.structural_errors(rows)
    assert coverage["Telangana"]["unique_places"] == 12
    assert coverage["Telangana"]["distinct_dates"] == 1
    assert any("insufficient_distinct_dates" in str(item) for item in errors)
    assert any("insufficient_unique_places" in str(item) for item in errors) is False


def test_india_timezone_must_be_ist():
    bad = row()
    bad["timezone_offset_hours"] = "0"
    errors, _ = validator.structural_errors([bad])
    assert any("india_timezone_must_be_utc_plus_5_5" in str(item) for item in errors)
