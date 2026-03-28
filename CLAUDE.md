# z.chat — Secure Messaging App

## What is this?
A WhatsApp-like mobile messaging app for z.systems company.
Cross-platform (iOS + Android) with end-to-end encryption.

## Company
- Name: z.systems
- Mission: "Redefining the game, one trade at a time"
- Background: white
- Primary Color: #E46C53 (Coral Orange)
- Secondary: #4D7E82 (Teal)
- Accent Colors: #ED2F3C (Crimson), #F1A167 (Peach), #F3D292 (Pale Gold)
- Font: Inter (fallback for custom z typeface)

## Tech Stack
- Monorepo with Turborepo
- Mobile: React Native + Expo + TypeScript
- Backend: Node.js + git credential-osxkeychain erase
host=github.com
protocol=https + TypeScript
- Database: PostgreSQL + Prisma ORM
- Realtime: WebSocket via Socket.IO
- Cache/Presence: Redis
- Auth: JWT + SMS OTP via Twilio
- Encryption: Signal Protocol
- Media Storage: AWS S3
- Calls: WebRTC

## Code Rules
- TypeScript strict mode everywhere
- Zod for input validation on every endpoint
- async/await only, no callbacks
- Write tests for all business logic
- No secrets in code — environment variables only
- Conventional commit messages (feat:, fix:, chore:)

## Features (No Status feature — everything else like WhatsApp)
- Phone number auth with OTP
- Profile creation (name, photo, about)
- 1-on-1 chats with E2E encryption
- Group chats with admin roles
- Voice & video calls (WebRTC)
- Media sharing (photos, videos, documents, voice notes)
- Typing indicators, read receipts, online status
- Contact management (add, block, sync)
- Message actions (reply, forward, star, delete)
- Push notifications
- Settings (privacy, notifications, storage, appearance)
- Disappearing messages