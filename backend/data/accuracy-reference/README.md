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

**Srikakulam source resolution:** the 5 November 2026 Srikakulam row now cites
the official Drik Panchang Telugu month-Panchang page for GeoNames ID **1255647**
(Chicacole, the historical/alternate name for Srikakulam). The selected city
coordinates match the existing Srikakulam test coordinates (approximately
18.2949 N, 83.8939 E). The manually transcribed screenshot shows sunrise 05:56,
sunset 17:20, Ekadashi, Utthara, Aindra, and Balava. The CSV records the canonical
nakshatra name Uttara Phalguni and Drik's yoga spelling Aindra. The validator
normalizes Aindra/Indra as a narrow yoga spelling alias. The sunrise value was
updated from 05:55 to 05:56 to match the visible Drik result.

## Latest independent comparison result

GitHub Actions run
[42168285807](https://github.com/AmarnathreddyV/kaalam-mobile/actions/runs/42168285807)
completed on 6 November 2026 against the live Render API and reported:

- **96 reference rows; 96 passed; 0 failed**
- **12 rows per state** across all eight launch states
- **10 unique places and 3 distinct dates per state**
- **0 structural errors**
- `certification_ready: true` from the validator

The report is retained as the
[kaalam-independent-accuracy-report artifact](https://github.com/AmarnathreddyV/kaalam-mobile/actions/runs/42168285807/artifacts/13480660076).

This is a successful automated comparison against the currently curated
reference dataset. It is **not an external/third-party certification** and
does not prove universal accuracy for every location or date. The reference
values were manually transcribed; the validator does not yet fetch and parse
all reference pages automatically. The single NityaPanchangam source exception
also remains open.


## Automated source-page evidence check

A separate GitHub Actions workflow now fetches the URLs in both reference URL
columns and checks whether the expected sunrise/sunset and Panchang limb tokens
appear in the pages' visible text. It uploads a JSON report and fails closed for
inaccessible pages or missing tokens. This is a first-stage evidence-presence
check only: it does not prove that a token is semantically attached to the
correct label, nor does it replace human review or a structured source parser.
See `.github/workflows/verify-drik-source-pages.yml` and
`backend/scripts/verify_drik_source_pages.py`. Do not describe this as full
source verification unless the report passes and its limitations have been
reviewed.

## Acceptance gates

The strict validator requires all eight launch states, at least **10 distinct
places per state**, and at least **3 distinct dates per state**. It compares
sunrise and sunset within 2 minutes and requires exact case-insensitive matches
for tithi, nakshatra, yoga, and karana, plus the expected KAALAM engine metadata.
For yoga only, established spelling variants Vishkambha/Vishkumbha and
Indra/Aindra are normalized as equivalent names; these are narrow spelling
aliases, not fuzzy comparisons. All other yoga names and all other Panchang
limbs remain exact case-insensitive comparisons.

The 96-row suite passed this gate in run 42168285807. Keep the gate strict:
never relax tolerances or manufacture reference rows to make CI green.

## Separate operational coverage evidence

The live operational coverage workflow tests **80 locations per day**
(10 per state) for 5, 6, and 7 November 2026, with a separate job and report
for each date. Jobs are configured to run sequentially to reduce pressure on
the live API, and the HTTP client retries temporary gateway and network
failures. An initial run without retries encountered transient HTTP 502 errors.
After adding bounded retries, the three-date live test completed **240/240
location-date checks with zero failures** (80 locations on each date). The
workflow checks state attribution, coordinate round-tripping, timezone,
Telugu Drik response metadata, completeness, and basic solar-time plausibility.
This is useful operational evidence, but it is not independent astronomical
accuracy certification.

## Source verification boundary

The validator checks that both source URLs are HTTPS and use an allowlisted
host, then compares KAALAM's live output with the expected values stored in
the CSV. It does **not** currently download and parse every source page to prove
that each CSV value is present in the page. The reference values and URLs were
manually transcribed from the cited pages. Treat the URL allowlist as provenance
metadata, not as automated proof that every source page was re-read during CI.
A later hardening step should archive source snapshots or add a robust
source-page parser before making a stronger source-verification claim.

## Next certification work

1. Add source-page capture/parsing (or a reviewed immutable evidence archive)
   so expected values are independently auditable rather than only manually
   transcribed.
2. Expand the date matrix beyond this three-day sample and add more locations,
   especially smaller towns and rural coordinates.
3. Independently review the calculation convention and tolerances; passing a
   publisher comparison alone is not a substitute for a qualified Panchang
   methodology review.

## Run

`python backend/scripts/validate_reference_accuracy.py`

The GitHub Actions workflow uploads a JSON report even when the comparison
fails, so missing coverage and calculation mismatches remain visible.

## Important limits

- This is a release gate, not a universal-accuracy guarantee for every village.
- The 80-place smoke test and the independent Panchang comparison answer
  different questions; neither substitutes for the other.
- KAALAM must continue using Telugu Drik Panchangam only; do not introduce
  Telugu Vakya Panchangam.
