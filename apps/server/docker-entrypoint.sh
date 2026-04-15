#!/bin/sh
set -e

SCHEMA="./prisma/schema.prisma"

# ONE-TIME FIX: Nuke the entire public schema and recreate it so
# migrate deploy can run all migrations on a truly empty database.
# Remove this block after the first successful deploy.
echo "[entrypoint] Resetting database schema (one-time fix)..."
node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$executeRawUnsafe('DROP SCHEMA public CASCADE')
    .then(() => p.\$executeRawUnsafe('CREATE SCHEMA public'))
    .then(() => { console.log('  Schema reset complete'); return p.\$disconnect(); })
    .catch((e) => { console.error('  Reset error:', e.message); return p.\$disconnect(); });
" 2>/dev/null || true

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy --schema=$SCHEMA

echo "[entrypoint] Starting server..."
exec node dist/server.js
