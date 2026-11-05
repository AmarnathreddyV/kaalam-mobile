# KAALAM independent Telugu Drik accuracy references

The CSV contains eight initial reference cases (one representative location in
each launch state) for 5 November 2026. Values are transcribed from the linked
Drik Panchang city pages. The coordinates are KAALAM's resolved city coordinates;
small differences from the reference site's city-centre coordinates can affect
sunrise by seconds.

This is a diagnostic baseline, not state-wide certification. The validator
requires at least ten independently sourced location/date rows per state before
it can set `certification_ready=true`.

## Run

`python backend/scripts/validate_reference_accuracy.py`

The GitHub Actions workflow runs the same comparison on CSV/script changes and
uploads a JSON report even when the comparison fails.

## Acceptance gates

- Sunrise difference <= 2 minutes.
- Sunset difference <= 2 minutes.
- Tithi, nakshatra, yoga and karana match exactly (case-insensitive).
- At least ten independent references per state.
- All eight states represented.
- Investigate mismatches rather than relaxing tolerances.

## Known convention risk

Navamsha's published changelog states that its sunrise/sunset use the centre of
the Sun's disc on the horizon without atmospheric refraction, which shifts
sunrise later and sunset earlier by roughly 3–5 minutes. Drik Panchang's
published city times use a different apparent-sunrise convention. The initial
reference comparison is specifically intended to quantify this difference.
Do not certify the output until KAALAM's sunrise convention and all dependent
daily timing windows match the intended Telugu Drik reference.

The 250 regional coverage groups must never replace actual user coordinates.
