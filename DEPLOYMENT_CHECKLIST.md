# KAALAM deployment checklist

This checklist separates repository work from account/device actions. KAALAM supports **Telugu Drik Panchangam only**. Do not add Vakya Panchangam or n8n.

## Repository changes already committed

- Muhurtham screen is linked from the main app navigation.
- Muhurtham timezone-offset parsing is corrected.
- Muhurtham date labels use the selected app locale.
- Expo-compatible Android date-picker dependency is declared.
- EAS development, preview APK and production build profiles are configured in `eas.json`.
- Initial eight-state launch coverage and 250-group planning allocation are documented.
- OpenAI occasion-analysis endpoint and AI environment configuration have been removed; KAALAM is AI-free.
- README documents the build commands and current limitations.
- `.gitignore` excludes environment files, signing credentials and generated build artifacts; safe environment templates are included.
- GitHub Actions runs TypeScript, Expo Doctor, backend compilation and backend unit tests on pushes and pull requests.

## 1. Local verification (developer machine)

From the repository root:

```bash
git pull origin main
npm install
npx expo install --fix
npm run typecheck
npx expo-doctor
PYTHONPATH=backend python -m unittest discover -s backend/tests -v
npx expo start --clear
```

Resolve every typecheck, dependency and Expo Doctor error before creating a release build.

## 2. Supabase (project owner)

- Confirm Email/Anonymous provider configuration matches the app's guest-session flow.
- Enable **Anonymous Sign-Ins** under Authentication providers.
- Run `supabase/schema.sql` in SQL Editor.
- Confirm Row Level Security is enabled on `public.profiles` and policies restrict rows to `auth.uid() = id`.
- Add the Expo app's public values to EAS environment variables:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_API_BASE_URL=https://kaalam-mobile.onrender.com`
- Use only the anon/publishable key in the mobile app. Never expose the service-role key.

Note: anonymous profiles are tied to the device's anonymous auth session. Add an account-linking/recovery flow before promising cross-device or reinstall recovery.

## 3. Render backend (project owner)

Confirm the web service uses:
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`

Set server-only environment variables:
- `NAVAMSHA_API_KEY`
- Optional `CORS_ORIGINS`

Never put either server API key in Expo/EAS client variables. After saving settings, redeploy and verify `/health`, `/docs`, `/api/coverage`, `/api/panchang/daily`, `/api/location/resolve`, `/api/kundali/basic` and `/api/muhurtham/search`.

## 4. Device acceptance tests

- Fresh install creates an anonymous session and opens onboarding.
- Onboarding accepts a real birth date/time and resolves both locations.
- Supabase profile row is saved and remains after app restart.
- Current location resolves inside one of the eight launch states; birth place remains available anywhere in India.
- Device-location permission and manual city selection both work.
- Validate the proposed 250 regional groups against precise-coordinate Navamsha results. Keep the groups separate from calculation coordinates.
- Daily Telugu Drik Tithi, Nakshatra, Yoga and Karana load just after apparent local sunrise; locally calculated sunrise/sunset and dependent Rahu Kalam, Yamagandam, Gulika, Choghadiya, Hora and Abhijit windows match independent city references.
- Compare timing outputs with trusted Telugu Drik references for the same date and coordinates. Check partial-provider failures are visibly reported.
- Muhurtham tab opens; published listings remain labelled unverified and show their source/disclaimer. Do not call them calculated or certified recommendations.
- Each bundled devotional audio file plays, pauses and resumes offline.
- Test all supported app languages and all six navigation tabs.
- Check app restart, slow network, denied location permission, invalid location, expired provider quota and empty Muhurtham results.

## 5. Android release

After local checks and device acceptance pass:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Install and test the generated APK on a physical Android device. Then create the Play Store bundle:

```bash
npx eas-cli@latest build -p android --profile production
```

The first EAS build may ask you to link the repository to an Expo project. Complete that in your Expo account. The Google Play Console listing, privacy policy, Data Safety form, content rating, screenshots, app access declarations and final release submission must be completed by the account owner.

## Known product work not required to create a test APK

- Build and validate the actual 250 regional reference-coordinate registry. The current state allocation is a planning target only; calculations must continue using each user's exact resolved coordinates.

- Event-specific Telugu Drik Muhurtham calculation and independent validation. Current date results are source-attributed published listings, not certified recommendations.
- Profile editing and birth-chart recalculation workflow.
- Account linking/recovery for anonymous users.
- Verify provider coverage for Durmuhurtham and Subha Gadiyalu before displaying them.
- Decide separately whether a full Jathakam/horoscope feature should return; it is currently not exposed in the app.

- Before store submission, add a square KAALAM app-icon asset and configure `expo.icon` plus Android adaptive foreground image. The current wide logo remains the splash-screen image; it is not stretched into an icon.


## Latest automated validation results (5 November 2026)

- 80/80 operational place checks passed (10 each across all eight launch states): [GitHub run](https://github.com/AmarnathreddyV/kaalam-mobile/actions/runs/42030907790).
- 44/44 independent reference rows passed; however, independent references are not yet evenly distributed across all states. Telangana, Andhra Pradesh, Karnataka and Tamil Nadu have 10 each; Kerala, Maharashtra, Gujarat and Rajasthan have one each. **Do not mark eight-state astronomical accuracy certified yet.** [GitHub run](https://github.com/AmarnathreddyV/kaalam-mobile/actions/runs/42030895942).
- Latest Expo/TypeScript/backend CI passed: [GitHub run](https://github.com/AmarnathreddyV/kaalam-mobile/actions/runs/42030907880).
- Live OTP delivery remains unverified until the Supabase Send SMS Auth Hook is configured with the MSG91 template and signed-hook secret, then tested using a real +91 number.
