# AGENTS.md

## Cursor Cloud specific instructions

**کیا (Kia)** — Persian-first platform with six departments: Kia Academy, Kia Work,
Kia Material, Kia Event, Kia Community, Kia Lab (tagline: آموزش · اشتغال · نوآوری · ارتباط · توسعه). Architecture notes: `docs/REBUILD_ARCHITECTURE.md`.

Monorepo: Node `>=22.13`, pnpm `11.19.0` via Corepack (`packageManager` in the root `package.json`). Standard commands live in root `package.json` and `README.md`.

### Services

Monorepo (pnpm workspaces) — the parent platform plus six independent department
domains, in one deployable app each:

- `apps/group` — Next.js (port `3000`), default locale `fa` (RTL); proxies `/api` → API.
  Department pages live in **route groups**: `(academy)`, `(work)`, `(material)`,
  `(events)`, `(community)`, `(labs)`, `(group)`; platform surfaces (`dashboard`,
  `admin`, `checkout`, `cart`) stay ungrouped.- `apps/api` — NestJS + Prisma (port `3001`, `/api`), a **modular monolith**
  (the *connection point* that composes packages):
  - `src/group/` — platform shell: auth, admin, sms, contact, health,
    support/*, commerce/*, search
  - `src/config/`, `src/main.ts`, `prisma/` — bootstrap, env schema, schema +
    migrations + seed (client generates into `packages/platform/src/generated`)
  - Department domains are **separate packages** under `kia./`:
    `@kia./kia-academy` (courses, course-exams, learning-paths/
    {roadmaps,assessments,readiness,test-banks}, students/{personality,progress})
    and `@kia./kia-event` (competitions, challenges, bootcamps).
  - `packages/platform` (`@kia./platform`) — the kernel every package
    depends on: Prisma, guards, decorators, domain events, site-settings,
    media, email (exited `src/common` + trio from the old `src/` layout).
  - Departments never import each other (ESLint-banned): cross-department
    reads go through shared contracts, the platform services, or
    `packages/platform/src/common/events`.
- `packages/brand` — the seven brand tokens (TS + CSS), single source of truth
- `packages/permissions` — roles, admin access matrix, department role taxonomy
- `packages/shared` — shared types/utils (must be built before seed/api)
- PostgreSQL 16 required

Brand colours are pinned in `packages/brand` and asserted on both the TS and the
CSS side — never hard-code a department hex.

### Key routes

| Route | Purpose |
| --- | --- |
| `/` | Minimal Persian landing («ورود / ثبت‌نام» → `/education` + email sign-in → `/login`) — **no site header** for guests |
| `/material` | Material Studio (ported, modular in `kia./kia-material/resources`) |
| `/education` | Iranian phone OTP → profile → assessment gate (always phone-first; never auto-skips OTP) |
| `/assessment` | First goal wizard (requires complete profile) → then free readiness test |
| `/readiness` / `/readiness/test` | Free preparations (readiness) test — no purchase required |
| `/readiness/results` | Scorecard → continue to `/roadmap` |
| `/roadmap` | Personalized roadmap + bundle checkout (`roadmapId` required) |
| `/dashboard` | **Academy** learner panel — progress, exams, enrolled courses (alias `/academy/panel`) |
| `/events/panel` | **Event** learner panel — bootcamps, competitions, rewards |
| `/material/panel` `/work/panel` `/community/panel` `/labs/panel` | Per-department learner panels (Material studio entry; others honest empty → public hub) |
| `/dashboard/*` | Detail pages owned by Academy / Events / platform account (finance, tickets, messages, profile, …); sidebar menu switches with the active department |
| `/learn/...` | Lesson player + video + notes + HTML/CSS/JS playground |

Site `TopBar` / `Footer` render only after `profileComplete` (successful registration). Guests use landing CTAs only.

### Learner flow (important)

1. Assessment (`/assessment`) saves roadmap answers.
2. Immediately starts free readiness/preparations test (`/readiness/test`).
3. Results → roadmap (`/roadmap`).
4. Roadmap bundle checkout must include `?roadmapId=…` (missing id shows a misleading “complete the assessment” error).

### Admin roles

- `SUPER_ADMIN` — full admin panel; configures `settings.adminAccess` (what regular `ADMIN` may open).
- `ADMIN` — limited by per-user `adminPanelAccess` (defaults from site settings template when promoted); configure under Admin → Users.
- Seed: `admin@kia.academy` is `SUPER_ADMIN`; `alex@kia.academy` is `LEARNER` (password `KiaAcademy123!`).
- Super admin configures per-moderator access under **Admin → Users** (matrix always visible under each moderator). Site settings → Admin access is only the default template for newly promoted moderators.
- Payments: checkout is a review step; confirming redirects to the configured third-party provider (`dev` / Zarinpal / IDPay / Stripe) under **Settings → Payment gateway**. Catalog amounts are stored in IRR and shown in **تومان** for Persian UI.
- OTP/SMS: configure Kavenegar (API key + approved verify template) under **Settings → OTP/SMS**. In non-production, `OTP_DEV_EXPOSE=true` returns `devCode` when SMS is disabled or using the `dev` provider.
- Enamad: configure id + Code under **Settings → Enamad**; badge renders in the site footer and landing guest footer.

### Readiness test caveats

- During the live test, MCQ/file-drop UI must **not** reveal correctness (no green/red). Scoring is silent until `/readiness/results`.
- Finishing the last module always navigates to `/readiness/results` (local scorecard fallback if API save fails).
- Lesson player at `/learn/...` uses Kia Learn layout (sidebar + video block + notes + code playground). Seeded JS lessons include sample `videoUrl`s for local demos.

### Auth / OTP

- Phone-first OTP: `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, `POST /api/auth/profile`
- Iranian phone normalized to `09xxxxxxxxx`
- In non-production, OTP is returned as `devCode` and logged to the API console
- Email+password login remains for seeded admin (`admin@kia.academy` / `KiaAcademy123!`) and learner (`alex@kia.academy` / `KiaAcademy123!`)

### Commands

Typical: `pnpm install`, `pnpm --filter @kia./shared build`, `pnpm db:migrate:deploy`, `pnpm db:seed`, `pnpm dev`.

Lint / typecheck / test / build: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

### Payments

Default currency is **IRR**. Catalog prices live in `@kia./shared` `PRODUCT_PRICES`. Stripe remains optional; without it, checkout confirms in-dev as before. SMTP is also optional (emails log to console + `EmailLog`).

### Non-obvious Cloud VM caveats

- PostgreSQL is **not** started by the update script or `pnpm dev`. Docker is typically unavailable in Cloud Agent VMs — use a local Postgres 16 cluster: `sudo pg_ctlcluster 16 main start` (ignore `pnpm docker:db`). Role/DB `kia_academy`/`kia_academy` match `apps/api/.env.example`.
- The `kia_academy` DB role needs `CREATEDB` because `pnpm db:migrate` (`prisma migrate dev`) creates a shadow database; without it you get Prisma `P3014`. Prefer `pnpm db:migrate:deploy` in non-interactive environments.
- Build order: `packages/permissions` and `packages/brand` must be built before `packages/shared`, which must be built before `pnpm db:seed` / api build, or seed fails with `MODULE_NOT_FOUND` for `@kia./shared/dist`. `pnpm build` / `pnpm build:libs` handle this order.
- Env files are git-ignored — create from examples: `cp apps/api/.env.example apps/api/.env` and `cp apps/group/.env.example apps/group/.env.local`.
- E2E (`pnpm test:e2e`) needs a one-time browser install: `pnpm --filter @kia./group exec playwright install chromium`.
