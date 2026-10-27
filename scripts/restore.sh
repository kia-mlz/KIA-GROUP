#!/usr/bin/env bash
# =============================================================================
# Kia — restore from a backup created by scripts/backup.sh
#
#   ./scripts/restore.sh <db_dump_file> [uploads_archive]
#   CONFIRM_DB=1 ./scripts/restore.sh <db_dump_file>   # non-interactive
#
# ⚠️  DESTRUCTIVE: REPLACES the current database content with the dump.
#     The api container is stopped first (prisma migrate deploy on boot will
#     bring the schema to the dump level) and restarted at the end.
# =============================================================================
set -euo pipefail

DB_FILE="${1:-}"
UPLOADS_FILE="${2:-}"
DB_NAME="${POSTGRES_DB:-kia_academy}"
DB_USER="${POSTGRES_USER:-kia_academy}"

if [ -z "$DB_FILE" ] || [ ! -f "$DB_FILE" ]; then
  echo "Usage: $0 <db_dump_file> [uploads_archive]" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

echo "⚠️  This will OVERWRITE the current database ($DB_NAME) with: $DB_FILE"
if [ -n "$UPLOADS_FILE" ]; then
  echo "⚠️  and REPLACE the uploads volume with: $UPLOADS_FILE"
fi
if [ "${CONFIRM_DB:-}" = "$DB_NAME" ] || [ "${CONFIRM_DB:-}" = "1" ]; then
  echo "[restore] confirmed via CONFIRM_DB=$CONFIRM_DB"
else
  printf "Type the database name to confirm [%s]: " "$DB_NAME"
  read -r CONFIRM
  [ "$CONFIRM" = "$DB_NAME" ] || { echo "Aborted."; exit 1; }
fi

API_CID="$(docker compose ps -q api || true)"
if [ -n "$API_CID" ]; then
  echo "[restore] stopping api container…"
  docker compose stop api
fi

echo "[restore] dropping and recreating database…"
docker compose exec -T postgres psql -U "$DB_USER" -d postgres -v ON_ERROR_STOP=1 <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${DB_NAME}";
CREATE DATABASE "${DB_NAME}" OWNER "${DB_USER}";
SQL

echo "[restore] restoring $DB_FILE…"
docker compose exec -T postgres pg_restore \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges < "$DB_FILE"

if [ -n "$UPLOADS_FILE" ]; then
  if [ ! -f "$UPLOADS_FILE" ]; then
    echo "WARN: uploads archive '$UPLOADS_FILE' not found — skipping." >&2
  else
    echo "[restore] restoring uploads volume…"
    docker run --rm \
      -v kia-academy_api-uploads:/to \
      -v "$(cd "$(dirname "$UPLOADS_FILE")" && pwd)":/from:ro \
      alpine sh -c "rm -rf /to/* && tar xzf /from/$(basename "$UPLOADS_FILE") -C /to"
  fi
fi

if [ -n "$API_CID" ]; then
  echo "[restore] restarting api container…"
  docker compose start api
fi

echo "[restore] done."
