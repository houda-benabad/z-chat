import express from "express";
import helmet from "helmet";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { createAuthRouter } from "./routes/auth";
import { createUserRouter } from "./routes/users";
import { createChatRouter } from "./routes/chats";
import { createContactRouter } from "./routes/contacts";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(prisma: PrismaClient, jwtSecret: string, jwtRefreshSecret: string) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", createAuthRouter(prisma, jwtSecret, jwtRefreshSecret));
  app.use("/users", createUserRouter(prisma, jwtSecret));
  app.use("/chats", createChatRouter(prisma, jwtSecret));
  app.use("/contacts", createContactRouter(prisma, jwtSecret));

  app.use(errorHandler);

  return app;
}
