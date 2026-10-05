#!/usr/bin/env bash

set -Eeuo pipefail

# Beta deployment defaults. Every value can be overridden via an environment
# variable, e.g. BRANCH=feature/foo ./scripts/deploy-beta.sh all
APP_DIR="${APP_DIR:-/var/www/vhosts/comodeling.city/beta_metalbuilder/urban-model-builder}"
DEPLOY_USER="${DEPLOY_USER:-modelbuilder}"
BRANCH="${BRANCH:-bh_master}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-urban-model-builder-beta}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose-staging.yml}"
MIGRATE_COMPOSE_FILE="${MIGRATE_COMPOSE_FILE:-docker-compose-staging-migrate.yml}"
BACKEND_SERVICE="${BACKEND_SERVICE:-hcu-model-builder-backend}"
BACKEND_BIND_IP="${BACKEND_BIND_IP:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-3032}"
BACKEND_IMAGE="${BACKEND_IMAGE:-hcu-model-builder-backend-beta}"
APP_NETWORK="${APP_NETWORK:-hcu-model-builder-beta-network}"
FRONTEND_DIR="${FRONTEND_DIR:-hcu-urban-model-builder-client}"
MODE="${1:-all}"

export BACKEND_BIND_IP BACKEND_PORT BACKEND_IMAGE APP_NETWORK

case "$MODE" in
  frontend|fe) MODE="frontend" ;;
  backend|be) MODE="backend" ;;
  all) ;;
  *)
    echo "Usage: $0 [frontend|backend|all]" >&2
    exit 2
    ;;
esac

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

run_as_deploy_user() {
  if [[ "$(id -un)" == "$DEPLOY_USER" ]]; then
    "$@"
  elif [[ "$(id -u)" -eq 0 ]]; then
    runuser -u "$DEPLOY_USER" -- "$@"
  else
    fail "Run this script as root or as $DEPLOY_USER."
  fi
}

command -v git >/dev/null || fail "git is not installed."
command -v npm >/dev/null || fail "npm is not installed."
command -v docker >/dev/null || fail "docker is not installed."
command -v curl >/dev/null || fail "curl is not installed."
[[ "$(id -u)" -eq 0 ]] || fail "Run this deployment script as root."
[[ -d "$APP_DIR/.git" ]] || fail "No Git repository found at $APP_DIR."
[[ -f "$APP_DIR/$COMPOSE_FILE" ]] || fail "$COMPOSE_FILE is missing."

cd "$APP_DIR"

if [[ -n "$(run_as_deploy_user git status --porcelain)" ]]; then
  fail "The working tree contains local changes. Commit or stash them first."
fi

log "Pulling origin/$BRANCH"
run_as_deploy_user git fetch origin "$BRANCH"
run_as_deploy_user git checkout "$BRANCH"
run_as_deploy_user git merge --ff-only "origin/$BRANCH"

deploy_frontend() (
  local frontend_path="$APP_DIR/$FRONTEND_DIR"
  local release_path

  [[ -f "$frontend_path/package-lock.json" ]] || fail "Frontend package-lock.json is missing."
  release_path="$(mktemp -d "$APP_DIR/.frontend-release.XXXXXX")"
  trap 'rm -rf -- "$release_path"' EXIT
  chown "$DEPLOY_USER:psaserv" "$release_path"

  log "Installing frontend dependencies"
  run_as_deploy_user npm --prefix "$frontend_path" ci

  log "Building frontend"
  run_as_deploy_user npm --prefix "$frontend_path" run build -- --output-path="$release_path"
  [[ -f "$release_path/index.html" ]] || fail "Frontend build did not create index.html."

  log "Publishing frontend to $frontend_path/dist"
  mkdir -p "$frontend_path/dist"
  command -v rsync >/dev/null || fail "rsync is required (apt install rsync)."
  rsync -a --delete "$release_path/" "$frontend_path/dist/"
  chown -R "$DEPLOY_USER:psaserv" "$frontend_path/dist"
  find "$frontend_path/dist" -type d -exec chmod 755 {} +
  find "$frontend_path/dist" -type f -exec chmod 644 {} +
)

deploy_backend() {
  [[ -f "$APP_DIR/$MIGRATE_COMPOSE_FILE" ]] || fail "$MIGRATE_COMPOSE_FILE is missing."

  log "Starting beta database and Redis"
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" up -d postgres redis

  log "Building backend image"
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" build "$BACKEND_SERVICE"

  log "Building and running database migrations"
  docker compose -p "$COMPOSE_PROJECT" -f "$MIGRATE_COMPOSE_FILE" build migrate
  docker compose -p "$COMPOSE_PROJECT" -f "$MIGRATE_COMPOSE_FILE" run --rm migrate

  log "Replacing backend container"
  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" up -d --no-deps "$BACKEND_SERVICE"

  log "Waiting for backend on http://127.0.0.1:$BACKEND_PORT"
  for _ in {1..30}; do
    if curl --fail --silent --output /dev/null --max-time 2 "http://127.0.0.1:$BACKEND_PORT/"; then
      docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" ps "$BACKEND_SERVICE"
      return 0
    fi
    sleep 2
  done

  docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" logs --tail=100 "$BACKEND_SERVICE" >&2
  fail "Backend did not become reachable within 60 seconds."
}

case "$MODE" in
  frontend) deploy_frontend ;;
  backend) deploy_backend ;;
  all)
    deploy_frontend
    deploy_backend
    ;;
esac

log "Deployment ($MODE) completed successfully"
