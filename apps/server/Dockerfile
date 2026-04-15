# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Match the npm version used to generate the lock file
RUN npm install -g npm@11.11.1

# Copy workspace manifests so npm ci can resolve all workspace deps
COPY package*.json turbo.json tsconfig.base.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/ ./packages/

RUN npm install

# Copy source and build
COPY apps/server/ ./apps/server/

# Generate Prisma client BEFORE tsc so enums/types are available
WORKDIR /app/apps/server
RUN npx prisma generate

WORKDIR /app
RUN npm run build --workspace=@z-chat/server

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy root node_modules (workspace dependencies are hoisted here)
COPY --from=builder /app/node_modules ./node_modules

# Copy server artifacts
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/apps/server/package.json ./

# Uploads directory (bind-mounted or volume in production)
RUN mkdir -p public/uploads

COPY apps/server/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
