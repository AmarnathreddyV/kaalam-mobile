# KAALAM Mobile

KAALAM is a minimal React Native + Expo app with email registration, user onboarding and a Navamsha Panchangam data connection.

## Branding

The KAALAM logo is included at `assets/kaalam-logo.png` and configured as the app icon, splash image and Android adaptive icon. It is also shown on the email authentication screen. After changing app icons/splash assets, create a new native app build to see the changes on an installed app.

## User flow

1. Register with email, name and password.
2. Verify email if confirmation is enabled in Supabase.
3. Sign in.
4. Complete birth details, birthplace, current location, language and Panchangam tradition.
5. Enter the app.

There is no sample user profile or hardcoded Panchangam value presented as live data.

## Configure Supabase

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

Set these Expo app environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Optional:
- `EXPO_PUBLIC_API_BASE_URL` (defaults to `https://kaalam-mobile.onrender.com`)

Run `supabase/schema.sql` in Supabase SQL Editor. Never use the Supabase service-role key in the mobile app.

## Run

```bash
npm install
npx expo install --fix
npx expo start -c
```

## Backend

FastAPI backend and Navamsha proxy are in `backend/`. See `backend/README.md`. Keep `NAVAMSHA_API_KEY` in Render environment variables.

## Current limitations

The app now requires a real Supabase account and completed profile before showing the main tabs. Panchangam live integration currently fetches tithi, nakshatra, yoga, karana and weekday. Daily timing calculations, full horoscope, and event-specific Muhurtham search are still to be implemented and validated; the app must not invent those values.

No n8n dependency is used.


## Custom occasion analysis with AI

When a user chooses **Other**, they can type an occasion in their own words. The app sends it to the FastAPI endpoint `/api/occasion/analyze`, which uses Gemini on the server to explain the occasion and identify traditional factors to check.

Add `GEMINI_API_KEY` to the Render backend's Environment settings. Optionally set `GEMINI_MODEL` (default: `gemini-3.8-flash`). Redeploy the backend after adding the variables and pushing the code.

The AI analysis is not itself a Muhurtham calculation. KAALAM must still evaluate candidate dates against verified local Panchangam data and the applicable event-specific rules before recommending dates.


## KAALAM moving mandala background

The app now uses the supplied devotional mandala video as a muted, looping full-screen background. The video is compressed to a mobile-friendly 720p asset at `assets/kaalam-mandala-background.mp4`. The palette is coordinated with the saffron/amber video using warm ivory panels, deep brown typography, antique-gold accents, and Georgia serif display headings.

Install the Expo-compatible video package for the project's SDK version:

```bash
npx expo install expo-video
```

Then restart Expo with a clean cache:

```bash
npx expo start -c
```

The background video is bundled locally; it does not need an internet connection at runtime.
