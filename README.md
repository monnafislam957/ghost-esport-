# GHOST ESPORT — full-stack starter

Responsive React web app for a Free Fire tournament platform. The same responsive web UI can be used on Android browsers; this is **not yet a signed native Android APK**.

## Included
- Responsive dark/neon-green player dashboard
- Free Fire match cards and match list
- Supabase email/password sign-up and sign-in
- Player profile editing
- Database-backed match registration via a transaction-safe RPC
- Payment and match history screens
- Admin-only match creation/status management (RLS + database role)
- bKash/Nagad payment scaffolds that fail closed (no real payments)

## 1. Run locally
Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase environment values, the UI opens in setup mode and real authentication/database actions stay disabled.

## 2. Set up Supabase
1. Create a Supabase project.
2. In **Project Settings → API**, copy Project URL and the publishable/anon key into `.env.local`.
3. In **SQL Editor**, run `supabase/schema.sql`.
4. In **Authentication → Providers**, enable Email. Configure email confirmation and production redirect URLs.
5. Restart Vite after changing `.env.local`.
6. Create an account through the app and confirm the email if enabled.
7. In the Supabase SQL Editor, use the trusted owner account to grant admin to the correct auth UUID:
   ```sql
   update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';
   ```
   Never let users self-assign admin.

## 3. Payment safety (bKash / Nagad)
Payments are deliberately disabled. The app does not collect PINs/OTPs or accept client claims of payment success. Before enabling real payments:
- Obtain an approved merchant account and use official provider integration documentation.
- Implement checkout only in a server-side Edge Function; keep merchant secrets in server secrets, never in `VITE_` variables.
- Derive amounts from database match fees, verify ownership and registration, and use idempotency.
- Validate callback/webhook authenticity and confirm status server-to-server before marking a payment paid.
- Test sandbox flows, refunds, cancellation, duplicate callbacks, and reconciliation.
- Have the payment provider / qualified reviewer review the implementation.

The included `create-payment` and `payment-webhook` functions return HTTP 501 on purpose. Do not treat a screenshot, transaction ID typed by a player, or browser redirect as proof of payment.

## 4. Production hardening checklist
- Review all RLS policies with test users and an admin account.
- Do not expose room IDs/passwords to everyone; add a server-mediated release policy for confirmed participants.
- Add rate limits, CAPTCHA / abuse protection, account recovery, logging, backups and monitoring.
- Add a match result publishing workflow with admin audit trail.
- Validate tournament rules, age requirements, local law, game publisher rules and prize/entry-fee obligations before launch.
- Add automated tests and deploy only after reviewing Supabase logs and build output.
- For an actual native app, package with a React Native/Expo client or a reviewed Trusted Web Activity; a responsive website alone is not an APK.

## Architecture
`React UI → Supabase Auth → Postgres with Row Level Security`
`React UI → register_for_match RPC → locked match row + registration + history`
`Future payment UI → Edge Function → official bKash/Nagad merchant API → verified webhook → payment record`

## Build
```bash
npm run build
npm run preview
```
