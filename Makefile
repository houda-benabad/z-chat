.PHONY: up down server mobile db-reset

## Start everything: install → containers → migrate → backend → mobile
up: install db server mobile

## Just install dependencies
install:
	@echo "▶ Installing dependencies..."
	npm install --legacy-peer-deps
	npm rebuild esbuild

## Start containers + run migrations
db:
	@echo "▶ Starting containers (PostgreSQL + Redis)..."
	docker compose up -d

	@echo "▶ Waiting for PostgreSQL to be ready..."
	@until docker exec zchat-postgres pg_isready -U zchat -q; do sleep 1; done

	@echo "▶ Running Prisma migrations..."
	cd apps/server && npx prisma migrate deploy

	@echo "▶ Generating Prisma client..."
	cd apps/server && npx prisma generate

## Start the backend server only
server:
	@echo "▶ Killing any process on port 3000..."
	@lsof -ti :3000 | xargs kill -9 2>/dev/null || true
	@echo "▶ Starting backend server..."
	npm run dev:server

## Start Expo (scan QR code with phone)
mobile:
	@echo "▶ Killing any existing Expo processes..."
	@pkill -f "expo start" 2>/dev/null || true
	@echo "▶ Starting mobile (Expo) — scan the QR code below:"
	cd apps/mobile && ulimit -n 65536 && npx expo start --clear

## Drop all tables and re-run migrations (data is wiped, schema is restored)
db-reset:
	@echo "▶ Resetting database..."
	cd apps/server && npx prisma migrate reset --force
	@echo "✔ Database reset complete."

## Stop and clean everything
down:
	@echo "▶ Stopping and removing containers, volumes, and images..."
	docker compose down -v --rmi local --remove-orphans

	@echo "▶ Removing node_modules and lock file..."
	rm -rf node_modules apps/server/node_modules apps/mobile/node_modules packages/*/node_modules
	rm -f package-lock.json

	@echo "▶ Removing Expo cache..."
	rm -rf apps/mobile/.expo

	@echo "▶ Removing build artifacts..."
	rm -rf apps/server/dist apps/mobile/dist

	@echo "✔ Clean complete."
