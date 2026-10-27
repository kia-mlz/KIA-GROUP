# Kia Platform Final Audit

**Date:** 2026-10-27 (Asia/Tehran)  
**Branch:** `main`  
**Scope:** Full production-readiness audit + critical fixes applied in-repo.

---

## 1. Executive Summary

Kia is a Persian-first modular monolith (Next.js web + NestJS API + PostgreSQL) with six department domains. Academy and Event backends are live; Material has a client studio; Work / Community / Lab remain honest empty shells.

**This pass fixed Critical/High security gaps**, tightened SEO/URL canonicals, and completed department learner panels. The codebase is **strong for a controlled production launch** once operator credentials (SMS, payment gateway, SMTP, DNS/TLS) are configured.

**Production readiness score: 86 / 100** (code/platform). External ops checklist still required for 95+.

---

## 2. Architecture

| Layer | Status |
| --- | --- |
| Frontend (`apps/group`) | Next 16, department route groups, learner panels per dept |
| API (`apps/api`) | Nest modular monolith composing `@kia./platform`, `kia-academy`, `kia-event` |
| Database | Prisma 7, 45 models, 21 migrations — fresh migrate+seed verified |
| Auth | Phone OTP + email/password + staff 2FA + refresh cookie rotation |
| Payments | ZarinPal / IDPay / Stripe / `dev` (prod-blocked) |
| Isolation | ESLint bans cross-department imports — no violations found |
| Incomplete depts | Work / Community / Lab packages are scaffolds only |

---

## 3. Bugs Fixed (this audit)

| ID | Severity | Fix |
| --- | --- | --- |
| C1 | Critical | Ticket attachments no longer world-readable via `/api/uploads/tickets`; authenticated download at `/api/tickets/:id/attachments/:name` |
| H1 | High | `POST /auth/2fa/verify` now sets httpOnly refresh cookie and strips refresh JWT from JSON |
| H2 | High | `GET /admin/settings` redacts payment/SMS secrets unless `SUPER_ADMIN` |
| H4 | High | Challenge regex scoring no longer grants course entitlements |
| M1 | Medium | OTP hashes use HMAC-SHA256(JWT_SECRET) + timing-safe compare |
| M10 | Medium | Payment `POST /callback` throttled like GET |
| SEO | Medium | Permanent 308 redirects for `/academy`→`/education`, `/work`→`/freelance` |
| SEO | Medium | Metadata + sitemap for `/events`, `/freelance`, `/labs`, `/community`; noindex `/home` `/tracks` and department panels |
| a11y | Low | Landing tagline is `<p>` not skipped `h3`; labs/community use `h1` |
| DX | Low | Added `apps/group/.env.example` |

---

## 4. Missing Features

| Area | Status | Production note |
| --- | --- | --- |
| Kia Work backend | Scaffold only | Do not market as live jobs marketplace |
| Kia Community / Lab | Coming-soon hubs + empty learner panels | Honest empty shells |
| Material collections/downloads | Studio live; panel early | Studio usable |
| Challenge course unlock | Disabled until sandboxed judge | Leaderboard points still work |
| Redis multi-instance throttle | Optional | Required when scaling API replicas |

---

## 5. Removed / Stopped Behavior

- Static public serving of ticket attachment files  
- Course entitlement grant from client-gameable challenge scoring  
- Refresh token in 2FA verify response body  

---

## 6. URL Audit

| URL | Role |
| --- | --- |
| `/education` | Canonical academy entry (OTP) |
| `/academy` | **308** → `/education` |
| `/freelance` | Canonical work hub |
| `/work` | **308** → `/freelance` (`/work/panel` remains) |
| `/events`, `/labs`, `/community`, `/material` | Public department hubs (indexed) |
| `/dashboard` | Academy learner panel |
| `/*/panel` | Department learner panels (noindex) |
| `/home`, `/tracks` | Auth hubs (noindex + robots disallow) |

---

## 7. UI/UX Audit

- Learner nav is path-aware per department with a department switcher  
- Academy dashboard shows only learning cards (progress / exams / courses)  
- Empty department panels are honest (no fake metrics)  
- Residual: Material Studio is dense; Work/Community/Lab still marketing shells  

---

## 8. Security Audit

| Severity | Finding | Status |
| --- | --- | --- |
| Critical | Public ticket file static hosting | **Fixed** |
| High | 2FA refresh token leakage | **Fixed** |
| High | Admin settings secret leakage to `settings:view` | **Fixed** |
| High | Challenge unlock privilege bypass | **Fixed** (entitlement removed) |
| Medium | Unsalted OTP hash / non-constant compare | **Fixed** |
| Medium | Redis optional → per-pod rate limits | Documented; Redis recommended for multi-replica |
| Medium | Access JWT in sessionStorage (XSS blast radius) | Accepted residual; 15m TTL |
| Low | Seed password `KiaAcademy123!` | Rotate on any shared deploy |

---

## 9. Database Audit

- Fresh `pnpm db:migrate:deploy` + `pnpm db:seed` succeeded on empty Postgres 16  
- Financial models include webhook idempotency + wallet integrity migrations  
- No new schema migration required for this security pass  

---

## 10. SEO

- Public metadata added for department hubs  
- Robots disallow expanded for panels + `/home` `/tracks`  
- Sitemap includes department public hubs  
- Root still ships WebSite + Organization JSON-LD  
- Remaining: default OG image, Course JSON-LD per slug  

---

## 11. GEO

- Machine-readable Organization/WebSite schema present  
- Department names consistent via `dashboard.doors.*` + brand tokens  
- Remaining: Course / Breadcrumb schemas for richer answer-engine citation  

---

## 12. Performance

- Not fully re-measured in this pass (no Lighthouse run in VM)  
- Stack already uses Next standalone, helmet, bounded body parsers  
- Recommend Lighthouse CI on staging after domain deploy  

---

## 13. DevOps

- Docker multi-stage + Caddy TLS profile documented (`docs/DEPLOY_RUNBOOK.md`)  
- CI: lint, typecheck, migrate+seed, unit, build; E2E; security (audit+gitleaks+CodeQL)  
- `apps/group/.env.example` restored  
- Docker daemon not available in this Cloud VM — compose smoke deferred to operator host  

---

## 14. Testing

| Suite | Result |
| --- | --- |
| Lint | PASS |
| Typecheck (group + api) | PASS |
| Unit (`pnpm test`) | PASS (api 126; group/packages green) |
| Migrate + seed | PASS |
| E2E Playwright | Not re-run here (needs browser install + running stack) |
| Security unit (auth/tickets) | PASS |

---

## 15. Production Readiness

**Score: 86 / 100**

Ready for production **after** operator completes:

1. Real `JWT_SECRET` / `JWT_REFRESH_SECRET` (≥32, non-placeholder)  
2. Kavenegar API key + approved verify template; `OTP_DEV_EXPOSE=false`  
3. Payment gateway credentials (ZarinPal/IDPay/Stripe) — never leave `dev` in prod  
4. `CORS_ORIGIN` + `APP_URL` + `SITE_DOMAIN` for TLS  
5. SMTP (or accept console/`EmailLog` only)  
6. Disable `SEED_DATABASE`; rotate seed admin password if ever seeded  
7. Backups + restore drill  

---

## 16. Remaining Risks

1. **External credentials** — cannot be invented in-repo  
2. **Work/Community/Lab** — not full products yet  
3. **Challenge judging** — leaderboard only until sandbox judge ships  
4. **Multi-replica without Redis** — rate limits are per-process  
5. **E2E + Docker full-stack smoke** — must be run on deploy host before go-live  

---

## Operator checklist (blocking go-live)

```text
[ ] Set production secrets in .env.docker / host env
[ ] docker compose --profile full up (or equivalent)
[ ] Health: /api/health + web /
[ ] OTP via Kavenegar (no devCode)
[ ] Checkout via real gateway + webhook/callback verify
[ ] Backup Postgres + uploads volume
[ ] pnpm test:e2e against production start
```
