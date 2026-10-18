#!/usr/bin/env bash
# Copy completed MATEX backups to the encrypted off-site remote and prune old copies.
#
# Runs after `npm run backup:create` in the nightly cron job. The remote is an rclone
# "crypt" remote over Google Drive (see docs/cloudpanel-production-runbook.md, section 6),
# so file names and contents are encrypted before they leave the VPS.
set -Eeuo pipefail

BACKUP_ROOT="${MATEX_BACKUP_ROOT:-$HOME/backups/matex}"
REMOTE="${MATEX_OFFSITE_REMOTE:-gdrive-crypt:}"
RETENTION_DAYS="${MATEX_OFFSITE_RETENTION_DAYS:-30}"

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is not installed." >&2
  exit 1
fi

if ! rclone listremotes | grep -qx "${REMOTE%%:*}:"; then
  echo "rclone remote '${REMOTE%%:*}' is not configured." >&2
  exit 1
fi

shopt -s nullglob
latest=""
copied=0
for directory in "$BACKUP_ROOT"/matex-*; do
  # Skip unfinished backups; a completed backup always has a manifest.
  [[ -d "$directory" && "$directory" != *.partial && -f "$directory/manifest.json" ]] || continue
  rclone copy "$directory" "${REMOTE}$(basename "$directory")"
  latest="$directory"
  copied=$((copied + 1))
done

if [[ -z "$latest" ]]; then
  echo "No completed backups found in $BACKUP_ROOT." >&2
  exit 1
fi

rclone cryptcheck "$latest" "${REMOTE}$(basename "$latest")"
rclone delete "$REMOTE" --min-age "${RETENTION_DAYS}d" --rmdirs

echo "Off-site copy complete: $copied backup(s) present, newest $(basename "$latest") verified, remote retention ${RETENTION_DAYS} days."
