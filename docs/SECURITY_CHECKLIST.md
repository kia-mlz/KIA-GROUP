# Security Checklist — Kia

Living checklist for reviewers & operators. Tick items before every production release.
See also: [`SECURITY.md`](../SECURITY.md) (reporting), [`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md).

## Runtime secrets & configuration

- [ ] `NODE_ENV=production` set on API and Web
- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET`: unique, ≥32 chars, never reused from `.env.example`
- [ ] `OTP_DEV_EXPOSE` unset/false; `devCode` field absent from `POST /api/auth/otp/request` responses
- [ ] SMS provider = `kavenegar` with real API key + approved verify template (no `dev` provider)
- [ ] Payment provider = real gateway (`zarinpal` / `idpay` / `stripe`) — simulator verify paths rejected by API in production (`ZarinPalPaymentProvider.verifyPayment`)
- [ ] `CORS_ORIGIN` lists only public HTTPS origins (comma-separated supported); no localhost warning at boot
- [ ] `TRUST_PROXY=true` behind nginx/Cloudflare/Railway (correct rate-limit + secure-cookie behavior)
- [ ] `REDIS_URL` set (e.g. `redis://redis:6379`) so rate limits are shared across API replicas — CI-2; without it throttling is per-process (single instance only, warning logged at boot)
- [ ] Optional overrides validated: `COOKIE_SAMESITE` ∈ {none,lax,strict}
- [ ] No live keys (Kavenegar/merchant/Enamad/SMTP) ever committed — gitleaks workflow guards history

## Transport & headers

- [x] Helmet enabled on NestJS incl. HSTS (prod-only), frameguard DENY, no-sniff, referrer-policy
- [x] Next.js CSP: no `unsafe-eval` in prod builds; `connect-src 'self'` in prod (all API via `/api` proxy)
- [x] HSTS one year + includeSubDomains on both apps in prod
- [ ] TLS A/A+ rating verified externally after deploy (e.g. SSL Labs / securityheaders.com)

## AuthN / AuthZ

- [x] Login throttled: 5 req/min per IP (global ThrottlerGuard)
- [x] OTP requests capped per-phone: max 3 codes / 10 min regardless of IP (DB-enforced)
- [x] OTP verification: max 5 attempts, hashed codes (`hashOtp`), single-use consumption
- [x] Refresh tokens: rotated & stored server-side; logout revokes all/one
- [ ] Verify IDOR posture for any new endpoint: object access must filter by `userId` from JWT (pattern used in payments/media/orders)
- [ ] New admin routes default to `JwtAuthGuard` (+ role guard) until reviewed

## File uploads & media

- [x] Lesson videos: extension+MIME allowlist, UUID filenames, path-traversal guard (`resolveUnderRoot`), entitlement-checked streaming
- [x] Avatars: 2 MB cap, MIME allowlist + magic-byte sniffing (`sniffImageMime`) rejects polyglots
- [ ] Keep uploads dir outside git (`apps/api/uploads/` ignored); served without execute permissions

## Payments

- [x] Amounts always recomputed server-side from catalog/settings — client never submits prices
- [x] ZarinPal/IDPay amount echoed into gateway verify call; mismatch fails verification
- [x] Stripe webhook signature verified via `constructEvent` with raw body
- [x] Simulator (`zarinpal-sim-*`, dev provider) hard-disabled under production
- [x] Checkout/retry/verify/callback rate-limited (10/min authed, 30/min callback)
- [ ] Reconcile gateway settlements vs orders daily during launch week

## CI / supply chain

- [x] `.github/workflows/security.yml`: pnpm audit (prod, high+, **blocking**), gitleaks secret scan, CodeQL SAST (security-extended) — weekly cron sweep included
- [x] Dependency tree triaged clean (2026-09-29): all high/moderate advisories resolved via `pnpm-workspace.yaml` overrides (mysql2/multer/nodemailer/qs/fast-uri/sharp) — `pnpm audit --prod` reports zero
- [x] CI-1: all third-party GitHub Actions pinned to immutable commit SHAs (no mutable tags); top-level `permissions: {}` default-deny with per-job minimal elevation; CI installs use `--ignore-scripts`
- [x] Dockerfiles: multi-stage, non-root `node`, pre-owned mount points, healthchecks
- [x] docker-compose: `no-new-privileges`, resource limits, loopback-only Postgres binding, explicit `OTP_DEV_EXPOSE:false`
- [ ] On new Critical/high audit finding: patch or add to an explicit triage list within 48h

## Incident response quick links

- Rotate JWT secrets ⇒ invalidates all sessions (access ≤15m, refresh 7d)
- Kill-switch checkout: set payment provider settings to `dev` **only in non-prod**; in prod disable `checkoutCart` route at the proxy
- Purge exposed OTP rows: `DELETE FROM "PhoneOtp" WHERE "consumedAt" IS NULL;`
