"""Location-specific apparent sunrise/sunset and daily timing windows.

Uses the NOAA sunrise equation with a 90.833-degree zenith (solar semidiameter
plus standard atmospheric refraction), matching the apparent sunrise convention
used by the independent Drik city references. All outputs preserve local IST.
"""
from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Any

SOLAR_ZENITH_DEGREES = 90.8333
DAY_CHO_GHADIYA = {
    0: ("Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit"),
    1: ("Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog"),
    2: ("Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh"),
    3: ("Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh"),
    4: ("Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg", "Char"),
    5: ("Kaal", "Shubh", "Rog", "Udveg", "Char", "Labh", "Amrit", "Kaal"),
    6: ("Udveg", "Char", "Labh", "Amrit", "Kaal", "Shubh", "Rog", "Udveg"),
}
NIGHT_CHO_GHADIYA = {
    0: ("Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char"),
    1: ("Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal"),
    2: ("Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg"),
    3: ("Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit"),
    4: ("Rog", "Kaal", "Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog"),
    5: ("Labh", "Udveg", "Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh"),
    6: ("Shubh", "Amrit", "Char", "Rog", "Kaal", "Labh", "Udveg", "Shubh"),
}
RAHU_SLOT = {6: 7, 0: 1, 1: 6, 2: 4, 3: 5, 4: 3, 5: 2}
YAMAGANDA_SLOT = {6: 4, 0: 3, 1: 2, 2: 1, 3: 0, 4: 6, 5: 5}
GULIKA_SLOT = {6: 6, 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 0}
PLANETARY_ORDER = ("Saturn", "Jupiter", "Mars", "Sun", "Venus", "Mercury", "Moon")

# Drik Panchang Telugu weekday allocation for Dur Muhurtam.
# Segment numbers are 1-based among 15 equal day/night muhurtas.
DUR_MUHURTA_DAY_SLOTS = {
    6: (14,),       # Sunday
    0: (9, 12),     # Monday
    1: (4,),        # Tuesday (second period is the 7th night muhurta)
    2: (8,),        # Wednesday
    3: (6, 12),     # Thursday
    4: (4, 9),      # Friday
    5: (1, 2),      # Saturday
}
DUR_MUHURTA_TUESDAY_NIGHT_SLOT = 7
WEEKDAY_LORD = {
    0: "Moon", 1: "Mars", 2: "Mercury", 3: "Jupiter",
    4: "Venus", 5: "Saturn", 6: "Sun",
}


def _sun_event_local_hour(day: date, latitude: float, longitude: float,
                          timezone_offset: float, sunrise: bool) -> float:
    """Return apparent sunrise/sunset as local decimal hours for the date."""
    day_number = day.timetuple().tm_yday
    longitude_hour = longitude / 15.0
    approximate_time = day_number + (
        (6.0 - longitude_hour) / 24.0 if sunrise
        else (18.0 - longitude_hour) / 24.0
    )
    mean_anomaly = 0.9856 * approximate_time - 3.289
    true_longitude = (
        mean_anomaly
        + 1.916 * math.sin(math.radians(mean_anomaly))
        + 0.020 * math.sin(math.radians(2.0 * mean_anomaly))
        + 282.634
    ) % 360.0

    right_ascension = math.degrees(
        math.atan(0.91764 * math.tan(math.radians(true_longitude)))
    ) % 360.0
    longitude_quadrant = math.floor(true_longitude / 90.0) * 90.0
    right_ascension_quadrant = math.floor(right_ascension / 90.0) * 90.0
    right_ascension = (
        right_ascension + longitude_quadrant - right_ascension_quadrant
    ) / 15.0

    sin_declination = 0.39782 * math.sin(math.radians(true_longitude))
    cos_declination = math.cos(math.asin(sin_declination))
    latitude_radians = math.radians(latitude)
    cos_hour_angle = (
        math.cos(math.radians(SOLAR_ZENITH_DEGREES))
        - sin_declination * math.sin(latitude_radians)
    ) / (cos_declination * math.cos(latitude_radians))
    if not -1.0 <= cos_hour_angle <= 1.0:
        raise ValueError("Sunrise/sunset is not defined for this date and location.")

    hour_angle = (
        360.0 - math.degrees(math.acos(cos_hour_angle))
        if sunrise else math.degrees(math.acos(cos_hour_angle))
    ) / 15.0
    local_mean_time = hour_angle + right_ascension - 0.06571 * approximate_time - 6.622
    utc_hour = (local_mean_time - longitude_hour) % 24.0
    return (utc_hour + timezone_offset) % 24.0


def apparent_sunrise_sunset(day: date, latitude: float, longitude: float,
                            timezone_offset: float) -> tuple[datetime, datetime]:
    if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
        raise ValueError("Invalid latitude or longitude.")
    if not (-12.0 <= timezone_offset <= 14.0):
        raise ValueError("Invalid UTC offset.")
    tz = timezone(timedelta(hours=timezone_offset))
    midnight = datetime.combine(day, datetime.min.time(), tzinfo=tz)
    sunrise = midnight + timedelta(hours=_sun_event_local_hour(
        day, latitude, longitude, timezone_offset, True
    ))
    sunset = midnight + timedelta(hours=_sun_event_local_hour(
        day, latitude, longitude, timezone_offset, False
    ))
    if not sunrise < sunset:
        raise ValueError("Calculated sunset must follow sunrise.")
    return sunrise, sunset


def _period(name: str, start: datetime, end: datetime, **extra: Any) -> dict[str, Any]:
    return {
        "name": name,
        "start": start.isoformat(timespec="seconds"),
        "end": end.isoformat(timespec="seconds"),
        **extra,
    }


def _eight_slots(names: tuple[str, ...], start: datetime, end: datetime) -> list[dict[str, Any]]:
    slot_seconds = (end - start).total_seconds() / 8.0
    return [
        _period(name, start + timedelta(seconds=slot_seconds * index),
                start + timedelta(seconds=slot_seconds * (index + 1)))
        for index, name in enumerate(names)
    ]


def _fifteenth_slots(start: datetime, end: datetime, segments: tuple[int, ...], name: str = "Dur Muhurtam") -> list[dict[str, Any]]:
    """Return selected 1-based muhurta segments within a day or night."""
    slot_seconds = (end - start).total_seconds() / 15.0
    return [
        _period(
            name,
            start + timedelta(seconds=slot_seconds * (segment - 1)),
            start + timedelta(seconds=slot_seconds * segment),
            segment=segment,
        )
        for segment in segments
    ]


def daily_timing_windows(day: date, latitude: float, longitude: float,
                         timezone_offset: float) -> dict[str, Any]:
    """Create Drik-convention sunrise-based daily periods without extra API calls."""
    sunrise, sunset = apparent_sunrise_sunset(day, latitude, longitude, timezone_offset)
    next_sunrise, _ = apparent_sunrise_sunset(
        day + timedelta(days=1), latitude, longitude, timezone_offset
    )
    weekday = day.weekday()
    daylight = (sunset - sunrise).total_seconds()
    night = (next_sunrise - sunset).total_seconds()
    day_slot = daylight / 8.0

    def eighth(index: int) -> dict[str, str]:
        start = sunrise + timedelta(seconds=day_slot * index)
        end = sunrise + timedelta(seconds=day_slot * (index + 1))
        return {"start": start.isoformat(timespec="seconds"), "end": end.isoformat(timespec="seconds")}

    midday = sunrise + timedelta(seconds=daylight / 2.0)
    abhijit_half = daylight / 30.0
    abhijit_start = midday - timedelta(seconds=abhijit_half)
    abhijit_end = midday + timedelta(seconds=abhijit_half)

    day_hours = daylight / 12.0
    night_hours = night / 12.0
    start_planet_index = PLANETARY_ORDER.index(WEEKDAY_LORD[weekday])
    hora_day = []
    hora_night = []
    for index in range(12):
        planet = PLANETARY_ORDER[(start_planet_index + index) % 7]
        hora_day.append(_period(
            f"{planet} Hora",
            sunrise + timedelta(seconds=day_hours * index),
            sunrise + timedelta(seconds=day_hours * (index + 1)),
            lord=planet,
        ))
        next_planet = PLANETARY_ORDER[(start_planet_index + 12 + index) % 7]
        hora_night.append(_period(
            f"{next_planet} Hora",
            sunset + timedelta(seconds=night_hours * index),
            sunset + timedelta(seconds=night_hours * (index + 1)),
            lord=next_planet,
        ))

    rahu = eighth(RAHU_SLOT[weekday])
    yama = eighth(YAMAGANDA_SLOT[weekday])
    gulika = eighth(GULIKA_SLOT[weekday])
    dur_muhurtam = _fifteenth_slots(
        sunrise, sunset, DUR_MUHURTA_DAY_SLOTS[weekday]
    )
    if weekday == 1:  # Tuesday: the additional period is the 7th night muhurta.
        dur_muhurtam.extend(_fifteenth_slots(
            sunset, next_sunrise, (DUR_MUHURTA_TUESDAY_NIGHT_SLOT,)
        ))
    return {
        "sun_times": {
            "rise": {"local_datetime": sunrise.isoformat(timespec="seconds")},
            "set": {"local_datetime": sunset.isoformat(timespec="seconds")},
        },
        "dur_muhurtam": dur_muhurtam,
        "inauspicious_periods": {
            "rahu_kaal": {"start": rahu["start"], "end": rahu["end"]},
            "yamaganda": {"start": yama["start"], "end": yama["end"]},
            "gulika_kaal": {"start": gulika["start"], "end": gulika["end"]},
        },
        "choghadiya": {
            "day": _eight_slots(DAY_CHO_GHADIYA[weekday], sunrise, sunset),
            "night": _eight_slots(NIGHT_CHO_GHADIYA[weekday], sunset, next_sunrise),
        },
        "hora": {"day": hora_day, "night": hora_night},
        "abhijit_muhurat": {
            "interval": {
                "name": "Abhijit Muhurat",
                "period": [_period("Abhijit Muhurat", abhijit_start, abhijit_end)],
            }
        },
        "solar_calculation": {
            "method": "NOAA apparent sunrise/sunset, zenith 90.8333 degrees",
            "timezone_offset_hours": timezone_offset,
        },
    }
