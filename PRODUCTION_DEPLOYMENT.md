# Production Deployment — Kia (KiaDot)

Operator guide for deploying the Kia monorepo to a real host. For the Persian
Docker-first runbook with Caddy/Let’s Encrypt details, also see
[`docs/DEPLOY_RUNBOOK.md`](./docs/DEPLOY_RUNBOOK.md) and
[`docs/PRE_LAUNCH_CHECKLIST.md`](./docs/PRE_LAUNCH_CHECKLIST.md).

**Verdict gate:** code can be production-ready, but SMS (Kavenegar), a live
payment merchant, SMTP, DNS/TLS, and Enamad are **operator-owned**. Until those
are configured, treat the stack as *Ready with Limitations*.

---

## 1. Server prerequisites

| Need | Recommendation |
| --- | --- |
| OS | Ubuntu 22.04 / 24.04 LTS |
| CPU / RAM / disk | ≥ 2 vCPU / 4 GB RAM / 40 GB SSD |
| Node.js | `>=22.13` (see root `.nvmrc`) |
| pnpm | `11.19.0` via Corepack (`packageManager` in root `package.json`) |
| PostgreSQL | **16** (required) |
| Reverse proxy | Caddy or nginx terminating TLS |
| Firewall | Allow `22`, `80`, `443` only; bind app/DB to localhost or a private network |
| Optional | Redis (multi-API-replica rate limits), Docker Engine ≥ 24 + Compose v2 |

Enable Corepack once:

```bash
corepack enable
corepack prepare pnpm@11.19.0 --activate
node -v && pnpm -v
```

---

## 2. Install (source deploy)

```bash
sudo mkdir -p /opt/kiadot && sudo chown "$USER" /opt/kiadot
git clone https://github.com/kia-mlz/KiaDot.git /opt/kiadot
cd /opt/kiadot
pnpm install --frozen-lockfile
```

`postinstall` generates the Prisma client and builds workspace libraries
(`permissions` → `brand` → `shared` → `platform` → academy/event packages).

**Docker alternative:** copy `.env.docker.example` → `.env.docker`, fill secrets,
run `pnpm docker:preflight`, then `pnpm docker:build` / `pnpm docker:up`.
See `docs/DEPLOY_RUNBOOK.md`.

---

## 3. Environment variables

Copy examples (never commit real `.env` files):

```bash
cp apps/api/.env.example apps/api/.env
cp apps/group/.env.example apps/group/.env.local
# Docker path:
cp .env.docker.example .env.docker   # then edit
```

### API (`apps/api/.env`) — required in production

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 16 connection string |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | ≥ 32 chars, **not** an example placeholder |
| `JWT_REFRESH_SECRET` | ≥ 32 chars, **different** from `JWT_SECRET` |
| `CORS_ORIGIN` | Public HTTPS web origin (no `localhost`) |
| `APP_URL` | Same public HTTPS origin (emails / absolute links) |
| `TRUST_PROXY` | `true` behind Caddy/nginx |
| `OTP_DEV_EXPOSE` | unset or `false` |
| `PORT` | Default `3001` (loopback behind proxy) |

Optional: `REDIS_URL`, `SMTP_*`, `STRIPE_*`, `COOKIE_SAMESITE`, `JWT_ACCESS_SECRET`.

### Web (`apps/group/.env.local` / image build-args)

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS origin — **baked at build time** |
| `NEXT_PUBLIC_API_URL` | Prefer empty (same-origin `/api` proxy) |
| `API_PROXY_TARGET` | Upstream API (`http://127.0.0.1:3001` or `http://api:3001`) |
| `NEXT_PUBLIC_DEMO_MODE` | Must stay `false` in real deployments |

Generate secrets:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -base64 48   # JWT_REFRESH_SECRET (must differ)
openssl rand -base64 24   # DB password / bootstrap admin password
```

---

## 4. Database

```bash
# Create role + DB (local/non-Docker example)
sudo -u postgres psql -c "CREATE USER kia_academy WITH PASSWORD '…' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE kia_academy OWNER kia_academy;"

pnpm db:migrate:deploy    # non-interactive; prefer over migrate dev
# Do NOT run seed on production with real users:
# SEED_DATABASE=false
```

- Migrations are additive; take a backup before every upgrade that adds migrations.
- Seed accounts (`admin@kia.academy` / `alex@kia.academy`) use a well-known demo
  password — never leave them on a shared host.
- First production admin: set `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`
  once (Docker entrypoint), log in, enable 2FA, then **remove** those env vars.

Backup / restore helpers: `./scripts/backup.sh`, `./scripts/restore.sh`.

---

## 5. Build and run (production)

```bash
export NODE_ENV=production
pnpm build                # libs → api → Next.js group app
pnpm start                # web :3000 + api start:prod :3001
# Or process-manage each:
#   pnpm --filter @kia./api start:prod
#   pnpm --filter @kia./group start
```

Health probes:

| URL | Purpose |
| --- | --- |
| `GET /api/health` | Liveness (process + DB). Use for container HEALTHCHECK. |
| `GET /api/ready` | Readiness for OTP + payments. Production returns **503** until SMS is a real provider and payment is not `dev`. Do **not** replace HEALTHCHECK with this. |

---

## 6. Domain, SSL, and web server

1. Point an `A`/`AAAA` record at the server (`SITE_DOMAIN`).
2. Terminate TLS at the edge (Caddy automatic Let’s Encrypt, or certbot + nginx).
3. Proxy `/` → Next (`3000`) and `/api` → Nest (`3001`), or proxy everything to
   Next and let `API_PROXY_TARGET` forward `/api`.
4. Force HTTPS; set `TRUST_PROXY=true`.
5. Keep Postgres and app ports off the public internet.

Example nginx sketch:

```nginx
server {
  listen 443 ssl http2;
  server_name kia.example.com;
  # ssl_certificate …;

  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## 7. Post-deploy configuration (Admin panel)

These are **not** code changes — configure after the first SUPER_ADMIN login:

1. **OTP/SMS** — Kavenegar API key + approved verify template (`Admin → OTP/SMS`).
2. **Payment** — ZarinPal / IDPay / Stripe live merchant; HTTPS callback URLs
   (`Admin → Payment`). `dev` provider is blocked in production readiness.
3. **SMTP** — password reset + transactional mail.
4. **Enamad** — code id + code for the footer trust seal.
5. **2FA** — enable for all staff; store recovery codes offline.

Confirm:

```bash
curl -fsS https://kia.example.com/api/health
curl -fsS https://kia.example.com/api/ready   # expect 200 only after SMS + real PSP
```

---

## 8. Logs, backups, upgrades, rollback

**Logs:** API Nest logs + Next stdout. Ship to journald/filebeat as you prefer.
Watch for 5xx spikes and `/api/ready` flipping to 503 after config changes.

**Backups (daily):**

```bash
./scripts/backup.sh /var/backups/kia
# cron example: 0 3 * * * cd /opt/kiadot && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Include Postgres dump + `uploads/` volume. Practice `./scripts/restore.sh` on a
staging DB once before go-live.

**Upgrade:**

```bash
./scripts/backup.sh
git pull
pnpm install --frozen-lockfile
pnpm db:migrate:deploy
pnpm build
# restart processes / docker compose up -d
```

**Rollback:** redeploy the previous git tag / GHCR image digest; restore DB only
if a migration is incompatible with the previous app revision. Prefer additive
migrations so app rollback without DB restore remains possible.

GHCR images (when CI publish is configured): `ghcr.io/kia-mlz/kia./api` and
`ghcr.io/kia-mlz/kia./web`. Web images need `NEXT_PUBLIC_APP_URL` at **build**
time or they are not host-ready.

---

## 9. Common errors

| Symptom | Likely cause |
| --- | --- |
| API refuses to boot in production | Weak/identical JWT secrets, or `CORS_ORIGIN` still localhost |
| `GET /api/ready` → 503 | SMS disabled/`dev`, or payment provider still `dev` |
| OTP never arrives | Kavenegar key/template missing; `OTP_DEV_EXPOSE` must stay off in prod |
| Checkout stuck / “complete assessment” | Missing `?roadmapId=` on roadmap bundle checkout |
| Prisma `P3014` on migrate | Role lacks `CREATEDB` (use `migrate deploy` in prod) |
| Seed / build `MODULE_NOT_FOUND @kia./shared` | Run `pnpm build:libs` (or full `pnpm build`) first |
| Web CORS / wrong absolute URLs | Rebuild web with correct `NEXT_PUBLIC_APP_URL` |
| `manifest.webmanifest` 500 | Do not place a duplicate file under `public/` when `app/manifest.ts` exists |

---

## 10. Security reminders

- Rotate any credential that ever appeared in examples or chat logs.
- Do not expose `/api/uploads/tickets` or lesson media without auth (blocked in
  `apps/api/src/main.ts`).
- Staff 2FA + httpOnly refresh cookies are mandatory for shared hosts.
- `pnpm docker:preflight` must exit 0 on the real `.env.docker` before
  publishing the stack.

---

## 11. Smoke checklist (after deploy)

- [ ] `/api/health` 200; `/api/ready` 200 after SMS + PSP
- [ ] Phone OTP register → profile → assessment → readiness → roadmap
- [ ] Checkout with real gateway (success + cancel paths)
- [ ] Admin login + 2FA; settings secrets visible only to SUPER_ADMIN
- [ ] `robots.txt` disallows `/admin`, `/dashboard`, `/learn`, panels
- [ ] Backup restore drill completed once
