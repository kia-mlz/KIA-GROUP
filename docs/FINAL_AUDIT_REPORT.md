# Kia — Final Audit & Production-Readiness Report

**Date:** 2026-10-06 · **Repo:** local `main` @ `1e8d2a1` (+ working-tree changes below)
**Scope:** full-stack master audit (architecture, auth, authorization, database,
payments, all six departments, API, frontend, RTL, security, testing, CI, docs)
with repairs implemented, verified and regression-tested in-place.

Detail tables live in the existing documents — this report does not duplicate
them: findings → [`AUDIT.md`](./AUDIT.md) · backlog/history →
[`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md) · go-live operator steps →
[`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md) · security operations →
[`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md) · deploy →
[`DEPLOY_RUNBOOK.md`](./DEPLOY_RUNBOOK.md).

---

## Executive summary

**Inspected:** the full monorepo (2 apps, 3 packages, 44 Prisma models, 19
migrations, ~530 TS/TSX files), every API module, all auth/session/2FA paths, the
Zarinpal money path, media serving, RBAC, all six department surfaces, the E2E
suite, CI workflows and dependency tree.

**What was broken (this session):**

1. **P0 — `proxy-addr <2.0.8`** newly reachable in the production dependency
   tree (critical CVE: IPv4-mapped-IPv6 trust-subnet IP spoofing). The API
   enables `trust proxy` behind reverse proxies, so `req.ip` (rate-limit keys,
   audit meta) could be spoofed. → fixed via workspace override.
2. **P1 — `source-map-js <1.2.2`** newly reachable in the production tree
   (high CVE: event-loop DoS through indexed source-map offsets). → fixed via
   workspace override.
3. **P2 — competition-registration race**: find-then-create with no P2002
   handling meant a concurrent duplicate surfaced as HTTP 500 (raw Prisma
   error) instead of the intended 409, and the domain event could announce a
   registration that never persisted. → fixed (DB unique constraint is now the
   single-winner; P2002 → `ConflictException`) + 6-spec regression suite.
4. **P2 — stale E2E spec**: 5/9 Playwright tests asserted the pre-rebuild
   landing (removed `Learning path` / `Material Studio` CTAs, email-signup
   `/register`) — stale expectations against the approved UX-10/UX-12/AUTH-6
   design, **not** UI bugs. → spec updated to pin the approved UI; UI untouched.
5. **P3 — stale AGENTS.md route row** for `/`. → corrected.

**What was fixed earlier (prior sessions, re-verified against code today):**
the whole prior backlog — AUTH-1..6, PAY-1..5, EXAM-1..4, CHAL-1..3, DB-1..4,
ADM-1..3, CI-1..3, FE-1..3 — all confirmed still in place by direct code
inspection (session refresh atomic claim, cookie flags, 2FA challenge flow,
payment state machine + single-winner claim + webhook idempotency + authority
proof, Zarinpal server-side verify, media token + path-traversal guards,
server-issued admin access, full audit-log coverage).

**What remains:** no P0/P1. Accepted-with-rationale P2s (PAY-5 outbox,
FE-1 sessionStorage, CHAL-2 sandbox) and operator-side pre-launch steps in
[`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md) (real gateway credentials,
SMTP, DNS/HTTPS, backups — cannot be done from this workstation).

---

## Architecture

**Current:** modular monolith + clear bounded contexts (as mandated; no
microservices). One PostgreSQL database, one identity platform
(`apps/api/src/group`: auth, admin, site-settings, media, email, sms, contact,
search, support, commerce), two department domains (`src/academy`,
`src/events`), shared infrastructure (`src/common`: guards, rate-limit,
**domain events**). Departments never import each other — they react to
`src/common/events` (e.g. `group.payment.completed`, `events.registration.created`).
Next.js app with route groups per department; `@kia./brand` pins the seven
brand tokens (never hard-coded); `@kia./permissions` owns the admin matrix;
`@kia./shared` owns contracts/prices (`PRODUCT_PRICES`, IRR cents).

**Decisions preserved:** payments stay in the platform (shared commerce), OTP is
phone-first and non-optional, frontend permission checks are visibility-only
(server issues `adminPanelAccess` verbatim).

---

## Security findings (this session, by severity)

| Sev    | ID    | Finding                                                                         | Status                                 |
| ------ | ----- | ------------------------------------------------------------------------------- | -------------------------------------- |
| **P0** | DEP-3 | `proxy-addr <2.0.8` IP-spoofing CVE reachable in prod tree behind `trust proxy` | **FIXED** — override `>=2.0.8`         |
| **P1** | DEP-4 | `source-map-js <1.2.2` event-loop-DoS CVE reachable in prod tree                | **FIXED** — override `>=1.2.2`         |
| **P2** | EVT-1 | Competition register race → HTTP 500 + phantom domain event                     | **FIXED** + regression tests           |
| **P2** | QA-2  | 5 stale E2E assertions failing against approved UI                              | **FIXED** — spec pinned to approved UI |
| **P3** | DOC-4 | Stale AGENTS.md `/` route row                                                   | **FIXED**                              |

Prior-session P0/P1s (AUTH-1/2/3, PAY-1/2, EXAM-1/2, CHAL-1, DB-1) re-verified
as still fixed. `pnpm audit --prod --audit-level=high` → **0 vulnerabilities**.
Secret scan: no real secrets in source (only the documented static demo-2FA
placeholder inside `demoApi.ts`, which never leaves the browser); env files are
git-ignored and generated locally with `crypto.randomBytes(48)`. gitleaks +
CodeQL run in CI (`security.yml`); gitleaks is not installed on this machine.

---

## Database

- **Schema:** 44 models, enums for user/order/payment/exam states, FKs with
  deliberate `Restrict` on financial records, `@@unique` guards
  (`userId+courseId`, `userId+resourceType+resourceId`, `userId+competitionId`,
  `walletTransaction.paymentId`), partial unique indexes for one-active-exam,
  non-negative wallet `CHECK`.
- **Migrations:** 19, applied cleanly to a fresh Postgres 16 created this
  session (`pnpm db:migrate:deploy` — never `migrate dev` against shared data);
  seed OK (6 users, 4 courses, 266 lessons, exams, test banks).
- **Transactions:** payment completion (claim → entitlements → wallet debit →
  order PAID → invoice) is one transaction with an atomic single-winner claim;
  refunds likewise (conditional state claim + wallet CREDIT + entitlement
  revocation). Money is integer cents throughout — no floats.
- **Race coverage:** refresh rotation (atomic delete-claim), reset tokens
  (atomic usedAt claim), exam attempts (partial unique index + claim), webhook
  events (unique `eventId`), **competitions (new: P2002 → 409)**.

---

## API

- **Coverage:** every route in both apps enumerated during audit; auth
  (OTP/login/refresh/2FA/password), commerce (checkout/retry/verify/callback
  webhook/refunds/wallet/orders/invoices), academy (courses/lessons/exams/
  readiness/roadmaps/progress), events (competitions/challenges), support
  (tickets/messages/todos), admin (all mutations `@AdminAccess` + audit record),
  media (signed token), health.
- **Authorization:** every object-level route scoped by `userId` or
  entitlement/enrollment; public payment callbacks require the provider-issued
  `authority` (fail-closed on success _and_ failure); backend is authoritative,
  frontend matrix is server-issued.
- **Validation:** global `ValidationPipe { whitelist, transform,
forbidNonWhitelisted }`; DTOs on every body; multer limits + magic-byte
  sniffing on uploads.
- **Errors:** single `HttpExceptionFilter`; no stack traces/SQL leak to clients;
  enumeration-resistant auth messages.
- **Rate limits:** throttled OTP/login/2FA/password/checkout/verify/callback +
  phone-level OTP flood caps + Redis-backed storage when `REDIS_URL` set.

---

## Departments

| Department        | Status                      | Notes                                                                                                                                                       |
| ----------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kia Academy**   | **Implemented**             | courses/lessons/exams/entitlements/roadmaps/readiness/bootcamp, server-authoritative scoring & attempt caps                                                 |
| **Kia Work**      | **Implemented (hub scope)** | `/work` → `/freelance` hub with two honest doors (contact for employers, learning path for freelancers); no job-posting backend yet — UI does not claim one |
| **Kia Material**  | **Implemented**             | Material Studio fully ported (`features/material`), no-signup free tier                                                                                     |
| **Kia Event**    | **Implemented**             | competitions + challenges backend, registrations race-safe (this session), events hub; webinar tile honestly marked «به‌زودی» (no dead link)                |
| **Kia Community** | **Future scope (honest)**   | department page states scope + contact CTA; no fake feed                                                                                                    |
| **Kia Lab**      | **Future scope (honest)**   | department page states scope + contact CTA; no dead navigation                                                                                              |

No fake functionality found: every CTA routes to a working destination or an
explicitly-labelled coming-soon state.

---

## Testing — exact commands & actual results (2026-10-06)

| Command                                                            | Result                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `pnpm lint`                                                        | **PASS** (exit 0, all 5 workspaces)                                           |
| `pnpm typecheck`                                                   | **PASS** (exit 0, all 5 workspaces)                                           |
| `pnpm test`                                                        | **PASS — 367/367** (brand 9 · permissions 12 · shared 41 · web 137 · api 168) |
| `pnpm build`                                                       | **PASS** — 357 static pages generated                                         |
| `pnpm test:e2e` (`E2E_PRODUCTION=1`, prod servers, fresh Postgres) | **PASS — 9/9**                                                                |
| `pnpm audit --prod --audit-level=high`                             | **PASS — 0 vulnerabilities**                                                  |
| `pnpm db:migrate:deploy` (fresh PG16)                              | **PASS — 19 migrations**                                                      |
| `pnpm db:seed`                                                     | **PASS**                                                                      |
| `GET /api/health` (prod build)                                     | **PASS** `{"status":"ok","database":"up"}`                                    |

Baseline (session start) vs final: e2e 5 failed → **0 failed** (FIXED);
audit 2 vulns → **0** (FIXED); lint/typecheck/test/build were green and stayed
green. **Known regressions: 0.** gitleaks/CodeQL: CI-side only (not runnable
locally — gitleaks absent).

---

## kia. PRODUCTION READINESS

==============================

Architecture: PASS
Authentication: PASS
Authorization: PASS
Database: PASS
Payments: PASS
Academy: PASS
Work: PASS
Material: PASS
Events: PASS
Community: PASS
Labs: PASS
Security: PASS
Frontend: PASS
RTL / i18n: PASS
Accessibility: PASS
Performance: PASS
Testing: PASS
CI/CD: PASS
Deployment: PASS
Documentation: PASS

P0 Remaining: 0
P1 Remaining: 0
P2 Remaining: 3 (accepted with rationale: PAY-5 outbox, FE-1 sessionStorage, CHAL-2 sandbox)
P3 Remaining: 1 (optional: dedicated security pass for access-token cookie)

Known Regressions: 0

Production Ready: NO — **codebase is ready; deployment is not yet done.**
Blockers are operator/infrastructure steps only (all listed in
[`PRE_LAUNCH_CHECKLIST.md`](./PRE_LAUNCH_CHECKLIST.md)): live Zarinpal merchant
credentials + HTTPS callback URLs, production SMTP, DNS + TLS, Postgres backup
cron + restore drill, Enamad id/code, real Kavenegar template, and rotating the
generated dev JWT secrets. None can be completed from this workstation; no code
or test failures remain.
