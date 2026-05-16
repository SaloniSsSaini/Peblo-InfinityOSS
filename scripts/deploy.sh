#!/usr/bin/env bash
# One-click deploy on Linux VPS
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Install Docker first: https://docs.docker.com/engine/install/"
  exit 1
fi

ENV_FILE=".env.deploy"
if [[ ! -f "$ENV_FILE" ]]; then
  read -rp "Server IP or domain [localhost]: " DEPLOY_HOST
  DEPLOY_HOST="${DEPLOY_HOST:-localhost}"
  PG_PASS=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)
  JWT1=$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)
  JWT2=$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)
  cat > "$ENV_FILE" <<EOF
DEPLOY_HOST=$DEPLOY_HOST
WEB_PORT=3000
API_PORT=4000
PUBLIC_WEB_URL=http://${DEPLOY_HOST}:3000
PUBLIC_API_URL=http://${DEPLOY_HOST}:4000
WEB_ORIGIN=http://${DEPLOY_HOST}:3000
POSTGRES_PASSWORD=$PG_PASS
JWT_ACCESS_SECRET=$JWT1
JWT_REFRESH_SECRET=$JWT2
DEMO_EMAIL=demo@peblo.infinityos.app
DEMO_PASSWORD=DemoInfinity2026!
DEMO_NAME=Demo visitor
OPENAI_API_KEY=
RUN_DB_SEED=1
EOF
  echo "Created $ENV_FILE"
fi

docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build

source "$ENV_FILE" 2>/dev/null || true
echo ""
echo "Deployed!"
echo "  Web:  ${PUBLIC_WEB_URL:-http://localhost:3000}"
echo "  API:  ${PUBLIC_API_URL:-http://localhost:4000}/api/health"
echo "  Demo: demo@peblo.infinityos.app / DemoInfinity2026!"
