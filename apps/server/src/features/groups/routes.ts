import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { GroupRepository } from "./repository";
import { GroupService } from "./service";
import { GroupController } from "./controller";
import { authMiddleware } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import {
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
  updateMemberRoleSchema,
  distributeGroupKeysSchema,
} from "../../shared/utils/validation";
import { getIO } from "../../socket";

export function createGroupRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const repo = new GroupRepository(prisma);
  const service = new GroupService(repo, getIO, prisma);
  const controller = new GroupController(service);
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  router.post("/", validate(createGroupSchema), controller.createGroup);
  router.get("/:chatId", controller.getGroup);
  router.patch("/:chatId", validate(updateGroupSchema), controller.updateGroup);
  router.post("/:chatId/members", validate(addMembersSchema), controller.addMembers);
  router.delete("/:chatId/members/:targetUserId", controller.removeMember);
  router.post("/:chatId/keys", validate(distributeGroupKeysSchema), controller.distributeGroupKeys);
  router.patch(
    "/:chatId/members/:targetUserId/role",
    validate(updateMemberRoleSchema),
    controller.updateMemberRole,
  );

  return router;
}
