import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ChatRepository } from "./repository";
import { ChatService } from "./service";
import { ChatController } from "./controller";
import { authMiddleware } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import { createChatSchema } from "../../shared/utils/validation";

export function createChatRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const repo = new ChatRepository(prisma);
  const service = new ChatService(repo);
  const controller = new ChatController(service);
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  router.post("/", validate(createChatSchema), controller.createOrGetChat);
  router.get("/", controller.listChats);
  router.delete("/:id", controller.deleteChat);
  router.get("/:id/messages", controller.getMessages);
  router.get("/:id/messages/search", controller.searchMessages);
  router.delete("/:id/messages/:messageId", controller.deleteMessage);

  return router;
}
