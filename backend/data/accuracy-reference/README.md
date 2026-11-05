# KAALAM independent Telugu Drik accuracy references

This file documents the independent-reference gate. The reference CSV is deliberately
not padded with values copied from KAALAM itself: every expected value must come
from an attributable external Panchang source.

## Current evidence inventory (5–7 November 2026)

The current CSV contains **96 reference rows** across **5, 6, and 7 November 2026**:

| State | Reference rows | Unique places | Distinct dates |
|---|---:|---:|---:|
| Telangana | 12 | 10 | 3 |
| Andhra Pradesh | 12 | 10 | 3 |
| Karnataka | 12 | 10 | 3 |
| Tamil Nadu | 12 | 10 | 3 |
| Kerala | 12 | 10 | 3 |
| Maharashtra | 12 | 10 | 3 |
| Gujarat | 12 | 10 | 3 |
| Rajasthan | 12 | 10 | 3 |
| **Total** | **96** | **80** | **3** |

The CSV separates `reference_url` (Panchang limbs) from
`sun_reference_url` (sunrise/sunset evidence). Both URLs must use an approved
independent source host. Existing rows point both fields to the same daily
Panchang page; newly added rows use separate Drik Panchang daily-Panchang and
sunrise pages. Daily Panchang URLs are date-pinned to their row date (5, 6, or 7 November
2026) so future reruns do not silently compare against a moving "today" page.
For the 6 and 7 November rows, the daily Drik page supplies the Panchang limbs
and the location-specific Drik sunrise calendar supplies sunrise/sunset. One Srikakulam row currently
cites NityaPanchangam rather than Drik Panchang; it remains an explicitly
identified non-Drik exception and must be replaced with a verified Drik
Panchang reference before Telugu Drik-only certification.

## Acceptance gates

The strict validator requires all eight launch states, at least **10 distinct
places per state**, and at least **3 distinct dates per state**. It also compares
sunrise and sunset within 2 minutes and requires exact case-insensitive matches
for tithi, nakshatra, yoga, and karana, plus the expected KAALAM engine metadata.

The CSV now meets the validator's structural coverage requirements: 10 unique
places and 3 distinct dates in each state. Structural coverage is not the same
as a passing live comparison; do not mark the app independently certified until
the current 96-row run passes and any reported mismatches are resolved.

## Separate operational coverage evidence

The live operational coverage workflow tests **80 locations per day**
(10 per state) for 5, 6, and 7 November 2026, with a separate job and report
for each date. Jobs are configured to run sequentially to reduce pressure on
the live API, and the HTTP client retries temporary gateway and network
failures. An initial run without retries encountered transient HTTP 502 errors. After
adding bounded retries, the three-date live test completed **240/240
location-date checks with zero failures** (80 locations on each date). A
serialized confirmation run is also queued. The workflow checks state
attribution, coordinate round-tripping, timezone, Telugu Drik response
metadata, completeness, and basic solar-time plausibility. This is useful
operational evidence, but it is not independent astronomical accuracy
certification.

The latest completed 80-place comparison tested all 10 cities in every state
for 5 November and reported **80 passed, 0 mismatches**. That run was not
certifiable because it covered only one date. The current 96-row, three-date
comparison is running; inspect its final report for mismatches before sign-off.
The earlier 59-row and 44-row reports are superseded.

## Run

`python backend/scripts/validate_reference_accuracy.py`

The GitHub Actions workflow uploads a JSON report even when the comparison
fails, so missing coverage and calculation mismatches remain visible.


## Source verification boundary

The validator checks that both source URLs are HTTPS and use an allowlisted
host, then compares KAALAM's live output with the expected values stored in the
CSV. It does **not** currently download and parse every source page to prove
that each CSV value is present in the page. The reference values and URLs were
manually transcribed from the cited Drik Panchang pages (with the one documented
NityaPanchangam exception). Treat the URL allowlist as provenance metadata, not
as automated proof that every source page was re-read during CI. A later
hardening step should archive source snapshots or add a robust source-page
parser before making a stronger source-verification claim.

## Important limits

- This is a release gate, not a universal-accuracy guarantee for every village.
- The 80-place smoke test and the independent Panchang comparison answer
  different questions; neither substitutes for the other.
- Do not relax tolerances or manufacture reference rows to make CI green.
- KAALAM must continue using Telugu Drik Panchangam only; do not introduce
  Telugu Vakya Panchangam.
