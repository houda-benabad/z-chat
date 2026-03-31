import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { AppError } from "../lib/errors";

const USER_SELECT = {
  id: true,
  name: true,
  avatar: true,
  jobTitle: true,
  isOnline: true,
  lastSeen: true,
} as const;

const PARTICIPANT_INCLUDE = {
  user: { select: USER_SELECT },
} as const;

export function createDepartmentRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const router = Router();
  router.use(authMiddleware(jwtSecret));

  // GET /departments/my-team
  // Find or create the department group chat for the current user.
  // Also syncs any new department members into the chat automatically.
  router.get(
    "/my-team",
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;

      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true },
      });

      if (!me?.department) {
        throw new AppError(404, "No department set on your profile", "NO_DEPARTMENT");
      }

      const { department } = me;

      // All users in this department (including current user)
      const deptUsers = await prisma.user.findMany({
        where: { department },
        select: USER_SELECT,
      });
      const deptUserIds = deptUsers.map((u) => u.id);
      const userById = new Map(deptUsers.map((u) => [u.id, u]));

      // Find existing department chat this user belongs to
      let chat = await prisma.chat.findFirst({
        where: {
          type: "department",
          name: department,
          participants: { some: { userId } },
        },
        include: { participants: { include: PARTICIPANT_INCLUDE } },
      });

      if (!chat) {
        // Create the department group chat — creator gets admin role
        chat = await prisma.chat.create({
          data: {
            type: "department",
            name: department,
            createdBy: userId,
            participants: {
              create: deptUserIds.map((uid) => ({
                userId: uid,
                role: uid === userId ? "admin" : "member",
              })),
            },
          },
          include: { participants: { include: PARTICIPANT_INCLUDE } },
        });
      } else {
        // Sync any new department members who aren't in the chat yet
        const existing = new Set(chat.participants.map((p) => p.userId));
        const toAdd = deptUserIds.filter((uid) => !existing.has(uid));

        if (toAdd.length > 0) {
          await prisma.chatParticipant.createMany({
            data: toAdd.map((uid) => ({ chatId: chat!.id, userId: uid })),
            skipDuplicates: true,
          });
          chat = await prisma.chat.findUnique({
            where: { id: chat.id },
            include: { participants: { include: PARTICIPANT_INCLUDE } },
          });
        }
      }

      const members = chat!.participants.map((p) => {
        const deptUser = userById.get(p.userId);
        return {
          participantId: p.id,
          userId: p.userId,
          role: p.role,
          user: deptUser ?? p.user,
        };
      });

      // Sort: admins first, then alphabetically by name
      members.sort((a, b) => {
        if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
        return (a.user.name ?? "").localeCompare(b.user.name ?? "");
      });

      res.json({
        chatId: chat!.id,
        name: department,
        memberCount: members.length,
        members,
      });
    }),
  );

  return router;
}
