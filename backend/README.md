# KAALAM FastAPI backend

This backend securely proxies requests to Navamsha. Keep `NAVAMSHA_API_KEY` on the server only.

## Setup

```bash
cd backend
python -m venv .venv
```

Activate the environment, then:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and add your Navamsha key:

```env
NAVAMSHA_API_KEY=your_real_key
CORS_ORIGINS=*
```

Run:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Test:
- `http://localhost:8000/health`
- `http://localhost:8000/api/panchang?day=2026-10-30&latitude=17.385&longitude=78.4867&timezone=5.5`

## Mobile app connection

Create a project-root `.env` file (not committed to Git):

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:8000
```

For a physical phone on the same Wi-Fi, use your computer's LAN IP, not `localhost`. Restart Expo after changing environment variables.

For production, deploy this backend over HTTPS and set `EXPO_PUBLIC_API_BASE_URL` to its public base URL.

## Current integration scope

The backend calls only Navamsha's `panchang/full` route for the four sidereal Panchang limbs, evaluated one minute after the locally calculated apparent sunrise. KAALAM's `app/solar.py` calculates apparent sunrise/sunset using the NOAA sunrise equation with a 90.8333-degree zenith, then derives Rahu Kalam, Yamagandam, Gulika, day/night Choghadiya, Hora and Abhijit from the same local sunrise/sunset anchors. This avoids mixing Navamsha's geometric sunrise convention (which its changelog says is 3–5 minutes later) with Drik's apparent-sunrise timings. The daily endpoint therefore uses one Navamsha provider call per unique exact location/date cache miss, rather than six.

`POST /api/muhurtham/search` currently searches the source-attributed dataset in `data/muhurtham_sources_2026_2027.json`. These are published listings marked unverified, not independently calculated or personalized Muhurtham approvals. The app must retain the disclaimer and source attribution. Event-specific Telugu Drik calculations, and Durmuhurtham/Subha Gadiyalu validation, remain future work.


## Initial launch geography

KAALAM initially serves Telangana, Andhra Pradesh, Karnataka, Tamil Nadu, Kerala, Maharashtra, Gujarat and Rajasthan. Telangana (60 planned groups) and Andhra Pradesh (65) have the highest priority. The remaining planning allocation is Karnataka (30), Tamil Nadu (25), Maharashtra (30), Kerala (15), Gujarat (15) and Rajasthan (10), for 250 planned regional groups.

The 250 groups are a target allocation, not a certified coordinate registry. Daily Panchangam uses each user's resolved coordinates and cache keys preserve six decimal places, date and timezone; nearby users do not share location-sensitive timing results merely because they belong to one regional group. The location resolver returns the resolved state and whether it is in the initial launch coverage. `GET /api/coverage` returns the coverage plan.

KAALAM has no AI integrations. All calculations and recommendations must be deterministic and traceable to verified data.


## India timezone policy

All Indian locations use the single civil timezone `Asia/Kolkata` (UTC+05:30). The location resolver no longer depends on a separate timezone API, preventing external timezone lookup failures from affecting sunrise-based Panchangam calculations. The eight-state live validation suite and independent-reference acceptance tool are documented in `backend/scripts/`.


## Solar timing validation

`tests/test_solar.py` compares apparent sunrise/sunset against independent Drik Panchang references for one city in each of the eight launch states (5 November 2026), with a two-minute tolerance. It also checks Thursday Rahu Kalam, Yamaganda, Gulika, Choghadiya and Abhijit against the Visakhapatnam reference. `scripts/validate_reference_accuracy.py` performs live API comparisons; the current CSV is a first diagnostic sample, not ten-per-state certification.
