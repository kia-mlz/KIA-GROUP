#!/usr/bin/env bash
# =============================================================================
# Kia — production backup
#
#   ./scripts/backup.sh [backup_dir]     (default: ./backups)
#
# Dumps the Postgres database (custom format, compressed) and tars the uploads
# volume via a temporary container. Retains the newest 7 of each and deletes
# older files. Safe to run from cron on the host:
#
#   0 3 * * *  cd /opt/kia-academy && ./scripts/backup.sh >> backups/backup.log 2>&1
#
# Restore with scripts/restore.sh. Run from the project root (the directory
# containing docker-compose.yml).
# =============================================================================
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
RETAIN_COUNT=7
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$(dirname "$0")/.."

PG_CONTAINER="$(docker compose ps -q postgres || true)"
if [ -z "$PG_CONTAINER" ] || [ "$(docker inspect -f '{{.State.Running}}' "$PG_CONTAINER" 2>/dev/null || echo not-running)" != "true" ]; then
  echo "ERROR: postgres container is not running (docker compose up -d first)." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
echo "[backup] dumping database → $DB_FILE"
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-kia_academy}" \
  -d "${POSTGRES_DB:-kia_academy}" \
  --format=custom \
  --file=- > "$DB_FILE"

if [ ! -s "$DB_FILE" ]; then
  echo "ERROR: database dump is empty — aborting (uploads archive not created)." >&2
  exit 1
fi

UPLOADS_FILE="$BACKUP_DIR/uploads-$STAMP.tar.gz"
echo "[backup] archiving uploads volume → $UPLOADS_FILE"
docker run --rm \
  -v kia-academy_api-uploads:/from:ro \
  -v "$(cd "$BACKUP_DIR" && pwd)":/to \
  alpine tar czf "/to/$(basename "$UPLOADS_FILE")" -C /from . 2>/dev/null \
  || echo "WARN: uploads volume not found or empty — continuing with DB backup only." >&2

# Retention: keep the newest N of each kind.
echo "[backup] pruning (keeping newest $RETAIN_COUNT per kind)"
ls -1t "$BACKUP_DIR"/db-*.dump 2>/dev/null     | tail -n +$((RETAIN_COUNT + 1)) | xargs -r rm --
ls -1t "$BACKUP_DIR"/uploads-*.tar.gz 2>/dev/null | tail -n +$((RETAIN_COUNT + 1)) | xargs -r rm --

echo "[backup] done:"
ls -lh "$BACKUP_DIR"/db-"$STAMP".dump "$BACKUP_DIR"/uploads-"$STAMP".tar.gz 2>/dev/null || true
