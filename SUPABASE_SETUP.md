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

Run supabase/schema.sql in Supabase SQL Editor if the profile table/policies are not already present. profiles.id must equal the authenticated Supabase user ID. RLS restricts each profile to its owner. The profile email field is nullable because KAALAM phone accounts do not require email.

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
