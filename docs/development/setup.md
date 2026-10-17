# kia. — Development Setup

## Prerequisites

- Node **≥ 22.13** (see `.nvmrc`), pnpm via Corepack
- PostgreSQL 16 (local cluster or Docker)

## Bootstrap

```bash
corepack enable && corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile     # generates the Prisma client + builds libs

cp apps/api/.env.example apps/api/.env           # set DATABASE_URL + JWT secrets
cp apps/group/.env.example apps/group/.env.local # leave NEXT_PUBLIC_DEMO_MODE unset for the real API

pnpm docker:db          # or run your own Postgres 16
pnpm db:migrate:deploy  # applies migrations (use pnpm db:migrate for dev migrations)
pnpm db:seed            # catalog + banks + starter users (idempotent)

pnpm dev                # web :3000 · api :3001 · health /api/health
```

> The API also reads `../../.env` (repo root) if present.

## Build order (matters)

`packages/permissions` and `packages/brand` build before `shared`, which builds
before the API and web app. `pnpm build` (root) handles the order; standalone
runs use `pnpm build:libs` first.

## Common tasks

| Task | Command |
| --- | --- |
| Lint everything | `pnpm lint` |
| Typecheck everything | `pnpm typecheck` |
| Unit tests | `pnpm test` (Vitest: shared/brand/permissions, group web · Jest: API) |
| E2E | `pnpm test:e2e` (needs `pnpm --filter @kia./group exec playwright install chromium`) |
| Production build | `pnpm build` |
| New migration | `pnpm db:migrate` (dev) / `pnpm db:migrate:deploy` (non-interactive) |

## Workspace layout

| Package | Path | Purpose |
| --- | --- | --- |
| `@kia./brand` | `packages/brand` | the seven brand tokens (TS + CSS) |
| `@kia./permissions` | `packages/permissions` | roles, admin-access matrix, department taxonomy |
| `@kia./shared` | `packages/shared` | API contracts, banks, grading, validators |
| `@kia./group` | `apps/group` | Next.js web app (all departments) |
| `@kia./api` | `apps/api` | NestJS modular monolith |

See [testing.md](./testing.md) for the test strategy and
[contributing.md](./contributing.md) for conventions.
