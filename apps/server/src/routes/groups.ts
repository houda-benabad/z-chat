import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  memberIds: z.array(z.string().uuid()).min(1).max(256),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar: z.string().url().nullable().optional(),
});

const addMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1),
});

const updateRoleSchema = z.object({
  role: z.enum(["member", "admin"]),
});

const PARTICIPANT_INCLUDE = {
  user: { select: { id: true, name: true, phone: true, avatar: true, isOnline: true, lastSeen: true } },
} as const;

export function createGroupRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const router = Router();
  router.use(authMiddleware(jwtSecret));

  // POST /groups — Create group chat
  router.post(
    "/",
    validate(createGroupSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const { name, description, avatar, memberIds } = req.body as z.infer<typeof createGroupSchema>;

      const allIds = Array.from(new Set([userId, ...memberIds]));

      const chat = await prisma.chat.create({
        data: {
          type: "group",
          name,
          description,
          avatar,
          createdBy: userId,
          participants: {
            create: allIds.map((uid) => ({
              userId: uid,
              role: uid === userId ? "admin" : "member",
            })),
          },
        },
        include: { participants: { include: PARTICIPANT_INCLUDE } },
      });

      res.status(201).json({ chat });
    }),
  );

  // GET /groups/:chatId — Group info
  router.get(
    "/:chatId",
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const { chatId } = req.params;

      const group = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: { include: PARTICIPANT_INCLUDE },
        },
      });

      if (!group || !["group", "department"].includes(group.type)) {
        throw new AppError(404, "Group not found", "NOT_FOUND");
      }

      const isMember = group.participants.some((p) => p.userId === userId);
      if (!isMember) {
        throw new AppError(403, "Not a member of this group", "FORBIDDEN");
      }

      const creator = group.createdBy
        ? await prisma.user.findUnique({
            where: { id: group.createdBy },
            select: { id: true, name: true, phone: true },
          })
        : null;

      res.json({
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          createdBy: group.createdBy,
          creator,
          createdAt: group.createdAt,
          participants: group.participants,
          memberCount: group.participants.length,
        },
      });
    }),
  );

  // PATCH /groups/:chatId — Update group
  router.patch(
    "/:chatId",
    validate(updateGroupSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const { chatId } = req.params;

      const participant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });

      if (!participant) throw new AppError(403, "Not a member", "FORBIDDEN");
      if (participant.role !== "admin") throw new AppError(403, "Admin only", "FORBIDDEN");

      const chat = await prisma.chat.update({
        where: { id: chatId },
        data: req.body,
        include: { participants: { include: PARTICIPANT_INCLUDE } },
      });

      res.json({ chat });
    }),
  );

  // POST /groups/:chatId/members — Add members
  router.post(
    "/:chatId/members",
    validate(addMembersSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const { chatId } = req.params;
      const { memberIds } = req.body as z.infer<typeof addMembersSchema>;

      const participant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });

      if (!participant) throw new AppError(403, "Not a member", "FORBIDDEN");
      if (participant.role !== "admin") throw new AppError(403, "Admin only", "FORBIDDEN");

      await prisma.chatParticipant.createMany({
        data: memberIds.map((uid) => ({ chatId, userId: uid })),
        skipDuplicates: true,
      });

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: { participants: { include: PARTICIPANT_INCLUDE } },
      });

      res.json({ chat });
    }),
  );

  // DELETE /groups/:chatId/members/:userId — Remove member
  router.delete(
    "/:chatId/members/:userId",
    asyncHandler(async (req: AuthRequest, res) => {
      const requesterId = req.userId!;
      const { chatId, userId: targetId } = req.params;

      const requester = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId: requesterId } },
      });

      if (!requester) throw new AppError(403, "Not a member", "FORBIDDEN");
      if (requester.role !== "admin" && requesterId !== targetId) {
        throw new AppError(403, "Admin only", "FORBIDDEN");
      }

      await prisma.chatParticipant.delete({
        where: { chatId_userId: { chatId, userId: targetId } },
      });

      res.json({ message: "Member removed" });
    }),
  );

  // PATCH /groups/:chatId/members/:userId/role — Update member role
  router.patch(
    "/:chatId/members/:userId/role",
    validate(updateRoleSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const requesterId = req.userId!;
      const { chatId, userId: targetId } = req.params;
      const { role } = req.body as z.infer<typeof updateRoleSchema>;

      const requester = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId: requesterId } },
      });

      if (!requester) throw new AppError(403, "Not a member", "FORBIDDEN");
      if (requester.role !== "admin") throw new AppError(403, "Admin only", "FORBIDDEN");

      const participant = await prisma.chatParticipant.update({
        where: { chatId_userId: { chatId, userId: targetId } },
        data: { role },
        include: PARTICIPANT_INCLUDE,
      });

      res.json({ participant });
    }),
  );

  return router;
}
