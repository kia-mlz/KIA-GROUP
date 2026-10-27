# Kia — Security Model

The platform's security posture is documented in depth in
[`docs/AUDIT.md`](../AUDIT.md) (finding-by-finding) and
[`SECURITY.md`](../../SECURITY.md) (reporting policy). This page is the map.

## Controls

| Area | Control |
| --- | --- |
| Authentication | bcrypt (cost 12), timing-equalized failures, TOTP 2FA for staff, hashed single-use reset/verify/recovery tokens |
| Sessions | 15-min access JWT + 7-day revocable refresh (SHA-256 at rest, rotation via delete-claim, HttpOnly cookie); suspension/ban/soft-delete checked on every validate path |
| Authorization | Guard chain (`Throttler` → `Jwt` → `Roles` → `AdminAccess`) + per-user matrix issued by the backend; object-level ownership checks swept route-by-route (ADM-2) |
| Rate limiting | Per-route `@Throttle` on auth/OTP/contact/public APIs; storage pluggable — Redis when `REDIS_URL` is set, in-memory otherwise, fail-open (CI-2) |
| Headers | Helmet (API) + CSP/HSTS/XFO/Permissions-Policy on Next responses; `frame-ancestors 'none'`, no `unsafe-eval` in production |
| Validation | `class-validator` whitelist + forbidNonWhitelisted on every DTO; Joi env schema at boot; profile text sanitizer (`containsUnsafeText`/`sanitizeProfileText`) |
| Uploads | MIME allow-lists, magic-byte sniffing, size caps, safe-path helper, authenticated signed media URLs |
| XSS | `markdownToHtml` escapes first and pins the emitted tag vocabulary (FE-2 test suite); JSON-LD neutralizes `<`; no `dangerouslySetInnerHTML` outside the audited renderer |
| Payments | Explicit state machine (`assertValidPaymentTransition`), single-winner completion claim, webhook idempotency table, in-app free confirmation blocked in production |
| Data integrity | Wallet ledger with non-negative CHECK constraint, Restrict FKs on financial records, soft-delete with PII minimization, full audit trail on all 33+ admin mutations (ADM-3) |
| CI | `pnpm audit` (high+), gitleaks full-history secret scan, CodeQL JS/TS analysis — all blocking (`.github/workflows/security.yml`) |

## Threat-model highlights (STRIDE summary)

- **Spoofing** — OTP + password both rate-limited and hashed; 2FA on staff;
  refresh rotation makes replay detectable.
- **Tampering** — server-authoritative exam snapshots and payment state
  machine; client cannot grade, price, or confirm.
- **Repudiation** — `AdminAuditLog` on every admin mutation with before/after.
- **Information disclosure** — public settings endpoint strips merchant/SMS
  keys and the whole admin matrix (`toPublicSiteSettings`); errors are generic
  and logged server-side with request IDs.
- **Denial of service** — throttler + provider-level query caps (search is
  capped per provider, list endpoints paginate).
- **Elevation of privilege** — role changes revoke refresh tokens; last-super
  protection; matrix resolution is one audited function.

## Never do

- Log passwords, OTP codes, tokens, gateway keys, or personal codes.
- Trust client-side validation or client-hidden UI as authorization.
- Serve user-uploaded files from a public static path.
