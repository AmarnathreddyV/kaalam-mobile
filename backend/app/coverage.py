"""Initial launch coverage and transparent regional-group planning for KAALAM.

The allocation is a planning target. It is not a coordinate registry and must
not be used to substitute a regional representative location for a user's
actual location in solar-timing calculations.
"""

from __future__ import annotations

from typing import Any


STATE_GROUP_ALLOCATION: dict[str, int] = {
    "Telangana": 60,
    "Andhra Pradesh": 65,
    "Karnataka": 30,
    "Tamil Nadu": 25,
    "Maharashtra": 30,
    "Kerala": 15,
    "Gujarat": 15,
    "Rajasthan": 10,
}

PRIMARY_STATES = {"Telangana", "Andhra Pradesh"}
TOTAL_REGIONAL_GROUP_TARGET = sum(STATE_GROUP_ALLOCATION.values())


def normalize_state(value: str | None) -> str:
    if not value:
        return ""
    normalized = " ".join(value.strip().casefold().replace("&", "and").split())
    aliases = {
        "telangana state": "Telangana",
        "andhra": "Andhra Pradesh",
        "andhra pradesh state": "Andhra Pradesh",
        "tamilnadu": "Tamil Nadu",
        "tamil nadu state": "Tamil Nadu",
        "kerala state": "Kerala",
        "karnataka state": "Karnataka",
        "maharashtra state": "Maharashtra",
        "gujarat state": "Gujarat",
        "rajasthan state": "Rajasthan",
    }
    if normalized in aliases:
        return aliases[normalized]
    for state in STATE_GROUP_ALLOCATION:
        if normalized == state.casefold():
            return state
    return value.strip()


def coverage_for_state(state: str | None) -> dict[str, Any]:
    canonical = normalize_state(state)
    supported = canonical in STATE_GROUP_ALLOCATION
    return {
        "state": canonical or None,
        "supported": supported,
        "priority": (
            "primary" if canonical in PRIMARY_STATES
            else "standard" if supported
            else "outside_initial_launch"
        ),
        "regional_group_target": STATE_GROUP_ALLOCATION.get(canonical, 0),
    }


def launch_coverage_summary() -> dict[str, Any]:
    states = [
        {
            "state": state,
            "priority": "primary" if state in PRIMARY_STATES else "standard",
            "regional_group_target": count,
        }
        for state, count in STATE_GROUP_ALLOCATION.items()
    ]
    return {
        "service": "KAALAM",
        "launch_status": "initial_eight_state_scope",
        "panchangam_tradition": "Telugu Drik",
        "ai_enabled": False,
        "target_regional_groups": TOTAL_REGIONAL_GROUP_TARGET,
        "group_registry_status": "planning_allocation_only",
        "location_accuracy_policy": (
            "Use actual resolved coordinates for location-sensitive calculations. "
            "Do not substitute a regional centroid until validated against Navamsha."
        ),
        "primary_states": sorted(PRIMARY_STATES),
        "states": states,
    }
