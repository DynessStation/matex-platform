#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_NAME="${MATEX_DEPLOY_REMOTE:-origin}"
BRANCH_NAME="${MATEX_DEPLOY_BRANCH:-main}"
DEPLOY_STATE_FILE="$REPOSITORY_ROOT/.git/matex-deployed-commit"

cd "$REPOSITORY_ROOT"

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this deployment as the application user, not root." >&2
  exit 1
fi

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "Git remote '$REMOTE_NAME' is not configured." >&2
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Tracked files have local changes. Commit, restore, or move them to an ignored environment file before deploying." >&2
  git status --short --untracked-files=no
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  NODE_DIRECTORY="$(find "$HOME/.nvm/versions/node" -mindepth 2 -maxdepth 2 -type f -name node -printf '%h\n' 2>/dev/null | sort -V | tail -n 1)"
  if [[ -z "$NODE_DIRECTORY" ]]; then
    echo "Node.js was not found in PATH or under ~/.nvm/versions/node." >&2
    exit 1
  fi
  export PATH="$NODE_DIRECTORY:$PATH"
fi

for command_name in npm pm2; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command '$command_name' was not found." >&2
    exit 1
  fi
done

git fetch --prune "$REMOTE_NAME" "$BRANCH_NAME"

CURRENT_COMMIT="$(git rev-parse HEAD)"
TARGET_REF="$REMOTE_NAME/$BRANCH_NAME"
TARGET_COMMIT="$(git rev-parse "$TARGET_REF")"
DEPLOYED_COMMIT="$CURRENT_COMMIT"

if [[ -f "$DEPLOY_STATE_FILE" ]]; then
  DEPLOYED_COMMIT="$(tr -d '[:space:]' < "$DEPLOY_STATE_FILE")"
  if ! git cat-file -e "$DEPLOYED_COMMIT^{commit}" 2>/dev/null; then
    echo "The recorded deployed commit is invalid: $DEPLOYED_COMMIT" >&2
    exit 1
  fi
fi

if [[ "$CURRENT_COMMIT" == "$TARGET_COMMIT" && "$DEPLOYED_COMMIT" == "$TARGET_COMMIT" ]]; then
  echo "Production is already on $(git rev-parse --short HEAD)."
  exit 0
fi

if ! git merge-base --is-ancestor "$CURRENT_COMMIT" "$TARGET_COMMIT"; then
  echo "Production cannot fast-forward to $TARGET_REF. Resolve the branch history manually." >&2
  exit 1
fi

if ! git merge-base --is-ancestor "$DEPLOYED_COMMIT" "$TARGET_COMMIT"; then
  echo "The last successfully deployed commit cannot fast-forward to $TARGET_REF." >&2
  exit 1
fi

CHANGED_FILES="$(git diff --name-only "$DEPLOYED_COMMIT" "$TARGET_COMMIT")"

if grep -q '^backend/database/migrations/' <<<"$CHANGED_FILES"; then
  echo "A database migration is included. Follow the migration and backup runbook before deploying." >&2
  exit 1
fi

BACKEND_CHANGED=false
ADMIN_CHANGED=false
PUBLIC_CHANGED=false
PROCESS_CONFIG_CHANGED=false

grep -q '^backend/' <<<"$CHANGED_FILES" && BACKEND_CHANGED=true
grep -q '^frontend/admin/' <<<"$CHANGED_FILES" && ADMIN_CHANGED=true
grep -q '^frontend/public/' <<<"$CHANGED_FILES" && PUBLIC_CHANGED=true
grep -q '^ops/ecosystem\.config\.cjs$' <<<"$CHANGED_FILES" && PROCESS_CONFIG_CHANGED=true

if [[ "$ADMIN_CHANGED" == true && ! -f frontend/admin/.env.production ]]; then
  echo "Missing frontend/admin/.env.production. Copy .env.example and set the production values first." >&2
  exit 1
fi

if [[ "$CURRENT_COMMIT" != "$TARGET_COMMIT" ]]; then
  git merge --ff-only "$TARGET_REF"
fi

if [[ "$BACKEND_CHANGED" == true ]]; then
  (cd backend && npm ci && npm run build)
fi

if [[ "$PUBLIC_CHANGED" == true ]]; then
  (cd frontend/public && npm ci && npm run build)
fi

if [[ "$ADMIN_CHANGED" == true ]]; then
  chmod 600 frontend/admin/.env.production
  (cd frontend/admin && npm ci && npm run build)
fi

if [[ "$PROCESS_CONFIG_CHANGED" == true ]]; then
  pm2 startOrReload ops/ecosystem.config.cjs --update-env
else
  [[ "$BACKEND_CHANGED" == true ]] && pm2 restart matex-api --update-env
  [[ "$PUBLIC_CHANGED" == true ]] && pm2 restart matex-public --update-env
  [[ "$ADMIN_CHANGED" == true ]] && pm2 restart matex-admin --update-env
fi

if [[ "$BACKEND_CHANGED" == true || "$PUBLIC_CHANGED" == true || "$ADMIN_CHANGED" == true || "$PROCESS_CONFIG_CHANGED" == true ]]; then
  node ops/verify-runtime.cjs
  pm2 save
fi

DEPLOY_STATE_TEMP="${DEPLOY_STATE_FILE}.tmp"
printf '%s\n' "$TARGET_COMMIT" > "$DEPLOY_STATE_TEMP"
mv "$DEPLOY_STATE_TEMP" "$DEPLOY_STATE_FILE"

echo "Deployed $(git rev-parse --short HEAD) from $TARGET_REF."
