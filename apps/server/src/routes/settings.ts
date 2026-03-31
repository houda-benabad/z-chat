import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";
import { validate } from "../middleware/validate";
import { z } from "zod";

const updatePrivacySchema = z.object({
  lastSeenVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),
  profilePhotoVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),
  aboutVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),
  readReceipts: z.boolean().optional(),
  defaultDisappearTimer: z.number().int().min(0).optional(),
});

const updateNotificationsSchema = z.object({
  messageNotifications: z.boolean().optional(),
  groupNotifications: z.boolean().optional(),
  callNotifications: z.boolean().optional(),
  notificationSound: z.boolean().optional(),
  notificationVibrate: z.boolean().optional(),
  notificationPreview: z.boolean().optional(),
});

const updateAppearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  accentColor: z.string().max(20).optional(),
  fontSize: z.enum(["small", "medium", "large"]).optional(),
});

const updateStorageSchema = z.object({
  autoDownloadPhotos: z.boolean().optional(),
  autoDownloadVideos: z.boolean().optional(),
  autoDownloadDocuments: z.boolean().optional(),
});

const blockUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

async function getOrCreateSettings(prisma: PrismaClient, userId: string) {
  return prisma.userSettings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export function createSettingsRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const router = Router();
  router.use(authMiddleware(jwtSecret));

  // GET /settings
  router.get(
    "/",
    asyncHandler(async (req: AuthRequest, res) => {
      const settings = await getOrCreateSettings(prisma, req.userId!);
      res.json({ settings });
    }),
  );

  // PATCH /settings/privacy
  router.patch(
    "/privacy",
    validate(updatePrivacySchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const settings = await prisma.userSettings.upsert({
        where: { userId: req.userId! },
        update: req.body,
        create: { userId: req.userId!, ...req.body },
      });
      res.json({ settings });
    }),
  );

  // PATCH /settings/notifications
  router.patch(
    "/notifications",
    validate(updateNotificationsSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const settings = await prisma.userSettings.upsert({
        where: { userId: req.userId! },
        update: req.body,
        create: { userId: req.userId!, ...req.body },
      });
      res.json({ settings });
    }),
  );

  // PATCH /settings/appearance
  router.patch(
    "/appearance",
    validate(updateAppearanceSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const settings = await prisma.userSettings.upsert({
        where: { userId: req.userId! },
        update: req.body,
        create: { userId: req.userId!, ...req.body },
      });
      res.json({ settings });
    }),
  );

  // PATCH /settings/storage
  router.patch(
    "/storage",
    validate(updateStorageSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const settings = await prisma.userSettings.upsert({
        where: { userId: req.userId! },
        update: req.body,
        create: { userId: req.userId!, ...req.body },
      });
      res.json({ settings });
    }),
  );

  // GET /settings/blocked
  router.get(
    "/blocked",
    asyncHandler(async (req: AuthRequest, res) => {
      const blocked = await prisma.blockedUser.findMany({
        where: { userId: req.userId! },
        include: {
          blockedUser: {
            select: { id: true, phone: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ blocked });
    }),
  );

  // POST /settings/blocked
  router.post(
    "/blocked",
    validate(blockUserSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const { userId: targetId } = req.body;

      if (req.userId === targetId) {
        throw new AppError(400, "Cannot block yourself", "INVALID_TARGET");
      }

      const target = await prisma.user.findUnique({ where: { id: targetId } });
      if (!target) {
        throw new AppError(404, "User not found", "USER_NOT_FOUND");
      }

      await prisma.blockedUser.upsert({
        where: { userId_blockedUserId: { userId: req.userId!, blockedUserId: targetId } },
        create: { userId: req.userId!, blockedUserId: targetId },
        update: {},
      });

      res.json({ message: "User blocked successfully" });
    }),
  );

  // DELETE /settings/blocked/:userId
  router.delete(
    "/blocked/:userId",
    asyncHandler(async (req: AuthRequest, res) => {
      await prisma.blockedUser.deleteMany({
        where: { userId: req.userId!, blockedUserId: req.params.userId },
      });
      res.json({ message: "User unblocked successfully" });
    }),
  );

  // DELETE /settings/account
  router.delete(
    "/account",
    asyncHandler(async (req: AuthRequest, res) => {
      const { confirmation } = req.body;

      if (confirmation !== "DELETE MY ACCOUNT") {
        throw new AppError(400, "Invalid confirmation", "INVALID_CONFIRMATION");
      }

      const userId = req.userId!;

      await prisma.$transaction(async (tx) => {
        await tx.message.deleteMany({ where: { senderId: userId } });
        await tx.user.delete({ where: { id: userId } });
      });

      res.json({ message: "Account deleted successfully" });
    }),
  );

  return router;
}
