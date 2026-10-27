# Kia — Architecture Overview

kia. is a **modular monolith in a pnpm monorepo**: one deployable web app,
one API, one database — but internally organised as the parent platform plus six
independent department domains. Departments share the platform instead of each
other (spec §5, §34, §35).

```text
                         kia. (platform)
                             │
       ┌─────────┬───────────┼───────────┬─────────┐
    Academy     Work      Material     Labs      Events
       │                                         │
       └──────────────────┬──────────────────────┘
                     Community
```

## Repository layout

```text
apps/
  group/     Next.js 16 web app — the whole ecosystem, shell + all departments
  api/       NestJS 11 API — modular monolith with domain folders
packages/
  brand/         @kia./brand — the seven brand tokens (single source of truth)
  permissions/   @kia./permissions — roles, admin access matrix, department taxonomy
  shared/        @kia./shared — API contracts, banks, grading, validators
docs/            architecture · security · database · development
scripts/         tooling (codemods, catalog generation)
```

## API domain layout (`apps/api/src`)

| Folder | Domain | Contents |
| --- | --- | --- |
| `group/` | **kia. platform** | `auth` (OTP + email + 2FA), `admin`, `site-settings`, `media`, `email`, `sms`, `contact`, `health`, `support/` (tickets · messages · todos), `commerce/` (cart · payments · stripe), `search` |
| `academy/` | **Kia Academy** | `courses`, `course-exams`, `assessments`, `personality`, `readiness`, `roadmaps`, `test-banks`, `bootcamp`, `progress` |
| `events/` | **Kia Event** | `competitions`, `challenges` |
| `common/` | cross-domain platform infra | guards, rate limiting, **domain events**, utils |
| `prisma/`, `config/` | infrastructure | Prisma client + env schema |

Work, Material, Labs and Community have no backend modules yet — they ship as
web routes and hub presence, and their future modules land in `apps/api/src/<dept>/`.

## Web route groups (`apps/group/src/app`)

Route groups organise departments without changing URLs:

| Route group | URL prefixes |
| --- | --- |
| `(academy)` | `/education`, `/assessment`, `/readiness`, `/roadmap`, `/tracks`, `/courses`, `/learn`, `/bootcamp` (+ alias `/academy` → `/education`) |
| `(work)` | `/freelance` (+ alias `/work` → `/freelance`) |
| `(material)` | `/material` |
| `(events)` | `/events` |
| `(community)` | `/community` |
| `(labs)` | `/labs` |
| `(group)` | `/` (landing), `/home` (hub), `/contact`, `/privacy`, `/terms`, `/rewards` |
| ungrouped | `/dashboard/*` (learner panel), `/admin/*` (staff panel), `/checkout/*`, `/cart` — platform surfaces |

## Dependency rule

```text
packages/* (brand, permissions, shared)
        ▲
apps/group ──► apps/api ──► Prisma
        departments never import departments
```

- Departments read each other only through **shared package contracts**,
  the **platform search service**, or **domain events** (`packages/platform/src/common/events`).
- The API regroup is enforced by the folder layout and documented in
  [integrations.md](./integrations.md); the web side keeps departments in
  separate route groups with per-department colour scopes (`.dept--<slug>`).

## Request flow

Browser → Next.js (`/api/*` rewrite) → NestJS guards chain
(`ThrottlerGuard` → `JwtAuthGuard` → `RolesGuard` → `AdminAccessGuard`) →
DTO validation → domain service → Prisma → PostgreSQL. Lesson videos are served
through signed authenticated media URLs — never a public static dump.
