# KAALAM independent Telugu Drik accuracy references

This file documents the independent-reference gate. The reference CSV is deliberately
not padded with values copied from KAALAM itself: every expected value must come
from an attributable external Panchang source.

## Current evidence inventory (5 November 2026)

The current CSV contains **80 reference rows**, all for **2026-11-05**:

| State | Reference rows | Unique places | Distinct dates |
|---|---:|---:|---:|
| Telangana | 10 | 10 | 1 |
| Andhra Pradesh | 10 | 10 | 1 |
| Karnataka | 10 | 10 | 1 |
| Tamil Nadu | 10 | 10 | 1 |
| Kerala | 10 | 10 | 1 |
| Maharashtra | 10 | 10 | 1 |
| Gujarat | 10 | 10 | 1 |
| Rajasthan | 10 | 10 | 1 |
| **Total** | **80** | **80** | **1** |

The CSV separates `reference_url` (Panchang limbs) from
`sun_reference_url` (sunrise/sunset evidence). Both URLs must use an approved
independent source host. Existing rows point both fields to the same daily
Panchang page; newly added rows use separate Drik Panchang daily-Panchang and
sunrise pages. URLs are date-pinned to 5 November 2026 so future reruns do not
silently compare against a moving "today" page. One Srikakulam row currently
cites NityaPanchangam rather than Drik Panchang; it remains an explicitly
identified non-Drik exception and must be replaced with a verified Drik
Panchang reference before Telugu Drik-only certification.

## Acceptance gates

The strict validator requires all eight launch states, at least **10 distinct
places per state**, and at least **3 distinct dates per state**. It also compares
sunrise and sunset within 2 minutes and requires exact case-insensitive matches
for tithi, nakshatra, yoga, and karana, plus the expected KAALAM engine metadata.

Current data does **not** meet the coverage gates: Kerala, Maharashtra, Gujarat,
and Rajasthan have fewer than 10 reference places, and every state has only one
reference date. Do not mark the app independently certified until these gaps
are filled with source-checked rows and the live comparison passes.

## Separate operational coverage evidence

The live operational coverage workflow now tests **80 locations per day**
(10 per state) for 5, 6, and 7 November 2026, with a separate job and report
for each date. It checks state attribution, coordinate round-tripping,
timezone, Telugu Drik response metadata, completeness, and basic solar-time
plausibility. This is useful operational evidence, but it is not independent
astronomical accuracy certification.

The latest completed comparison before the 80-place expansion tested 59 rows
and reported **59 passed, 0 mismatches**. The current CSV now has 10 distinct
places in every state, but still only one date per state. The strict validator
requires 3 distinct dates per state. A new live comparison is running against
the expanded 80-place CSV; inspect its final report for mismatches before
sign-off. The earlier 44-row report is superseded.

## Run

`python backend/scripts/validate_reference_accuracy.py`

The GitHub Actions workflow uploads a JSON report even when the comparison
fails, so missing coverage and calculation mismatches remain visible.

## Important limits

- This is a release gate, not a universal-accuracy guarantee for every village.
- The 80-place smoke test and the independent Panchang comparison answer
  different questions; neither substitutes for the other.
- Do not relax tolerances or manufacture reference rows to make CI green.
- KAALAM must continue using Telugu Drik Panchangam only; do not introduce
  Telugu Vakya Panchangam.
