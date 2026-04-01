import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";
import { getIO } from "../socket";
import {
  createGroupSchema,
  updateGroupSchema,
  addMembersSchema,
  updateMemberRoleSchema,
  distributeGroupKeysSchema,
} from "../lib/validation";

const PARTICIPANT_USER_SELECT = {
  id: true,
  phone: true,
  name: true,
  avatar: true,
  isOnline: true,
  lastSeen: true,
  publicKey: true,
} as const;

export function createGroupRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const router = Router();
  router.use(authMiddleware(jwtSecret));

  // POST /groups — Create a new group
  router.post(
    "/",
    validate(createGroupSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const { name, description, avatar, memberIds } = req.body as {
        name: string;
        description?: string;
        avatar?: string;
        memberIds: string[];
      };

      const uniqueMemberIds = [...new Set(memberIds.filter((id) => id !== userId))];

      const members = await prisma.user.findMany({
        where: { id: { in: uniqueMemberIds } },
        select: { id: true },
      });
      if (members.length !== uniqueMemberIds.length) {
        throw new AppError(400, "One or more members not found", "INVALID_MEMBERS");
      }

      const chat = await prisma.chat.create({
        data: {
          type: "group",
          name,
          description: description ?? null,
          avatar: avatar ?? null,
          createdBy: userId,
          participants: {
            create: [
              { userId, role: "admin" },
              ...uniqueMemberIds.map((id) => ({ userId: id, role: "member" })),
            ],
          },
        },
        include: {
          participants: {
            include: { user: { select: PARTICIPANT_USER_SELECT } },
          },
        },
      });

      // Notify all members (including creator) via their personal socket rooms
      const io = getIO();
      if (io) {
        for (const p of chat.participants) {
          io.to(`user:${p.userId}`).emit("chat:new", { chatId: chat.id });
          // Add them to the chat socket room
          const sockets = await io.in(`user:${p.userId}`).fetchSockets();
          for (const s of sockets) {
            s.join(`chat:${chat.id}`);
          }
        }
      }

      res.status(201).json({ chat });
    }),
  );

  // GET /groups/:chatId — Get group info
  router.get(
    "/:chatId",
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const chatId = String(req.params.chatId);

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            include: { user: { select: PARTICIPANT_USER_SELECT } },
          },
        },
      });

      if (!chat || chat.type !== "group") {
        throw new AppError(404, "Group not found", "NOT_FOUND");
      }

      const myParticipantEntry = chat.participants.find((p) => p.userId === userId);
      if (!myParticipantEntry) {
        throw new AppError(403, "Not a member of this group", "FORBIDDEN");
      }

      let creator = null;
      if (chat.createdBy) {
        creator = await prisma.user.findUnique({
          where: { id: chat.createdBy },
          select: { id: true, name: true, phone: true },
        });
      }

      res.json({
        group: {
          id: chat.id,
          name: chat.name,
          description: chat.description,
          avatar: chat.avatar,
          createdBy: chat.createdBy,
          creator,
          createdAt: chat.createdAt,
          // Public key included for all participants (needed for key distribution).
          // encryptedGroupKey only returned for the requesting user.
          participants: chat.participants.map((p) => ({
            ...p,
            encryptedGroupKey: p.userId === userId ? p.encryptedGroupKey : undefined,
          })),
          memberCount: chat.participants.length,
          myEncryptedGroupKey: myParticipantEntry.encryptedGroupKey,
          groupKeyVersion: myParticipantEntry.groupKeyVersion,
        },
      });
    }),
  );

  // PATCH /groups/:chatId — Update group details (admin only)
  router.patch(
    "/:chatId",
    validate(updateGroupSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const chatId = String(req.params.chatId);
      const { name, description, avatar } = req.body as {
        name?: string;
        description?: string | null;
        avatar?: string | null;
      };

      const participant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!participant) {
        throw new AppError(403, "Not a member of this group", "FORBIDDEN");
      }
      if (participant.role !== "admin") {
        throw new AppError(403, "Only admins can update group details", "FORBIDDEN");
      }

      const chat = await prisma.chat.update({
        where: { id: chatId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(avatar !== undefined ? { avatar } : {}),
        },
        include: {
          participants: {
            include: { user: { select: PARTICIPANT_USER_SELECT } },
          },
        },
      });

      const io = getIO();
      if (io) {
        io.to(`chat:${chatId}`).emit("group:updated", {
          chatId,
          name: chat.name,
          description: chat.description,
          avatar: chat.avatar,
        });
      }

      res.json({ chat });
    }),
  );

  // POST /groups/:chatId/members — Add members (admin only)
  router.post(
    "/:chatId/members",
    validate(addMembersSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const chatId = String(req.params.chatId);
      const { memberIds } = req.body as { memberIds: string[] };

      const myParticipant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!myParticipant) {
        throw new AppError(403, "Not a member of this group", "FORBIDDEN");
      }
      if (myParticipant.role !== "admin") {
        throw new AppError(403, "Only admins can add members", "FORBIDDEN");
      }

      const chat = await prisma.chat.findUnique({ where: { id: chatId } });
      if (!chat || chat.type !== "group") {
        throw new AppError(404, "Group not found", "NOT_FOUND");
      }

      // Filter out already-existing participants
      const existing = await prisma.chatParticipant.findMany({
        where: { chatId, userId: { in: memberIds } },
        select: { userId: true },
      });
      const existingIds = new Set(existing.map((p) => p.userId));
      const newIds = memberIds.filter((id) => !existingIds.has(id));

      if (newIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: newIds } },
          select: { id: true },
        });
        if (users.length !== newIds.length) {
          throw new AppError(400, "One or more users not found", "INVALID_MEMBERS");
        }

        await prisma.chatParticipant.createMany({
          data: newIds.map((id) => ({ chatId, userId: id, role: "member" })),
        });
      }

      const updatedChat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: {
            include: { user: { select: PARTICIPANT_USER_SELECT } },
          },
        },
      });

      const io = getIO();
      if (io && newIds.length > 0) {
        // Add new members to the chat socket room and notify them
        for (const id of newIds) {
          const sockets = await io.in(`user:${id}`).fetchSockets();
          for (const s of sockets) {
            s.join(`chat:${chatId}`);
          }
          io.to(`user:${id}`).emit("chat:new", { chatId });
        }
        // Notify existing members
        io.to(`chat:${chatId}`).emit("group:member:added", { chatId, memberIds: newIds });
      }

      res.json({ chat: updatedChat });
    }),
  );

  // DELETE /groups/:chatId/members/:targetUserId — Remove member or leave group
  router.delete(
    "/:chatId/members/:targetUserId",
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const chatId = String(req.params.chatId);
      const targetUserId = String(req.params.targetUserId);

      const myParticipant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!myParticipant) {
        throw new AppError(403, "Not a member of this group", "FORBIDDEN");
      }

      const isSelf = userId === targetUserId;
      if (!isSelf && myParticipant.role !== "admin") {
        throw new AppError(403, "Only admins can remove members", "FORBIDDEN");
      }

      const targetParticipant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId: targetUserId } },
      });
      if (!targetParticipant) {
        throw new AppError(404, "Member not found in this group", "NOT_FOUND");
      }

      await prisma.chatParticipant.delete({
        where: { chatId_userId: { chatId, userId: targetUserId } },
      });

      // If the removed member was the last admin, promote oldest remaining member
      if (targetParticipant.role === "admin") {
        const remainingAdmins = await prisma.chatParticipant.count({
          where: { chatId, role: "admin" },
        });
        if (remainingAdmins === 0) {
          const oldest = await prisma.chatParticipant.findFirst({
            where: { chatId },
            orderBy: { joinedAt: "asc" },
          });
          if (oldest) {
            await prisma.chatParticipant.update({
              where: { id: oldest.id },
              data: { role: "admin" },
            });
          }
        }
      }

      const io = getIO();
      if (io) {
        io.to(`chat:${chatId}`).emit("group:member:removed", { chatId, userId: targetUserId });
      }

      res.json({ message: isSelf ? "Left group" : "Member removed" });
    }),
  );

  // POST /groups/:chatId/keys — Distribute encrypted group key to participants
  // Called after group creation, member addition, or key rotation (member removal).
  router.post(
    "/:chatId/keys",
    validate(distributeGroupKeysSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const chatId = String(req.params.chatId);
      const { keys, version } = req.body as {
        keys: { userId: string; encryptedKey: string }[];
        version: number;
      };

      const myParticipant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!myParticipant) {
        throw new AppError(403, "Not a member of this group", "FORBIDDEN");
      }
      if (myParticipant.role !== "admin") {
        throw new AppError(403, "Only admins can distribute group keys", "FORBIDDEN");
      }

      // Verify all target userIds are current participants
      const validParticipants = await prisma.chatParticipant.findMany({
        where: { chatId, userId: { in: keys.map((k) => k.userId) } },
        select: { userId: true },
      });
      const validIds = new Set(validParticipants.map((p) => p.userId));

      // Update each participant's encrypted key
      await Promise.all(
        keys
          .filter((k) => validIds.has(k.userId))
          .map((k) =>
            prisma.chatParticipant.update({
              where: { chatId_userId: { chatId, userId: k.userId } },
              data: { encryptedGroupKey: k.encryptedKey, groupKeyVersion: version },
            })
          )
      );

      // Notify group members that the key has been updated
      const io = getIO();
      if (io) {
        io.to(`chat:${chatId}`).emit("group:key_updated", { chatId, version });
      }

      res.json({ message: "Group keys distributed", version });
    }),
  );

  // PATCH /groups/:chatId/members/:targetUserId/role — Update member role (admin only)
  router.patch(
    "/:chatId/members/:targetUserId/role",
    validate(updateMemberRoleSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const chatId = String(req.params.chatId);
      const targetUserId = String(req.params.targetUserId);
      const { role } = req.body as { role: "admin" | "member" };

      const myParticipant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!myParticipant || myParticipant.role !== "admin") {
        throw new AppError(403, "Only admins can update member roles", "FORBIDDEN");
      }

      const targetParticipant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId: targetUserId } },
      });
      if (!targetParticipant) {
        throw new AppError(404, "Member not found in this group", "NOT_FOUND");
      }

      const updated = await prisma.chatParticipant.update({
        where: { chatId_userId: { chatId, userId: targetUserId } },
        data: { role },
        include: { user: { select: PARTICIPANT_USER_SELECT } },
      });

      const io = getIO();
      if (io) {
        io.to(`chat:${chatId}`).emit("group:member:role:updated", {
          chatId,
          userId: targetUserId,
          role,
        });
      }

      res.json({ participant: updated });
    }),
  );

  return router;
}
