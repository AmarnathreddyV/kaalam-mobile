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

The backend calls Navamsha's documented Panchangam routes. `GET /api/panchang/daily` aggregates `panchang/full`, `panchang/sun-times`, `panchang/inauspicious-periods`, `panchang/choghadiya`, `panchang/hora` and `panchang/abhijit-muhurat`. The Home screen displays the returned sunrise/sunset, Rahu Kalam, Yamagandam, Gulika, favourable Choghadiya windows and Abhijit Muhurat when available. Check the response `unavailable` map: provider route failures are reported rather than replaced with invented values.

`POST /api/muhurtham/search` currently searches the source-attributed dataset in `data/muhurtham_sources_2026_2027.json`. These are published listings marked unverified, not independently calculated or personalized Muhurtham approvals. The app must retain the disclaimer and source attribution. Event-specific Telugu Drik calculations, and Durmuhurtham/Subha Gadiyalu validation, remain future work.


## Initial launch geography

KAALAM initially serves Telangana, Andhra Pradesh, Karnataka, Tamil Nadu, Kerala, Maharashtra, Gujarat and Rajasthan. Telangana (60 planned groups) and Andhra Pradesh (65) have the highest priority. The remaining planning allocation is Karnataka (30), Tamil Nadu (25), Maharashtra (30), Kerala (15), Gujarat (15) and Rajasthan (10), for 250 planned regional groups.

The 250 groups are a target allocation, not a certified coordinate registry. Daily Panchangam uses each user's resolved coordinates and cache keys preserve six decimal places, date and timezone; nearby users do not share location-sensitive timing results merely because they belong to one regional group. The location resolver returns the resolved state and whether it is in the initial launch coverage. `GET /api/coverage` returns the coverage plan.

KAALAM has no AI integrations. All calculations and recommendations must be deterministic and traceable to verified data.
