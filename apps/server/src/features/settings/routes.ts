import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { SettingsRepository } from "./repository";
import { SettingsService } from "./service";
import { SettingsController } from "./controller";
import { authMiddleware } from "../../shared/middleware/auth";
import { validate } from "../../shared/middleware/validate";

const updatePrivacySchema = z.object({
  lastSeenVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),
  profilePhotoVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),
  aboutVisibility: z.enum(["everyone", "contacts", "nobody"]).optional(),
  readReceipts: z.boolean().optional(),
  defaultDisappearTimer: z.number().int().min(0).max(604800).optional(),
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
  theme: z.enum(["light", "dark"]).optional(),
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

export function createSettingsRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const repo = new SettingsRepository(prisma);
  const service = new SettingsService(repo);
  const controller = new SettingsController(service);
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  router.get("/", controller.getSettings);
  router.patch("/privacy", validate(updatePrivacySchema), controller.updatePrivacy);
  router.patch("/notifications", validate(updateNotificationsSchema), controller.updateNotifications);
  router.patch("/appearance", validate(updateAppearanceSchema), controller.updateAppearance);
  router.patch("/storage", validate(updateStorageSchema), controller.updateStorage);
  router.get("/blocked", controller.getBlockedUsers);
  router.post("/blocked", validate(blockUserSchema), controller.blockUser);
  router.delete("/blocked/:userId", controller.unblockUser);
  router.delete("/account", validate(z.object({ confirmation: z.string() })), controller.deleteAccount);

  return router;
}
