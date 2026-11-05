"""Validation helpers for KAALAM's candidate regional location registry.

Regional points are for coverage grouping and cache planning only. They must
never replace a user's resolved coordinates in Panchangam/Muhurtham requests.
"""
from __future__ import annotations

from math import asin, cos, radians, sin, sqrt
from typing import Any

STATE_BOUNDS = {
    "Telangana": (15.5, 19.9, 77.0, 81.5),
    "Andhra Pradesh": (12.0, 19.2, 76.7, 84.9),
}
STATE_TARGETS = {"Telangana": 60, "Andhra Pradesh": 65}


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two WGS84 coordinates."""
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return 6371.0088 * 2 * asin(sqrt(a))


def validate_candidate(record: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    state = record.get("state")
    if state not in STATE_BOUNDS:
        return ["unsupported_state"]
    try:
        lat = float(record["latitude"])
        lon = float(record["longitude"])
    except (KeyError, TypeError, ValueError):
        return ["invalid_coordinates"]
    south, north, west, east = STATE_BOUNDS[state]
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        errors.append("coordinates_out_of_range")
    if not (south <= lat <= north and west <= lon <= east):
        errors.append("coordinates_outside_state_bounds")
    if not record.get("place_name"):
        errors.append("missing_place_name")
    if not record.get("source_url"):
        errors.append("missing_source_url")
    if record.get("review_status") not in {"candidate", "verified", "rejected"}:
        errors.append("invalid_review_status")
    return errors


def validate_registry(records: list[dict[str, Any]], require_targets: bool = True) -> dict[str, Any]:
    errors: list[dict[str, Any]] = []
    counts = {state: 0 for state in STATE_TARGETS}
    ids: set[str] = set()
    seen_coords: set[tuple[str, float, float]] = set()

    for index, record in enumerate(records):
        for error in validate_candidate(record):
            errors.append({"index": index, "group_id": record.get("group_id"), "error": error})
        state = record.get("state")
        if state in counts:
            counts[state] += 1
        group_id = str(record.get("group_id") or "")
        if not group_id or group_id in ids:
            errors.append({"index": index, "group_id": group_id, "error": "missing_or_duplicate_group_id"})
        ids.add(group_id)
        try:
            coordinate_key = (str(state), round(float(record["latitude"]), 5), round(float(record["longitude"]), 5))
            if coordinate_key in seen_coords:
                errors.append({"index": index, "group_id": group_id, "error": "duplicate_coordinates"})
            seen_coords.add(coordinate_key)
        except (KeyError, TypeError, ValueError):
            pass

    if require_targets:
        for state, target in STATE_TARGETS.items():
            if counts[state] != target:
                errors.append({"state": state, "expected": target, "actual": counts[state], "error": "state_target_mismatch"})

    return {
        "valid": not errors,
        "total": len(records),
        "counts_by_state": counts,
        "verified_count": sum(1 for item in records if item.get("review_status") == "verified"),
        "candidate_count": sum(1 for item in records if item.get("review_status") == "candidate"),
        "errors": errors,
    }


def nearest_group(latitude: float, longitude: float, records: list[dict[str, Any]], max_radius_km: float = 20.0) -> dict[str, Any] | None:
    """Return a candidate group only inside the explicit catchment radius."""
    best: tuple[float, dict[str, Any]] | None = None
    for record in records:
        try:
            distance = haversine_km(latitude, longitude, float(record["latitude"]), float(record["longitude"]))
        except (KeyError, TypeError, ValueError):
            continue
        if best is None or distance < best[0]:
            best = (distance, record)
    if best is None or best[0] > max_radius_km:
        return None
    return {"group_id": best[1]["group_id"], "distance_km": round(best[0], 2), "review_status": best[1]["review_status"]}
