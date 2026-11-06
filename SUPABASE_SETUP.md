# KAALAM phone authentication (India)

KAALAM uses Supabase Auth to generate and verify six-digit SMS OTPs. MSG91 is only the SMS delivery provider. The mobile app sends and verifies OTPs with Supabase Auth; the Supabase Send SMS Auth Hook forwards the generated OTP to the KAALAM FastAPI service on Render.

## 1. Supabase project setup

1. Open Supabase Dashboard > Authentication > Sign In / Providers.
2. Enable Phone sign-in and phone signups.
3. Keep anonymous sign-ins disabled. KAALAM now requires a verified phone account.
4. Set SMS OTP expiry to 5 minutes.
5. Set the SMS resend/request interval to at least 60 seconds.
6. Configure conservative SMS send limits in Authentication > Rate Limits. Start low and increase only after monitoring legitimate traffic.
7. Configure CAPTCHA/abuse protection for the deployed mobile flow if supported by your selected client integration. Keep Auth rate limits enabled even with CAPTCHA.
8. Disable email sign-in if phone-only registration is the intended product policy.

## 2. MSG91 setup for India

1. Create/verify the MSG91 account and complete the applicable India DLT entity, header/sender ID and content-template approvals.
2. Create an OTP template containing MSG91's required ##OTP## placeholder. The approved template should clearly identify KAALAM.
3. Use a six-digit OTP template. Keep the approved template ID handy.
4. Copy the MSG91 Auth Key and OTP Template ID. Never put the Auth Key in Expo variables, GitHub, or the mobile app.

MSG91 documents its OTP endpoint at https://control.msg91.com/api/v5/otp. KAALAM passes Supabase's OTP to MSG91 as the custom OTP so Supabase remains the only system that verifies it.

## 3. Configure the Supabase Send SMS Hook

1. Deploy the latest KAALAM backend to Render (the repository is connected for automatic deploys).
2. In Supabase Dashboard > Authentication > Hooks, create/enable the Send SMS hook as an HTTP endpoint.
3. Use this URL: https://kaalam-mobile.onrender.com/api/auth/send-sms.
4. Generate/copy the signing secret for the hook. Supabase sends Standard Webhooks signature headers; KAALAM validates the signature and timestamp before accepting any OTP request.
5. In Render > KAALAM service > Environment, add:
   - MSG91_AUTHKEY = MSG91 Auth Key
   - MSG91_OTP_TEMPLATE_ID = approved MSG91 OTP template ID
   - SUPABASE_AUTH_SMS_HOOK_SECRET = exact Send SMS Hook signing secret from Supabase, including the whsec_ prefix
6. Save the Render environment variables and wait for the service to redeploy.
7. Never expose the hook secret or MSG91 Auth Key to the mobile app.

## 4. Mobile app environment

Set these Expo/EAS public variables:
- EXPO_PUBLIC_SUPABASE_URL
- EXPO_PUBLIC_SUPABASE_ANON_KEY (publishable/anon key only)

Optional: EXPO_PUBLIC_API_BASE_URL=https://kaalam-mobile.onrender.com

The app normalizes Indian mobile numbers to +91XXXXXXXXXX, accepts valid 10-digit Indian mobile numbers, requests a Supabase OTP, verifies it with Supabase, and persists the session using AsyncStorage. A 60-second resend cooldown is shown in the UI. Users are not charged an SMS every time they open the app; OTP SMS is sent only when they request authentication or reauthentication.

## 5. Profile schema and access control

Run supabase/schema.sql in Supabase SQL Editor if the profile table/policies are not already present. profiles.id must equal the authenticated Supabase user ID. RLS restricts each profile to its owner. The profile email field is nullable because KAALAM phone accounts do not require email. The schema also revokes all direct table privileges from anon and grants authenticated only SELECT, INSERT and UPDATE; service_role remains server-only. The same hardening is tracked in migration 20261106055313.

## 6. Test before launch

1. Use a Supabase Auth test phone/fixed OTP during development where supported, so test runs do not consume paid MSG91 SMS.
2. Test a real DLT-approved Indian number after the hook and provider are configured.
3. Confirm an incorrect OTP is rejected by Supabase.
4. Confirm a verified user remains signed in after closing and reopening the app.
5. Confirm a second request inside the 60-second cooldown is blocked by the app and Auth rate limits.
6. Confirm non-Indian numbers and malformed numbers are rejected.
7. Confirm the Send SMS endpoint returns 401 for missing/invalid signatures.
8. Monitor MSG91 usage and Supabase Auth logs before increasing limits.

## Security notes

- Never place MSG91 Auth Key, Supabase service-role key, or Send SMS Hook secret in EXPO_PUBLIC_* variables.
- Supabase Auth generates and verifies OTPs. MSG91 only delivers the same OTP.
- The Render hook verifies Supabase's Standard Webhooks signature and rejects stale requests.
- Keep Supabase RLS enabled. Never trust user_metadata for authorization.


## 7. Shared Panchang cache (Navamsha credit control)

KAALAM now stores completed daily Panchang responses in a server-only Supabase table so Render restarts do not erase the cache and separate backend instances can reuse the same result.

The table `public.panchang_cache` has already been created in the connected Supabase project. Row Level Security is enabled and direct `anon` / `authenticated` access is revoked; only the backend's server-side key should access it.

In Render > KAALAM service > Environment, add:

- `SUPABASE_URL=https://qiljzcaakexmktwvdltq.supabase.co`
- `SUPABASE_SECRET_KEY` = a Supabase **secret key** for this project (preferred), or use `SUPABASE_SERVICE_ROLE_KEY` with the legacy service-role JWT.

Keep this key only in Render. Never add it to Expo/EAS variables or the Git repository. The backend supports either variable name. If the key is absent, KAALAM safely falls back to its short-lived in-memory cache and the shared cache remains inactive.

Daily Drik Panchang calculations group nearby coordinates into a 0.01° grid (about 1.1 km in latitude) and calculate using that same grid coordinate. This small location bucketing allows nearby users to share one daily Navamsha result. The API response reports the rounded coordinates used for the calculation. The regular single-time Panchang endpoint retains fine-grained coordinate keys.

The cache TTL defaults to 24 hours. Completed daily results are persisted; incomplete provider responses are not persisted. Monitor `GET /health` or `GET /api/usage` for `shared_cache_configured`, `shared_cache_hits`, `shared_cache_errors`, `cache_hits` and `cache_misses`.

After adding the key, Render will redeploy. Confirm `shared_cache_configured: true` in the health response, then request the same date and nearby location twice: the second request should increment a cache-hit counter without additional Navamsha calls.


## 8. Additional production privilege audit

The connected project has been hardened so `public.profiles` grants no privileges
to `anon`; `authenticated` has only SELECT, INSERT and UPDATE, with existing
owner-only RLS policies. This is tracked by migration
`20261106055313_tighten_profiles_table_grants.sql`. The server-only
`panchang_cache` table remains inaccessible to `anon` and `authenticated`.

**Pending owner-level action:** the live project's existing default-privilege
ACLs still grant broad privileges on future public tables, sequences and
functions to `anon` and `authenticated` for the `postgres` and
`supabase_admin` grantor roles. The connected database role could not change
these ACLs (Postgres returned permission denied), so this was not altered.
Run the following in Supabase SQL Editor using a role authorized to alter
these default privileges, then verify with the `pg_default_acl` query:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
```

Afterward, explicitly grant only the required privileges to each new API table
and add appropriate RLS policies. Do not revoke schema USAGE from Supabase API
roles. The leaked-password-protection advisor remains because KAALAM is
configured for phone OTP rather than password sign-in; if password sign-in is
ever enabled, turn on leaked-password protection before launch.
