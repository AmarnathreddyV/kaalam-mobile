# KAALAM Mobile

A minimal React Native + Expo SDK 58 starter for the KAALAM Hindu Panchangam and Muhurtham app.

## Included

- Home dashboard
- Panchangam screen connected to the Navamsha full Panchang API through a FastAPI backend
- Muhurtham occasion selection UI
- Horoscope screen placeholder
- Profile screen placeholder
- Ivory, deep maroon and muted gold visual system
- No n8n dependency

## Expo SDK

This project targets Expo SDK 58, React Native 0.88.1 and React 19.3.0. SDK 58 requires Node.js 22.13+ (or a supported newer Node line). After cloning or extracting, run `npm install`, then `npx expo install --fix` and `npx expo-doctor` to verify the installed dependency set.

## Stack

- Mobile: React Native + Expo + TypeScript
- Backend: Python + FastAPI
- Panchangam provider: Navamsha API
- Database/auth: Supabase (planned)
- AI: Gemini or OpenAI for language and interpretation (planned)
- Notifications: Firebase Cloud Messaging (planned)

## Run the backend

See [backend/README.md](backend/README.md).

1. `cd backend`
2. `python -m venv .venv`
3. Activate the environment.
4. `pip install -r requirements.txt`
5. Copy `.env.example` to `.env`.
6. Add your Navamsha API key as `NAVAMSHA_API_KEY`.
7. Run `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.

## Run the mobile app

From the project root:

```bash
npm install
```

Copy root `.env.example` to `.env` and set `EXPO_PUBLIC_API_BASE_URL` to the backend address. For a physical phone, use your computer's LAN IP. Then:

```bash
npx expo start
```

If using a physical device, install an SDK 58-compatible Expo Go build when available, or use an Expo development build. SDK 58 recommends development builds for production workflows.

Scan the QR code with Expo Go. Restart Expo after changing `.env`.

## Navamsha API integration

The backend calls:

`POST https://api.navamsha.in/api/v1/panchang/full`

It sends the API key in the `X-API-Key` header and passes date, latitude, longitude and timezone. The API key is never embedded in the mobile app.

The mobile Panchangam screen currently displays live:
- Tithi
- Nakshatra
- Yoga
- Karana
- Weekday (Vara)

The initial mobile request uses Hyderabad coordinates and IST. User-selected location support is not implemented yet.

## Important limitations

This is an early integration, not a production-ready astrology product.

- Sunrise/sunset and inauspicious-period endpoints are not yet connected to the UI.
- Durmuhurtham and Subha Gadiyalu are not currently calculated by this integration.
- The Muhurtham screen is only a UI flow; it does not yet produce verified event dates.
- Horoscope and birth-chart calculations are not connected.
- Add user authentication, database storage, rate limiting, caching, request validation and monitoring before public release.
- Confirm Navamsha's current plan terms for commercial use directly with the provider before launch. The API's published free developer allowance and commercial licensing are separate questions.

Never display sample or missing values as verified Panchangam timings.

## GitHub

```bash
git init
git add .
git commit -m "Add KAALAM mobile app with Navamsha Panchangam integration"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/kaalam-mobile.git
git push -u origin main
```

Do not commit `.env` files or API keys.
