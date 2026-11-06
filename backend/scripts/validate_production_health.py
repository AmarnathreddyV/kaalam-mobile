"""Fast production smoke check for the deployed KAALAM API."""
from __future__ import annotations
import json
import os
import sys
import urllib.request

BASE = os.getenv("KAALAM_API_BASE", "https://kaalam-mobile.onrender.com").rstrip("/")


def get_json(path: str) -> dict:
    request = urllib.request.Request(
        f"{BASE}{path}",
        headers={"User-Agent": "KAALAM-production-health-check/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"{path} returned HTTP {response.status}")
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"{path} did not return a JSON object")
    return payload


def main() -> int:
    errors = []
    health = {}
    usage = {}
    try:
        health = get_json("/health")
        if health.get("status") != "ok":
            errors.append(f"health_status_unexpected:{health.get('status')!r}")
        if health.get("service") != "kaalam-api":
            errors.append(f"health_service_unexpected:{health.get('service')!r}")
    except Exception as exc:
        errors.append(f"health_endpoint_error:{type(exc).__name__}:{exc}")

    try:
        usage = get_json("/api/usage")
        if usage.get("service") != "kaalam-api":
            errors.append(f"usage_service_unexpected:{usage.get('service')!r}")
    except Exception as exc:
        errors.append(f"usage_endpoint_error:{type(exc).__name__}:{exc}")

    health_usage = health.get("panchang_usage") or {}
    usage_data = usage.get("panchang") or {}
    shared_cache = health_usage.get("shared_cache_configured")
    if shared_cache is not True:
        errors.append("shared_supabase_cache_not_configured")
    report = {
        "api_base": BASE,
        "health_ok": health.get("status") == "ok",
        "usage_ok": usage.get("service") == "kaalam-api",
        "shared_cache_configured": shared_cache,
        "shared_cache_hits": health_usage.get("shared_cache_hits"),
        "shared_cache_errors": health_usage.get("shared_cache_errors"),
        "cache_ttl_seconds": health_usage.get("cache_ttl_seconds"),
        "usage_snapshot_consistent": (
            health_usage.get("shared_cache_configured")
            == usage_data.get("shared_cache_configured")
        ) if health and usage else False,
        "errors": errors,
        "limitations": [
            "This is an endpoint/configuration smoke check, not a load test or uptime SLA.",
            "A healthy process response does not prove every Panchang result is accurate.",
        ],
    }
    print(json.dumps(report, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
