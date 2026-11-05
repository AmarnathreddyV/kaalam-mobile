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


## Initial launch geography and regional caching

KAALAM's initial launch coverage is limited to these eight states:

| State | Regional group planning target |
|---|---:|
| Telangana | 60 |
| Andhra Pradesh | 65 |
| Karnataka | 30 |
| Tamil Nadu | 25 |
| Maharashtra | 30 |
| Kerala | 15 |
| Gujarat | 15 |
| Rajasthan | 10 |
| **Total** | **250** |

Telangana and Andhra Pradesh are the highest-priority markets. The 250 regional groups are a planning target, not yet a validated list of 250 production coordinates. Daily Panchangam calculations use each user's resolved coordinates without regional rounding; cache keys preserve six decimal places plus date and timezone. The 250 groups are not calculation centres and do not cause nearby users to share location-sensitive timings.

The onboarding flow accepts birthplaces anywhere in India, but the current location must resolve to one of the eight initial launch states. The backend exposes `GET /api/coverage` and includes state coverage metadata in `POST /api/location/resolve`.

KAALAM is AI-free. No OpenAI, Gemini, Claude or other generative-AI service is required or used. Recommendations and calculations must use deterministic, documented rules and verified Panchangam data.

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

The first EAS build may ask you to link this repository to an Expo project. Complete that step in your Expo account. Keep `NAVAMSHA_API_KEY` and other server-only secrets only in Render environment variables; never add server secrets to the mobile app.
