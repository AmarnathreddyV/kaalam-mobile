# Supabase email registration setup

1. Create a Supabase project.
2. Open Project Settings > API.
3. Copy the Project URL and the public anon/publishable key.
4. Add these to the mobile app build environment (Expo environment variables):
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
5. In Authentication > Providers, ensure Email is enabled.
6. In Authentication > URL Configuration, configure the app's redirect URLs if you later enable deep-link email redirects.
7. In Authentication > Email, keep email confirmation enabled if you want users to verify their address.
8. Run `supabase/schema.sql` in the Supabase SQL Editor to create the private user profile table with row-level security.

The anon/publishable key is intended for client apps when Row Level Security is configured. Never put the Supabase service-role key in the mobile app.

## Local run

Create a root `.env` (do not commit it) with the two Supabase variables and optional backend URL. Then:

```bash
npm install
npx expo start -c
```

For EAS builds, add the same variables in the Expo project's environment variables and rebuild the app. Changing app environment variables requires a new app bundle/build; a previously installed build will not automatically receive them.

## User flow

- User registers with email, name and password.
- Supabase sends a confirmation email when email confirmation is enabled.
- Confirmed user signs in.
- First-time user completes birth and location details.
- Profile is saved to `public.profiles`; row-level security limits access to the signed-in user's own row.
- The app opens the main KAALAM tabs only after profile onboarding is complete.
