import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { UserRepository } from "./repository";
import { UserService } from "./service";
import { UserController } from "./controller";
import { authMiddleware } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";
import { updateProfileSchema, uploadPublicKeySchema, pushTokenSchema, normalizePhone } from "../../shared/utils/validation";
import { AppError } from "../../shared/utils/errors";

const searchByPhoneQuerySchema = z.object({
  phone: z.string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format (E.164 required)")),
});

function validateSearchByPhone(req: Request, _res: Response, next: NextFunction) {
  const result = searchByPhoneQuerySchema.safeParse(req.query);
  if (!result.success) {
    return next(new AppError(400, result.error.errors[0].message, "VALIDATION_ERROR"));
  }
  req.query.phone = result.data.phone;
  next();
}

export function createUserRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const repo = new UserRepository(prisma);
  const service = new UserService(repo);
  const controller = new UserController(service);
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  router.get("/me", controller.getMe);
  router.patch("/me/keys", validate(uploadPublicKeySchema), controller.updatePublicKey);
  router.put("/me/push-token", validate(pushTokenSchema), controller.savePushToken);
  router.get("/search", validateSearchByPhone, controller.searchByPhone);
  router.get("/:id", controller.getUserById);
  router.patch("/me", validate(updateProfileSchema), controller.updateProfile);

  return router;
}
