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


## Custom occasion AI analysis

The app's "Other" occasion option sends the user's text to `POST /api/occasion/analyze`.
Set these Render backend environment variables:

- `OPENAI_API_KEY` — OpenAI API key
- `OPENAI_MODEL` — optional; defaults to `gpt-5.5`

The endpoint classifies the occasion and explains which traditional factors should be checked. It does not generate auspicious dates or timings. Actual date recommendations must be computed from verified Panchangam data and event-specific rules.
