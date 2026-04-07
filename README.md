# z.chat

Secure WhatsApp-style messaging app for z.systems. Cross-platform iOS + Android with end-to-end encryption.

## Stack

- **Mobile**: React Native + Expo + TypeScript
- **Server**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma
- **Realtime**: Socket.IO
- **Cache/Queue**: Redis
- **Auth**: JWT + SMS OTP (Twilio — deferred)
- **Encryption**: TweetNaCl (Signal-style)

---

## Local Development

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- npm 11+

### 1. Clone and install

```bash
git clone <repo-url>
cd z-chat
npm install
```

### 2. Start infrastructure (Postgres + Redis)

```bash
docker-compose up -d
```

### 3. Configure environment

```bash
cp apps/server/.env.example apps/server/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Edit `apps/server/.env` — minimum required:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/zchat"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="<random 32-char string>"
JWT_REFRESH_SECRET="<random 32-char string>"
PORT=3000
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:8081
UPLOAD_BASE_URL=http://localhost:3000
```

Edit `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### 4. Run database migrations

```bash
cd apps/server
npx prisma migrate dev
cd ../..
```

### 5. Start dev servers

```bash
# Start both server and mobile
npm run dev

# Or separately:
npm run dev:server
npm run dev:mobile
```

Mobile runs on `http://localhost:8081`. Server runs on `http://localhost:3000`.

---

## Environment Variables

### Server (`apps/server/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_SECRET` | ✅ | Access token secret (min 16 chars) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret (min 16 chars) |
| `PORT` | — | HTTP port (default: 3000) |
| `NODE_ENV` | ✅ | `production` or `development` |
| `ALLOWED_ORIGIN` | ✅ | Mobile app origin for CORS |
| `UPLOAD_BASE_URL` | ✅ | Base URL used in uploaded file URLs |
| `LOG_LEVEL` | — | `info`, `debug`, `warn`, `error` (default: `info`) |
| `SENTRY_DSN` | — | Sentry DSN for server error tracking |

### Mobile (`apps/mobile/.env`)

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | ✅ | Server base URL (e.g. `http://192.168.1.10:3000`) |
| `EXPO_PUBLIC_SENTRY_DSN` | — | Sentry DSN for mobile crash reporting |

---

## Production Deployment (Docker Compose)

### 1. Prepare server

```bash
# SSH into your VPS
ssh user@your-server-ip
git clone <repo-url>
cd z-chat
```

### 2. Configure production environment

```bash
cp apps/server/.env.example apps/server/.env
```

Edit `apps/server/.env` with production values:
```
DATABASE_URL="postgresql://zchat:<password>@postgres:5432/zchat"
REDIS_URL="redis://redis:6379"
JWT_SECRET="<strong-random-secret>"
JWT_REFRESH_SECRET="<strong-random-secret>"
PORT=3000
NODE_ENV=production
ALLOWED_ORIGIN=http://<your-server-ip>:8081
UPLOAD_BASE_URL=http://<your-server-ip>:3000
LOG_LEVEL=info
```

### 3. Deploy

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

This starts: **Postgres** → **Redis** → **Server** (with auto-migration) → **Nginx** (reverse proxy).

### 4. Verify

```bash
# Check all containers are healthy
docker-compose -f docker-compose.prod.yml ps

# Health checks
curl http://your-server-ip/health
curl http://your-server-ip/health/ready
```

`/health/ready` checks Postgres + Redis connectivity and returns `503` if either is down.

### 5. Build mobile app

For internal distribution, build a local APK/IPA:

```bash
cd apps/mobile

# Android APK
npx expo run:android --variant release

# iOS (requires macOS + Xcode)
npx expo run:ios --configuration Release
```

Set `EXPO_PUBLIC_API_URL` to your server IP before building.

---

## Running Tests

```bash
# Server tests
cd apps/server
npm test

# Type check (both apps)
cd ../..
npx turbo type-check
```

---

## CI/CD

GitHub Actions runs on every push/PR to `main`:
- Type-check server + mobile
- Run server tests (against real Postgres + Redis services)
- Build Docker image on merge to main (`.github/workflows/ci.yml`)
