import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { ContactRepository } from "./repository";
import { ContactService } from "./service";
import { ContactController } from "./controller";
import { authMiddleware } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import {
  addContactSchema,
  syncAndAddContactsSchema,
  syncContactsSchema,
  updateContactNicknameSchema,
} from "../../shared/utils/validation";

export function createContactRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const repo = new ContactRepository(prisma);
  const service = new ContactService(repo);
  const controller = new ContactController(service);
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  router.post("/", validate(addContactSchema), controller.addContact);
  router.get("/", controller.listContacts);
  router.get("/check/:userId", controller.checkContact);
  router.patch("/:id", validate(updateContactNicknameSchema), controller.updateNickname);
  router.delete("/:id", controller.removeContact);
  router.post("/sync", validate(syncContactsSchema), controller.syncContacts);
  router.post("/sync-and-add", validate(syncAndAddContactsSchema), controller.syncAndAddContacts);

  return router;
}
