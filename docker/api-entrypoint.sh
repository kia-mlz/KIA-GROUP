#!/bin/sh
# =============================================================================
# Kia Academy API container entrypoint
#   1. wait for PostgreSQL reachability           (bounded, configurable)
#   2. apply Prisma migrations                    (`migrate deploy` — non-destructive)
#   3. bootstrap first super admin                (BOOTSTRAP_ADMIN_* — prod-safe)
#   4. optional seed                              (SEED_DATABASE=true — dev only)
#   5. exec Node server as PID                    (signals forwarded correctly)
# =============================================================================
set -eu

cd /app/apps/api

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-kia_academy}"
MAX_ATTEMPTS="${DB_WAIT_ATTEMPTS:-60}"

PRISMA_BIN="node_modules/.bin/prisma"

echo "[entrypoint] Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}…"
attempt=0
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "[entrypoint] ERROR: PostgreSQL unreachable after ${MAX_ATTEMPTS} attempts." >&2
    exit 1
  fi
  sleep 2
done
echo "[entrypoint] PostgreSQL is ready."

echo "[entrypoint] Applying migrations (prisma migrate deploy)…"
"$PRISMA_BIN" migrate deploy

# -----------------------------------------------------------------------------
# First super-admin bootstrap (production-safe alternative to seeding).
#
#   BOOTSTRAP_ADMIN_EMAIL      login email of the first SUPER_ADMIN
#   BOOTSTRAP_ADMIN_PASSWORD   min 12 chars — use `openssl rand -base64 24`
#
# Idempotent + fail-safe by design:
#   • Creates a user ONLY when the DB has zero SUPER_ADMINs.
#   • If the email already exists as a non-admin (e.g. a learner self-registered
#     with the same address before you got to it), it is promoted in place —
#     otherwise nothing about existing users is modified.
#   • Never logs the password; credentials stay in the environment only.
#   • Unset → step is skipped entirely (no behavioral change for dev/CI).
# -----------------------------------------------------------------------------
if [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  echo "[entrypoint] Bootstrapping first super admin (if none exists)…"
  if [ "${#BOOTSTRAP_ADMIN_PASSWORD}" -lt 12 ]; then
    echo "[entrypoint] ERROR: BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters." >&2
    exit 1
  fi
  node - <<'EOF'
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@kia./platform');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    const superAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    if (superAdmins > 0) {
      console.log('[bootstrap-admin] SUPER_ADMIN already exists — nothing to do.');
      return;
    }
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(process.env.BOOTSTRAP_ADMIN_PASSWORD, 12);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'SUPER_ADMIN', passwordHash, emailVerified: true, profileComplete: true },
      });
      console.log(`[bootstrap-admin] Promoted existing user ${email} to SUPER_ADMIN.`);
    } else {
      await prisma.user.create({
        data: {
          email,
          name: 'Super Admin',
          role: 'SUPER_ADMIN',
          passwordHash,
          emailVerified: true,
          profileComplete: true,
        },
      });
      console.log(`[bootstrap-admin] Created first SUPER_ADMIN: ${email}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[bootstrap-admin] FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
EOF
  echo "[entrypoint] Bootstrap-admin step finished."
fi

if [ "${SEED_DATABASE:-false}" = "true" ]; then
  if [ "${NODE_ENV:-}" = "production" ]; then
    echo "[entrypoint] REFUSING SEED_DATABASE=true in production. Use BOOTSTRAP_ADMIN_* for the first admin." >&2
    exit 1
  fi
  echo "[entrypoint] Seeding database (SEED_DATABASE=true)…"
  "$PRISMA_BIN" db seed
fi

echo "[entrypoint] Starting Kia API on port ${PORT:-3001}…"
exec node dist/main.js
