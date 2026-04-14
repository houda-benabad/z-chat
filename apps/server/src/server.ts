import * as Sentry from "@sentry/node";
import http from "http";
import { loadEnv } from "./shared/config/env";
import { prisma } from "./shared/database/prisma";
import { getRedis } from "./shared/database/redis";
import { createApp } from "./app";
import { createSocketServer } from "./socket";
import { AuthRepository } from "./features/auth/repository";
import { ChatRepository } from "./features/chats/repository";
import { logger } from "./shared/utils/logger";

async function main() {
  const env = loadEnv();

  if (env.SENTRY_DSN) {
    Sentry.init({ dsn: env.SENTRY_DSN, environment: process.env.NODE_ENV ?? "production" });
  }
  const redis = getRedis();
  const app = createApp(prisma, redis, env.JWT_SECRET, env.JWT_REFRESH_SECRET, env.ALLOWED_ORIGIN, env.UPLOAD_BASE_URL);

  // Verify connections
  await prisma.$connect();

  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer, prisma, env.JWT_SECRET, env.ALLOWED_ORIGIN);

  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Server running");
  });

  // Scheduled cleanup jobs
  const authRepo = new AuthRepository(prisma);
  const chatRepo = new ChatRepository(prisma);

  // Every hour: delete expired/revoked refresh tokens
  const tokenCleanup = setInterval(async () => {
    try {
      const { count } = await authRepo.deleteExpiredAndRevokedTokens();
      if (count > 0) logger.info({ count }, "Removed expired/revoked refresh tokens");
    } catch (err) {
      logger.error({ err }, "Token cleanup failed");
    }
  }, 60 * 60 * 1000);

  // Every minute: delete messages past their disappear timer
  const messageCleanup = setInterval(async () => {
    try {
      const { count } = await chatRepo.deleteExpiredMessages();
      if (count > 0) logger.info({ count }, "Deleted expired messages");
    } catch (err) {
      logger.error({ err }, "Message cleanup failed");
    }
  }, 60 * 1000);

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("Shutting down...");
    clearInterval(tokenCleanup);
    clearInterval(messageCleanup);
    await new Promise<void>((resolve, reject) => io.close((err) => (err ? reject(err) : resolve()))).catch((err) =>
      logger.error({ err }, "Socket.IO close failed"),
    );
    await redis.quit().catch((err) => logger.error({ err }, "Redis quit failed"));
    await prisma.$disconnect().catch((err) => logger.error({ err }, "Prisma disconnect failed"));
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
