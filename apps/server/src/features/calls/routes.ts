import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { CallRepository } from "./repository";
import { CallService } from "./service";
import { CallController } from "./controller";
import { authMiddleware } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import { generateCallTokenSchema } from "../../shared/utils/validation";

export function createCallRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const repo = new CallRepository(prisma);
  const service = new CallService(repo);
  const controller = new CallController(service);
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  router.post("/token", validate(generateCallTokenSchema), controller.generateToken);
  router.get("/", controller.getCallHistory);

  return router;
}
