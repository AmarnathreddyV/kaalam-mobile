import unittest
from datetime import date, datetime

from app.solar import apparent_sunrise_sunset, daily_timing_windows


class ApparentSunriseReferenceTests(unittest.TestCase):
    # Independent Drik Panchang city-page values for 5 November 2026.
    # Coordinates are KAALAM's resolved city coordinates.
    CASES = [
        # Independent Drik Panchang city references for 5 November 2026.
        # Coordinates are KAALAM's resolved city coordinates.
        ("Hyderabad", 17.360589, 78.4740613, "06:16", "17:43"),
        ("Warangal", 17.9820644, 79.5970954, "06:12", "17:38"),
        ("Karimnagar", 18.4348122, 79.1328042, "06:15", "17:39"),
        ("Nizamabad", 18.6731912, 78.0978195, "06:19", "17:43"),
        ("Khammam", 17.2465351, 80.1500326, "06:09", "17:36"),
        ("Mahabubnagar", 16.6965686, 77.9591146, "06:17", "17:46"),
        ("Nalgonda", 17.0504406, 79.2669235, "06:13", "17:40"),
        ("Adilabad", 19.6759452, 78.5339895, "06:19", "17:40"),
        ("Siddipet", 18.0055851, 78.8961130, "06:15", "17:41"),
        ("Mancherial", 18.9812967, 79.5198096, "06:14", "17:37"),
        ("Visakhapatnam", 17.6935526, 83.2921297, "05:58", "17:24"),
        ("Vijayawada", 16.5115306, 80.6160469, "06:06", "17:35"),
        ("Guntur", 16.2915189, 80.4541588, "06:07", "17:36"),
        ("Tirupati", 13.6316368, 79.4231711, "06:08", "17:44"),
        ("Kurnool", 15.8309251, 78.0425373, "06:16", "17:47"),
        ("Nellore", 14.4493717, 79.9873763, "06:07", "17:40"),
        ("Rajamahendravaram", 17.0050454, 81.7804732, "06:02", "17:30"),
        ("Kakinada", 16.9437385, 82.2350607, "06:01", "17:28"),
        ("Anantapur", 14.6783221, 77.6065039, "06:16", "17:50"),
        ("Srikakulam", 18.2949307, 83.8938844, "05:55", "17:20"),
        ("Bengaluru", 12.9767936, 77.5900820, "06:14", "17:52"),
        ("Mysuru", 12.3041460, 76.6529520, "06:17", "17:56"),
        ("Mangaluru", 12.8698250, 74.8430130, "06:25", "18:03"),
        ("Hubballi", 15.3518380, 75.1379850, "06:27", "17:59"),
        ("Belagavi", 16.1587850, 74.8888620, "06:30", "18:01"),
        ("Kalaburagi", 17.2408960, 76.7697440, "06:23", "17:50"),
        ("Shivamogga", 13.9326090, 75.5749780, "06:24", "17:59"),
        ("Ballari", 15.3483170, 76.8054880, "06:20", "17:52"),
        ("Davanagere", 14.2558830, 75.8303420, "06:23", "17:57"),
        ("Udupi", 13.5269780, 74.8731880, "06:26", "18:03"),
        ("Chennai", 13.0800915, 80.2807978, "06:04", "17:41"),
        ("Coimbatore", 11.0018120, 76.9628420, "06:15", "17:57"),
        ("Madurai", 9.9261150, 78.1140980, "06:09", "17:53"),
        ("Tiruchirappalli", 10.8071140, 78.6880940, "06:07", "17:50"),
        ("Salem", 11.6469620, 78.2106960, "06:11", "17:51"),
        ("Tirunelveli", 8.5495010, 77.5805180, "06:09", "17:56"),
        ("Erode", 11.4905280, 77.3505270, "06:12", "17:53"),
        ("Vellore", 12.9021850, 79.0611040, "06:08", "17:46"),
        ("Tanjore", 10.6590370, 79.2014280, "06:06", "17:48"),
        ("Nagercoil", 8.1839900, 77.4315440, "06:10", "17:58"),
        ("Thiruvananthapuram", 8.4882267, 76.9475510, "06:12", "18:00"),
        ("Mumbai", 19.0549990, 72.8692035, "06:41", "18:03"),
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
