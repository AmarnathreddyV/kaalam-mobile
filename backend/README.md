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

The backend currently calls Navamsha's documented `POST /api/v1/panchang/full` endpoint. The mobile Panchangam screen displays tithi, nakshatra, yoga, karana and weekday from the live response.

Rahu Kaal, Yamaganda, Gulika, sunrise/sunset, Abhijit and other timing routes are not yet wired into the UI. Durmuhurtham and Subha Gadiyalu must be confirmed against the provider's endpoint coverage and the selected regional tradition before displaying them as calculated values.
