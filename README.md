# KAALAM Mobile

KAALAM is a React Native + Expo app with India-first phone OTP authentication (Supabase Auth + MSG91), user onboarding and a Navamsha Panchangam data connection.

## Branding

The KAALAM logo is included at `assets/kaalam-logo.png` and configured as the app icon, splash image and Android adaptive icon. It is also shown on the phone authentication screen. After changing app icons/splash assets, create a new native app build to see the changes on an installed app.

## User flow

1. Register or sign in with an Indian mobile number (+91).
2. Verify the six-digit OTP delivered by MSG91 through the Supabase Auth Send SMS Hook.
3. Complete birth details, birthplace, current location, language and Telugu Drik Panchangam preferences.
4. The Supabase session persists securely between app launches; reopening the app does not send another OTP.

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

The app requires a verified Supabase phone session and a completed profile before showing the main tabs. Daily Panchangam and timing data are retrieved from Navamsha, including sunrise/sunset, Rahu Kalam, Yamagandam, Gulika, Choghadiya, Hora and Abhijit Muhurat where provider routes return data. Validate every timing against trusted Telugu Drik references before production. Muhurtham currently searches source-attributed published listings; it does not independently calculate or certify personalized auspicious dates. A full horoscope is not currently exposed.

No n8n dependency is used.


## Custom occasion analysis with AI

When a user chooses **Other**, they can type an occasion in their own words. The app sends it to the FastAPI endpoint `/api/occasion/analyze`, which uses OpenAI on the server to explain the occasion and identify traditional factors to check.

Add `OPENAI_API_KEY` to the Render backend's Environment settings. Optionally set `OPENAI_MODEL` (default: `gpt-5.5`). Redeploy the backend after adding the variables and pushing the code.

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


## Android build (EAS)

1. Install dependencies and verify the project:

```bash
npm install
npx expo install --fix
npm run typecheck
npx expo-doctor
```

2. Configure the Expo project and add these **public app** environment variables in the Expo project settings:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_API_BASE_URL=https://kaalam-mobile.onrender.com`

3. Sign in to EAS and create an internal Android APK for device testing:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

4. After all device and data-validation checks pass, create the Play Store Android App Bundle:

```bash
npx eas-cli@latest build -p android --profile production
```

The first EAS build may ask you to link this repository to an Expo project. Complete that step in your Expo account. Keep `NAVAMSHA_API_KEY` and `OPENAI_API_KEY` only in Render backend environment variables; never add server secrets to the mobile app.
