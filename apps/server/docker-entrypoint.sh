#!/bin/sh
set -e

echo "[entrypoint] Resolving any failed migrations..."
npx prisma migrate resolve --applied "20260330143850_init" --schema=./prisma/schema.prisma 2>/dev/null || true

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Starting server..."
exec node dist/server.js
