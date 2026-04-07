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
- Backend: Node.js + TypeScript
- Database: PostgreSQL + Prisma ORM
- Realtime: WebSocket via Socket.IO
- Cache/Presence: Redis
- Auth: JWT + SMS OTP via Twilio
- Encryption: Signal Protocol
- Media Storage: AWS S3
- Calls: WebRTC

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

## Plans
- Make the plan extremely consice. Sacrifice grammar for the sake of concision.
- At the end of each plan , give me a list of unresolved questions to answer, if any.

---

## Architecture: Feature-Based Structure

The codebase is organized by feature, not by type. Every feature is self-contained with its own screens, hooks, components, and styles. Shared code lives in `shared/`.

### Mobile (`apps/mobile/`)

```
app/                          # Expo Router entry points (thin wrappers only — no logic)
src/
  features/
    auth/                     # Phone auth, OTP, welcome
      screens/                # Screen components (UI only)
        styles/               # StyleSheet files per screen
      hooks/                  # usePhoneAuth, useOtpVerification, useWelcome
      index.ts                # Public exports for this feature
    chat/                     # Chat list, chat room, messaging
      screens/
        styles/
      components/             # BlockedBar, ChatHeader, ChatListItem, MessageBubble, etc.
        styles/
      hooks/                  # useChatList, useMessages, useChatSocket, useBlockStatus, etc.
      utils/                  # decryptChatMessage, messageUtils (pure functions only)
      index.ts
    contacts/                 # Add contact, new chat
      screens/
        styles/
      hooks/                  # useAddContact, useNewChat
      index.ts
    groups/                   # Create group, group info, add members
      screens/
        styles/
      hooks/                  # useCreateGroup, useGroupInfo, useAddGroupMembers
      index.ts
    settings/                 # All settings screens
      screens/
        styles/
      hooks/                  # useSettings, useSettingsProfile, useAppearanceSettings, etc.
      index.ts
    user/                     # Profile setup, user profile view
      screens/
        styles/
      hooks/                  # useProfileSetup, useUserProfile
      index.ts
  shared/
    components/               # Avatar, EmptyState, LoadingScreen, Snackbar, TypingDots
      styles/
      index.ts
    context/                  # AppSettingsContext
    hooks/                    # useCurrentUser
      index.ts
    services/
      api/                    # Per-domain API service files
        client.ts             # Axios instance
        auth.ts, chat.ts, contact.ts, group.ts, settings.ts, user.ts
        index.ts
      crypto.ts               # Encryption/decryption
      notifications.ts        # Push notification setup
      socket.ts               # Socket.IO client
    utils/                    # Pure helper functions
      index.ts
  constants/
    index.ts
  theme/
    index.ts                  # Colors, typography, spacing
  types/
    index.ts                  # Shared TypeScript types/interfaces
```

### Server (`apps/server/`)

```
src/
  features/
    auth/                     # routes, controller, service, repository
    chats/                    # routes, controller, service, repository
    contacts/                 # routes, controller, service, repository
    groups/                   # routes, controller, service, repository
    settings/                 # routes, controller, service, repository
    upload/                   # routes, controller
    users/                    # routes, controller, service, repository
  shared/
    config/
      env.ts                  # Environment variable validation
    database/
      prisma.ts               # Prisma client singleton
      redis.ts                # Redis client singleton
    middleware/
      auth.ts, errorHandler.ts, rateLimit.ts, validate.ts
    utils/
      asyncHandler.ts, errors.ts, tokens.ts, validation.ts
  app.ts                      # Express app setup
  server.ts                   # HTTP server entry point
  socket.ts                   # Socket.IO server setup
  __tests__/
```

---

## Code Rules

### General
- TypeScript strict mode everywhere
- Zod for input validation on every endpoint
- async/await only, no callbacks
- Write tests for all business logic
- No secrets in code — environment variables only
- Conventional commit messages (feat:, fix:, chore:)

### Architecture Principles (MANDATORY in every session)

**1. Separation of Concerns**
- Each file has a single responsibility
- Never mix UI, business logic, and data access in the same file

**2. Component Rules**
- Components handle rendering and user interaction ONLY
- Components must NOT contain: API calls, data transformation logic, or complex non-UI logic

**3. Hook Rules**
- All state management and side effects go into custom hooks
- Hooks orchestrate logic but do not handle rendering

**4. Service Layer**
- All API calls and external communication go in `shared/services/api/`
- Services are pure and reusable — no UI logic inside them

**5. Utilities**
- Pure functions (formatting, mapping, calculations) go in `utils/`
- Utilities must have no side effects

**6. Single Responsibility Principle**
- Each function, hook, and file has only one reason to change

**7. Reusability**
- Extract duplicated logic into shared reusable modules under `shared/`

**8. Dependency Direction (STRICT)**
```
Components → Hooks → Services → Utils
```
Never reverse this dependency flow.

**9. Clean Components**
- Components must remain small, declarative, and readable
- If logic grows, extract immediately into a hook

**10. Feature Isolation**
- Each feature is self-contained under `src/features/<feature>/`
- Do not mix logic between features unless placed in `shared/`

### Forbidden Patterns
- Components containing fetch/axios calls
- Components with heavy logic or data transformations
- Mixing multiple responsibilities in one file
- Cross-feature tight coupling (import directly from another feature's internals)
- Side effects inside utility functions
- Logic in `app/` route files — these are thin Expo Router wrappers only

### Refactoring Checklist (apply before marking any task done)
- [ ] Business logic extracted from components into hooks
- [ ] API calls moved to `shared/services/api/`
- [ ] Pure helper logic in `utils/`
- [ ] Grouped by feature
- [ ] Imports follow correct dependency direction
- [ ] No duplicated logic
- [ ] Unused files deleted (after confirmation)

