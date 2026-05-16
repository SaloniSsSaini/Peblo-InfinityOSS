#!/bin/sh
set -e
cd /app/apps/api
echo "==> Prisma migrate"
npx prisma migrate deploy
if [ "${RUN_DB_SEED:-1}" = "1" ]; then
  echo "==> Prisma seed (demo user)"
  npx prisma db seed || true
fi
echo "==> Starting API"
exec node dist/main.js
