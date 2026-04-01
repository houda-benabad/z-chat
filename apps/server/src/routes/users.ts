import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { updateProfileSchema, uploadPublicKeySchema } from "../lib/validation";
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

  // PATCH /users/me/keys — upload/rotate public key
  router.patch(
    "/me/keys",
    validate(uploadPublicKeySchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const user = await prisma.user.update({
        where: { id: req.userId },
        data: { publicKey: req.body.publicKey },
        select: { id: true, publicKey: true },
      });
      res.json({ user });
    }),
  );

  // GET /users/search?phone=+1234567890
  router.get(
    "/search",
    asyncHandler(async (req: AuthRequest, res) => {
      const phone = req.query.phone as string;
      if (!phone) {
        throw new AppError(400, "Phone query parameter required", "MISSING_PHONE");
      }

      const user = await prisma.user.findUnique({
        where: { phone },
        select: { id: true, phone: true, name: true, avatar: true, isOnline: true, lastSeen: true, publicKey: true },
      });

      if (!user) {
        throw new AppError(404, "User not found", "USER_NOT_FOUND");
      }

      res.json({ user });
    }),
  );

  // GET /users/:id — public profile
  router.get(
    "/:id",
    asyncHandler(async (req: AuthRequest, res) => {
      const user = await prisma.user.findUnique({
        where: { id: String(req.params.id) },
        select: { id: true, phone: true, name: true, about: true, avatar: true, isOnline: true, lastSeen: true, publicKey: true },
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
