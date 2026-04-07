#!/usr/bin/env bash
# Postgres backup script — run as a cron job on the VPS host.
#
# Suggested cron (daily at 2am, keep 7 days):
#   0 2 * * * /path/to/z-chat/scripts/backup.sh >> /var/log/zchat-backup.log 2>&1
#
# Environment variables (set in cron env or export before running):
#   BACKUP_DIR   — where to store dumps        (default: /var/backups/zchat)
#   RETAIN_DAYS  — how many days to keep dumps  (default: 7)
#   CONTAINER    — postgres container name       (default: zchat-postgres-prod)
#   DB_NAME      — database name                (default: zchat)
#   DB_USER      — database user                (default: zchat)

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/zchat}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"
CONTAINER="${CONTAINER:-zchat-postgres-prod}"
DB_NAME="${DB_NAME:-zchat}"
DB_USER="${DB_USER:-zchat}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DUMP_FILE="${BACKUP_DIR}/zchat_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starting backup → ${DUMP_FILE}"

docker exec "${CONTAINER}" \
  pg_dump -U "${DB_USER}" "${DB_NAME}" \
  | gzip > "${DUMP_FILE}"

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Backup complete ($(du -sh "${DUMP_FILE}" | cut -f1))"

# Remove dumps older than RETAIN_DAYS
find "${BACKUP_DIR}" -name "zchat_*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Old backups pruned (retain ${RETAIN_DAYS} days)"
