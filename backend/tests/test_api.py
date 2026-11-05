import asyncio
import base64
import hashlib
import hmac
import time
import unittest
from datetime import date

from pydantic import ValidationError
from types import SimpleNamespace

import app.main as main_module
from app.main import verify_supabase_sms_hook

from app.main import MuhurthamSearchRequest, health, normalize_occasion


class OccasionNormalizationTests(unittest.TestCase):
    def test_wedding_alias_maps_to_vivaha(self):
        self.assertEqual(normalize_occasion("Traditional Wedding"), "vivaha")

    def test_housewarming_alias_maps_to_griha_pravesham(self):
        self.assertEqual(normalize_occasion("House Warming"), "griha_pravesham")

    def test_unknown_occasion_is_normalized_without_guessing(self):
        self.assertEqual(normalize_occasion("Naming Celebration"), "naming_celebration")


class MuhurthamRequestValidationTests(unittest.TestCase):
    def test_rejects_end_date_before_start_date(self):
        with self.assertRaises(ValidationError):
            MuhurthamSearchRequest(
                occasion="Wedding",
                start_date=date(2027, 2, 2),
                end_date=date(2027, 2, 1),
            )

    def test_rejects_search_longer_than_366_days(self):
        with self.assertRaises(ValidationError):
            MuhurthamSearchRequest(
                occasion="Wedding",
                start_date=date(2027, 1, 1),
                end_date=date(2028, 1, 3),
            )

    def test_defaults_to_telugu_drik(self):
        request = MuhurthamSearchRequest(
            occasion="Wedding",
            start_date=date(2027, 1, 1),
            end_date=date(2027, 1, 2),
        )
        self.assertEqual(request.tradition, "Telugu Drik")


class HealthEndpointTests(unittest.TestCase):
    def test_health_endpoint_reports_service_status(self):
        response = asyncio.run(health())
        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["service"], "kaalam-api")
        self.assertIn("panchang_usage", response)


class ExactLocationCacheKeyTests(unittest.TestCase):
    def test_navamsha_request_includes_seconds_for_sunrise_boundary(self):
        class FakeResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {"output": {"ok": True}}

        class FakeClient:
            def __init__(self):
                self.payload = None

            async def post(self, url, headers, json):
                self.payload = json
                return FakeResponse()

        async def call_provider():
            previous_key = main_module.NAVAMSHA_API_KEY
            main_module.NAVAMSHA_API_KEY = "test-key"
            client = FakeClient()
            try:
                await main_module.fetch_navamsha_route(
                    client, "panchang/full", date(2026, 11, 5),
                    12.869825, 74.843013, 5.5,
                    hours=6, minutes=25, seconds=53,
                )
            finally:
                main_module.NAVAMSHA_API_KEY = previous_key
            return client.payload

        payload = asyncio.run(call_provider())
        self.assertEqual(payload["hours"], 6)
        self.assertEqual(payload["minutes"], 25)
        self.assertEqual(payload["seconds"], 53)

    def test_apparent_sunrise_algorithm_uses_a_new_cache_namespace(self):
        legacy = main_module._panchang_cache_key(
            "daily", date(2026, 11, 5), 17.360589, 78.4740613, 5.5, precision=6
        )
        current = main_module._panchang_cache_key(
            "daily-apparent-v2", date(2026, 11, 5), 17.360589, 78.4740613, 5.5, precision=6
        )
        self.assertNotEqual(legacy, current)

    def test_nearby_coordinates_do_not_share_daily_cache_key(self):
        first = main_module._panchang_cache_key(
            "daily", date(2026, 11, 5), 17.385000, 78.486700, 5.5, precision=6
        )
        nearby = main_module._panchang_cache_key(
            "daily", date(2026, 11, 5), 17.389000, 78.489000, 5.5, precision=6
        )
        self.assertNotEqual(first, nearby)

    def test_same_exact_location_reuses_cache_key(self):
        first = main_module._panchang_cache_key(
            "daily", date(2026, 11, 5), 17.385000, 78.486700, 5.5, precision=6
        )
        second = main_module._panchang_cache_key(
            "daily", date(2026, 11, 5), 17.385000, 78.486700, 5.5, precision=6
        )
        self.assertEqual(first, second)

    def test_usage_snapshot_does_not_advertise_coordinate_grid(self):
        snapshot = main_module._panchang_usage_snapshot()
        self.assertIsNone(snapshot["coordinate_grid_degrees"])
        self.assertEqual(snapshot["calculation_location_policy"], "exact_resolved_user_coordinates")


class SupabaseSmsHookSignatureTests(unittest.TestCase):
    def _signed_request(self, body: bytes, secret: bytes, timestamp: int):
        webhook_id = "msg_test_123"
        signed = webhook_id.encode() + b"." + str(timestamp).encode() + b"." + body
        digest = base64.b64encode(hmac.new(secret, signed, hashlib.sha256).digest()).decode()
        headers = {
            "webhook-id": webhook_id,
            "webhook-timestamp": str(timestamp),
            "webhook-signature": f"v1,{digest}",
        }
        return SimpleNamespace(headers=headers)

    def test_accepts_valid_signature(self):
        secret = b"kaalam-test-secret"
        main_module.SUPABASE_AUTH_SMS_HOOK_SECRET = "whsec_" + base64.b64encode(secret).decode()
        body = b'{"user":{"phone":"+919876543210"},"sms":{"otp":"123456"}}'
        request = self._signed_request(body, secret, int(time.time()))
        self.assertTrue(verify_supabase_sms_hook(request, body))

    def test_rejects_tampered_body(self):
        secret = b"kaalam-test-secret"
        main_module.SUPABASE_AUTH_SMS_HOOK_SECRET = "whsec_" + base64.b64encode(secret).decode()
        body = b'{"sms":{"otp":"123456"}}'
        request = self._signed_request(body, secret, int(time.time()))
        self.assertFalse(verify_supabase_sms_hook(request, body + b" "))

    def test_rejects_expired_signature(self):
        secret = b"kaalam-test-secret"
        main_module.SUPABASE_AUTH_SMS_HOOK_SECRET = "whsec_" + base64.b64encode(secret).decode()
        body = b'{"sms":{"otp":"123456"}}'
        request = self._signed_request(body, secret, int(time.time()) - 600)
        self.assertFalse(verify_supabase_sms_hook(request, body))


if __name__ == "__main__":
    unittest.main()



class IndiaTimezonePolicyTests(unittest.TestCase):
    def test_indian_location_timezone_is_fixed_to_ist(self):
        # All eight launch states are within India's single civil time zone.
        self.assertEqual(main_module.INDIA_TIMEZONE, "Asia/Kolkata")
