#!/bin/sh
set -e

SCHEMA="./prisma/schema.prisma"

echo "[entrypoint] Resolving any failed migrations..."
npx prisma migrate resolve --applied "20260330143850_init" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260331000001_add_settings_and_blocked" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260331115433_add_deleted_at_to_chat_participant" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260401100602_add_public_key" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260401101457_add_group_fields" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260401102251_add_group_key" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260406000001_add_push_token" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260409105538_add_starred_messages" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260409125918_add_visible_after" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260415212302_add_calls_table" --schema=$SCHEMA 2>/dev/null || true
npx prisma migrate resolve --applied "20260415212313_add_calls_table" --schema=$SCHEMA 2>/dev/null || true

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy --schema=$SCHEMA

echo "[entrypoint] Starting server..."
exec node dist/server.js
