# KAALAM independent Panchangam accuracy gate

## What the gate means

This workflow compares the live daily Panchangam API with independently published
Telugu Drik Panchang references. It is a release acceptance test, not a proof of
perfect output at every coordinate or date.

A passing certification requires:
- At least 10 unique place names in each of the eight launch states.
- At least 3 distinct calendar dates represented in each state.
- No duplicate state/place/date/coordinate records.
- India timezone fixed at UTC+05:30.
- Coordinates within broad state envelopes to catch obvious state attribution errors.
- HTTPS references hosted by the approved independent source domains.
- Every live row complete, with sunrise and sunset within 2 minutes and Tithi,
  Nakshatra, Yoga and Karana matching exactly (case-insensitive).
- The live response must declare the expected apparent-sunrise sampling method
  and one upstream Panchang provider call per uncached location/day.

## Adding a reference row

1. Open the cited city/date page on Drik Panchang (Telugu Drik convention).
2. Verify sunrise, sunset and all four Panchang limbs for the exact date and city.
3. Verify the city coordinates independently; never use a regional centroid.
4. Add the row to `accuracy_reference.csv` with the exact reference URL.
5. Prefer broad date coverage: include different lunar dates, limb transitions,
   and seasons. Do not fill the sample by repeating a single date.
6. Run the validator and inspect `independent-accuracy-report.json`.

The current sample is diagnostic and does not meet the full place/date threshold
for all states. The CI gate is intentionally expected to fail until real,
independently checked references complete the sample. Never weaken the gate or
invent values just to obtain a green badge.

## Limits

- A two-minute solar tolerance is an operational acceptance threshold, not a
  guarantee of sub-minute astronomical accuracy.
- Exact limb-name equality validates the sampled sunrise instant only. It does
  not independently validate every limb transition time or every Muhurtham.
- City references do not certify every village. KAALAM must continue using the
  user's resolved coordinates for daily calculations.
- Muhurtham, Durmuhurtham, Subha Gadiyalu and event-specific recommendations
  require their own independently sourced validation suites.
