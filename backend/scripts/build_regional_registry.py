"""Build candidate regional groups from official state geospatial services.

Usage:
  python backend/scripts/build_regional_registry.py

The script downloads mandal-headquarters points from Telangana's public TGRAC
ArcGIS service and Andhra Pradesh's APSAC WFS service, then applies deterministic
farthest-point sampling to create 60 + 65 candidate groups.

All generated rows remain review_status='candidate'. Human review is required
before any row can be marked verified. This registry is not used to replace
user coordinates in astronomical calculations.
"""
from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.coverage_registry import STATE_BOUNDS, STATE_TARGETS, haversine_km, validate_registry

TG_ARCGIS_QUERY = (
    "https://tgrac.telangana.gov.in/arcgis/rest/services/"
    "AdministrativeInfoSystem_Folder/Administrative_Information_System/MapServer/11/query"
)
AP_WFS_BASE = "https://apsac.ap.gov.in/geoserver/gatishakti1/wfs"
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "coverage_registry_candidates.json"


def fetch_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    request_url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    request = urllib.request.Request(request_url, headers={"User-Agent": "KAALAM-coverage-builder/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_text(url: str, params: dict[str, Any]) -> str:
    request_url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    request = urllib.request.Request(request_url, headers={"User-Agent": "KAALAM-coverage-builder/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8")


def first_value(attributes: dict[str, Any], names: tuple[str, ...]) -> Any:
    normalized = {re.sub(r"[^a-z0-9]", "", str(key).lower()): value for key, value in attributes.items()}
    for name in names:
        value = normalized.get(re.sub(r"[^a-z0-9]", "", name.lower()))
        if value not in (None, ""):
            return value
    return None


def parse_coordinate(value: Any) -> float | None:
    try:
        result = float(value)
        return result if result == result else None
    except (TypeError, ValueError):
        return None


def extract_points(feature: dict[str, Any], state: str, source_url: str) -> list[dict[str, Any]]:
    attributes = feature.get("properties") or feature.get("attributes") or {}
    place = first_value(attributes, ("Mandal_Headquarter", "Mandal_Headquarter_Name", "Mandal", "Mandal_Name", "name", "NAME"))
    district = first_value(attributes, ("District_Name", "District", "Dist_Name", "district_name"))
    lat = parse_coordinate(first_value(attributes, ("Latitude", "lat", "latitude")))
    lon = parse_coordinate(first_value(attributes, ("longitude", "Longitude", "lon", "lng")))
    geometry = feature.get("geometry") or {}
    points: list[tuple[float, float]] = []
    if lat is not None and lon is not None:
        points.append((lat, lon))
    elif "coordinates" in geometry:
        coords = geometry["coordinates"]
        if geometry.get("type") == "Point" and len(coords) >= 2:
            points.append((float(coords[1]), float(coords[0])))
        elif geometry.get("type") == "MultiPoint":
            points.extend((float(point[1]), float(point[0])) for point in coords if len(point) >= 2)
    elif "points" in geometry:
        points.extend((float(point[1]), float(point[0])) for point in geometry["points"] if len(point) >= 2)

    output = []
    for point_lat, point_lon in points:
        if not place:
            continue
        output.append({
            "state": state,
            "district": str(district or ""),
            "place_name": str(place),
            "latitude": round(point_lat, 6),
            "longitude": round(point_lon, 6),
            "source_url": source_url,
            "review_status": "candidate",
        })
    return output


def fetch_telangana() -> list[dict[str, Any]]:
    source_url = TG_ARCGIS_QUERY
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        data = fetch_json(TG_ARCGIS_QUERY, {
            "where": "1=1", "outFields": "*", "returnGeometry": "true",
            "outSR": "4326", "f": "json", "resultOffset": offset, "resultRecordCount": 1000,
        })
        if data.get("error"):
            raise RuntimeError(f"TGRAC service error: {data['error']}")
        features = data.get("features") or []
        for feature in features:
            rows.extend(extract_points(feature, "Telangana", source_url))
        if len(features) < 1000 or not data.get("exceededTransferLimit"):
            break
        offset += len(features)
    return deduplicate(rows)


def discover_ap_mandal_layer() -> str:
    xml_text = fetch_text(AP_WFS_BASE, {"service": "WFS", "request": "GetCapabilities", "version": "2.0.0"})
    root = ET.fromstring(xml_text)
    matches: list[str] = []
    for feature_type in root.findall(".//{*}FeatureType"):
        name = feature_type.findtext("{*}Name") or ""
        title = feature_type.findtext("{*}Title") or ""
        combined = f"{name} {title}".lower()
        if "mandal" in combined and ("headquarter" in combined or "head quarter" in combined):
            matches.append(name)
    if not matches:
        raise RuntimeError("APSAC WFS did not expose a discoverable AP mandal-headquarters layer.")
    # Prefer the most explicit administrative headquarters layer name.
    return sorted(matches, key=lambda name: (("mandal" not in name.lower()), len(name)))[0]


def fetch_andhra_pradesh() -> list[dict[str, Any]]:
    type_name = discover_ap_mandal_layer()
    source_url = AP_WFS_BASE
    data = fetch_json(AP_WFS_BASE, {
        "service": "WFS", "version": "2.0.0", "request": "GetFeature",
        "typeNames": type_name, "outputFormat": "application/json", "srsName": "EPSG:4326",
    })
    features = data.get("features") or []
    rows: list[dict[str, Any]] = []
    for feature in features:
        rows.extend(extract_points(feature, "Andhra Pradesh", source_url))
    if not rows:
        raise RuntimeError(f"APSAC layer {type_name!r} returned no parseable headquarters coordinates.")
    return deduplicate(rows)


def deduplicate(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    unique: dict[tuple[str, float, float], dict[str, Any]] = {}
    for row in rows:
        key = (row["state"], round(row["latitude"], 5), round(row["longitude"], 5))
        unique.setdefault(key, row)
    return sorted(unique.values(), key=lambda row: (row["district"], row["place_name"]))


def inside_state(row: dict[str, Any]) -> bool:
    south, north, west, east = STATE_BOUNDS[row["state"]]
    return south <= row["latitude"] <= north and west <= row["longitude"] <= east


def farthest_point_sample(rows: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    candidates = [row for row in rows if inside_state(row)]
    if len(candidates) < count:
        raise RuntimeError(f"Need {count} distinct in-state points; source supplied {len(candidates)}.")
    # Seed at the geographic centre, then iteratively maximize distance to the
    # nearest selected point. Stable sorting makes output reproducible.
    south, north, west, east = STATE_BOUNDS[candidates[0]["state"]]
    centre = ((south + north) / 2, (west + east) / 2)
    selected = [min(candidates, key=lambda row: haversine_km(centre[0], centre[1], row["latitude"], row["longitude"]))]
    remaining = [row for row in candidates if row is not selected[0]]
    while len(selected) < count:
        next_row = max(
            remaining,
            key=lambda row: min(haversine_km(row["latitude"], row["longitude"], chosen["latitude"], chosen["longitude"]) for chosen in selected),
        )
        selected.append(next_row)
        remaining.remove(next_row)
    return selected


def build() -> dict[str, Any]:
    source_rows = {
        "Telangana": fetch_telangana(),
        "Andhra Pradesh": fetch_andhra_pradesh(),
    }
    output: list[dict[str, Any]] = []
    source_counts: dict[str, int] = {}
    for state, target in STATE_TARGETS.items():
        rows = source_rows[state]
        source_counts[state] = len(rows)
        selected = farthest_point_sample(rows, target)
        prefix = "TS" if state == "Telangana" else "AP"
        for index, row in enumerate(selected, start=1):
            output.append({
                "group_id": f"{prefix}-{index:03d}",
                **row,
                "selection_method": "deterministic_farthest_point_sampling",
                "selected_at_utc": datetime.now(timezone.utc).isoformat(),
            })

    validation = validate_registry(output, require_targets=True)
    if not validation["valid"]:
        raise RuntimeError(f"Generated registry failed validation: {validation['errors'][:10]}")
    return {
        "schema_version": 1,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "status": "candidate_registry_not_production_approved",
        "total_target": sum(STATE_TARGETS.values()),
        "source_feature_counts": source_counts,
        "selection_method": "deterministic_farthest_point_sampling",
        "accuracy_policy": "Regional groups are for grouping only; use each user's actual resolved coordinates for all Panchangam and Muhurtham calculations.",
        "records": output,
        "validation": validation,
    }


if __name__ == "__main__":
    result = build()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT), "validation": result["validation"], "source_feature_counts": result["source_feature_counts"]}, indent=2))
