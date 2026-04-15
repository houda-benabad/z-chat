import * as Sentry from "@sentry/node";
import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { createAuthRouter } from "./features/auth/routes";
import { TwilioConfig } from "./features/auth/service";
import { createUserRouter } from "./features/users/routes";
import { createChatRouter } from "./features/chats/routes";
import { createGroupRouter } from "./features/groups/routes";
import { createContactRouter } from "./features/contacts/routes";
import { createSettingsRouter } from "./features/settings/routes";
import { createUploadRouter } from "./features/upload/routes";
import { createCallRouter } from "./features/calls/routes";
import { errorHandler } from "./shared/middleware/errorHandler";
import { globalRateLimit } from "./shared/middleware/rateLimit";

export function createApp(
  prisma: PrismaClient,
  redis: Redis,
  jwtSecret: string,
  jwtRefreshSecret: string,
  allowedOrigin: string,
  uploadBaseUrl: string,
  twilioConfig?: TwilioConfig,
) {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Allow uploaded media (e.g. PDFs) to be embedded in <iframe> from the web app origin
    frameguard: false,
  }));
  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  // Attach a unique request ID to every request for traceability
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.headers["x-request-id"] ??= randomUUID();
    next();
  });

  app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads"), {
    maxAge: "30d",
    immutable: true,
    etag: true,
  }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();
      res.json({ status: "ready", db: "ok", cache: "ok" });
    } catch (err) {
      res.status(503).json({ status: "not ready", error: err instanceof Error ? err.message : "unknown" });
    }
  });

  app.use(globalRateLimit);

  app.use("/auth", createAuthRouter(prisma, redis, jwtSecret, jwtRefreshSecret, twilioConfig));
  app.use("/users", createUserRouter(prisma, jwtSecret));
  app.use("/chats", createChatRouter(prisma, jwtSecret));
  app.use("/groups", createGroupRouter(prisma, jwtSecret));
  app.use("/contacts", createContactRouter(prisma, jwtSecret));
  app.use("/settings", createSettingsRouter(prisma, jwtSecret));
  app.use("/upload", createUploadRouter(jwtSecret, uploadBaseUrl));
  app.use("/calls", createCallRouter(prisma, jwtSecret));

  app.use(errorHandler);
  Sentry.setupExpressErrorHandler(app);

  return app;
}
