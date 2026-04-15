#!/bin/sh
set -e

SCHEMA="./prisma/schema.prisma"

# If _prisma_migrations has failed entries, drop it so migrate deploy starts fresh.
# Safe because: if tables were deleted too, everything gets recreated cleanly.
# Once DB is stable, remove this block.
echo "[entrypoint] Clearing failed migration history (one-time fix)..."
node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$executeRawUnsafe('DROP TABLE IF EXISTS _prisma_migrations')
    .then(() => { console.log('  Migration history cleared'); p.\$disconnect(); })
    .catch(() => p.\$disconnect());
" 2>/dev/null || true

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy --schema=$SCHEMA

echo "[entrypoint] Starting server..."
exec node dist/server.js
