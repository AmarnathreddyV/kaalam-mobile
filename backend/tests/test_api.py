import asyncio
import unittest
from datetime import date

from pydantic import ValidationError

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


if __name__ == "__main__":
    unittest.main()
