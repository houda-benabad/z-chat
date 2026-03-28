import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { updateProfileSchema } from "../lib/validation";
import { AppError } from "../lib/errors";

export function createUserRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  // GET /users/me
  router.get(
    "/me",
    asyncHandler(async (req: AuthRequest, res) => {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, phone: true, name: true, about: true, avatar: true, createdAt: true },
      });

      if (!user) {
        throw new AppError(404, "User not found", "USER_NOT_FOUND");
      }

      res.json({ user });
    }),
  );

  // PATCH /users/me
  router.patch(
    "/me",
    validate(updateProfileSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const user = await prisma.user.update({
        where: { id: req.userId },
        data: req.body,
        select: { id: true, phone: true, name: true, about: true, avatar: true, createdAt: true },
      });

      res.json({ user });
    }),
  );

  return router;
}
