# KAALAM regional coverage registry

The initial 250-group allocation is 60 Telangana + 65 Andhra Pradesh + 30
Karnataka + 25 Tamil Nadu + 30 Maharashtra + 15 Kerala + 15 Gujarat + 10
Rajasthan. This folder will hold generated, versioned registry data.

## Telangana and Andhra Pradesh candidate build

Run from the repository root:

```bash
PYTHONPATH=backend python backend/scripts/build_regional_registry.py
```

The builder uses:
- Telangana TGRAC public administrative-information ArcGIS layer 11 (Mandal Head Quarter).
- Andhra Pradesh APSAC PM Gati Shakti WFS (AP Mandal Headquarter Locations).

The builder samples 60 Telangana and 65 Andhra Pradesh mandal-headquarters
points using deterministic farthest-point sampling. It checks WGS84 coordinate
ranges, coarse state bounds, duplicate coordinates, provenance, and exact
allocation counts. The generated rows remain `candidate`; they are not
production-approved automatically.

## Safety and accuracy

- Regional groups are a population/coverage organization mechanism only.
- Panchangam and Muhurtham must continue using the user's actual resolved
  latitude, longitude, and timezone.
- Do not replace user coordinates with a group-centre coordinate.
- Do not match a user to a group outside the configured catchment radius.
- A candidate needs human review against the source map and a known-location
  Navamsha comparison before its status can become `verified`.
- Do not call the 250-group registry complete until all eight states have
  source-backed rows and have passed validation.

Official source descriptions:
- Telangana TGRAC administrative layers:
  https://tgrac.telangana.gov.in/arcgis/rest/services/AdministrativeInfoSystem_Folder/Administrative_Information_System/MapServer/layers
- Andhra Pradesh APSAC geospatial services:
  https://apsac.ap.gov.in/?page_id=1075
