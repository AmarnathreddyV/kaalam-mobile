import unittest
from datetime import date, datetime

from app.solar import apparent_sunrise_sunset, daily_timing_windows


class ApparentSunriseReferenceTests(unittest.TestCase):
    # Independent Drik Panchang city-page values for 5 November 2026.
    # Coordinates are KAALAM's resolved city coordinates.
    CASES = [
        ("Hyderabad", 17.360589, 78.4740613, "06:16", "17:43"),
        ("Visakhapatnam", 17.6935526, 83.2921297, "05:58", "17:24"),
        ("Bengaluru", 12.9767936, 77.590082, "06:14", "17:52"),
        ("Chennai", 13.0800915, 80.2807978, "06:04", "17:41"),
        ("Thiruvananthapuram", 8.4882267, 76.947551, "06:12", "18:00"),
        ("Mumbai", 19.054999, 72.8692035, "06:41", "18:03"),
        ("Ahmedabad", 23.0215374, 72.5800568, "06:47", "17:59"),
        ("Jaipur", 26.9154576, 75.8189817, "06:39", "17:41"),
    ]

    @staticmethod
    def minute(value):
        return value.hour * 60 + value.minute

    def test_eight_state_city_sunrise_sunset_match_drik_within_two_minutes(self):
        day = date(2026, 11, 5)
        for city, latitude, longitude, expected_rise, expected_set in self.CASES:
            with self.subTest(city=city):
                rise, setting = apparent_sunrise_sunset(day, latitude, longitude, 5.5)
                rise_expected = int(expected_rise[:2]) * 60 + int(expected_rise[3:])
                set_expected = int(expected_set[:2]) * 60 + int(expected_set[3:])
                self.assertLessEqual(abs(self.minute(rise) - rise_expected), 2)
                self.assertLessEqual(abs(self.minute(setting) - set_expected), 2)

    def assert_time_within_two_minutes(self, actual, expected):
        actual_minutes = int(actual[:2]) * 60 + int(actual[3:5])
        expected_minutes = int(expected[:2]) * 60 + int(expected[3:5])
        self.assertLessEqual(abs(actual_minutes - expected_minutes), 2)

    def test_thursday_day_periods_match_drik_visakhapatnam(self):
        result = daily_timing_windows(date(2026, 11, 5), 17.6935526, 83.2921297, 5.5)
        periods = result["inauspicious_periods"]
        self.assert_time_within_two_minutes(periods["yamaganda"]["start"][11:16], "05:58")
        self.assert_time_within_two_minutes(periods["gulika_kaal"]["start"][11:16], "08:49")
        self.assert_time_within_two_minutes(periods["rahu_kaal"]["start"][11:16], "13:06")
        self.assertEqual(result["choghadiya"]["day"][0]["name"], "Shubh")
        self.assertEqual(result["choghadiya"]["day"][1]["name"], "Rog")
        self.assertEqual(result["choghadiya"]["night"][0]["name"], "Amrit")
        abhijit_start = result["abhijit_muhurat"]["interval"]["period"][0]["start"][11:16]
        self.assert_time_within_two_minutes(abhijit_start, "11:18")


if __name__ == "__main__":
    unittest.main()
