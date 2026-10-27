# Kia — Threat Model

Scope: the kia. modular monolith (web + API + PostgreSQL) as deployed for
self-hosting. Assets: user identity data, OTP/email secrets, payment records,
exam content, admin credentials, media.

## Trust boundaries

```text
Browser ──(1)──► Next.js (public) ──(2)──► NestJS API ──(3)──► PostgreSQL
                                      ◄──(4)── third-party gateways/SMS/email
```

## STRIDE per boundary

### (1) Browser → Web

| Threat | Mitigation |
| --- | --- |
| XSS | Escaping-first markdown renderer with pinned tag vocabulary (FE-2 suite); no user HTML anywhere else; CSP without `unsafe-eval` in production |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| CSRF | State-changing API calls require the JWT; refresh cookie is SameSite; `form-action 'self'` |
| Session theft | Access token in per-tab `sessionStorage` (15-min TTL), refresh HttpOnly+SameSite; audit documents the accepted trade-off (FE-1) |

### (2) Web → API (untrusted input boundary)

| Threat | Mitigation |
| --- | --- |
| Injection (SQL) | Prisma parameterized queries only; no raw SQL string building |
| Broken auth | OTP hashing + TTL + attempts + flood caps; bcrypt; 2FA for staff; generic errors (AUTH-6) |
| IDOR | Object-level ownership checks swept route-by-route (ADM-2); learner routes scope by `userId` |
| Privilege escalation | Guard chain; role change revokes refresh tokens; last-super protection |
| Brute force | `@Throttle` per route (login, OTP, reset, contact); pluggable Redis storage for horizontal scale |
| Malicious uploads | Extension + MIME allow-list, magic-byte sniff, size caps, safe-path join, signed URLs |
| Rate-limit bypass | Redis-backed storage when configured; fail-open only on storage outage (logged) |

### (3) API → Database

| Threat | Mitigation |
| --- | --- |
| Data tampering | Payment state machine + single-winner claim; wallet CHECK constraint; exam question snapshots (EXAM-1..4) |
| Repudiation | `AdminAuditLog` on all admin mutations; domain events logged |
| Data loss on delete | Restrict FKs on financial rows; soft-delete with PII minimization (DB-4) |

### (4) Third parties (gateways, SMS, email)

| Threat | Mitigation |
| --- | --- |
| Webhook forgery | Signature verification per provider; idempotency table (`PaymentWebhookEvent`) |
| Secret leakage | Merchant/SMS keys never leave the admin API (`toPublicSiteSettings`); env via Joi-validated schema only |
| SMS pumping | Per-phone flood caps + dev-only `devCode` gated by `OTP_DEV_EXPOSE` (must be unset in production) |

## Residual risks (accepted, documented)

1. In-memory rate limiting on single-instance deployments without Redis.
2. No transactional outbox for domain events (single-instance today; the bus is
   the swap point).
3. In-app `dev` payment provider completes without a gateway — blocked in
   production by settings, still requires operator discipline.

Report vulnerabilities per [`SECURITY.md`](../../SECURITY.md) (private advisories).
