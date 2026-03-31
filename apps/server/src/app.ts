import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { createAuthRouter } from "./routes/auth";
import { createUserRouter } from "./routes/users";
import { createChatRouter } from "./routes/chats";
import { createContactRouter } from "./routes/contacts";
import { createSettingsRouter } from "./routes/settings";
import { createUploadRouter } from "./routes/upload";
import { createGroupRouter } from "./routes/groups";
import { createDepartmentRouter } from "./routes/departments";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(prisma: PrismaClient, jwtSecret: string, jwtRefreshSecret: string) {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", createAuthRouter(prisma, jwtSecret, jwtRefreshSecret));
  app.use("/users", createUserRouter(prisma, jwtSecret));
  app.use("/chats", createChatRouter(prisma, jwtSecret));
  app.use("/contacts", createContactRouter(prisma, jwtSecret));
  app.use("/settings", createSettingsRouter(prisma, jwtSecret));
  app.use("/upload", createUploadRouter(jwtSecret));
  app.use("/groups", createGroupRouter(prisma, jwtSecret));
  app.use("/departments", createDepartmentRouter(prisma, jwtSecret));

  app.use(errorHandler);

  return app;
}
