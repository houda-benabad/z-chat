import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { createChatSchema } from "../lib/validation";
import { AppError } from "../lib/errors";

export function createChatRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  // POST /chats — Create or get existing 1-on-1 chat
  router.post(
    "/",
    validate(createChatSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const { participantId } = req.body;
      const userId = req.userId!;

      if (participantId === userId) {
        throw new AppError(400, "Cannot create chat with yourself", "INVALID_PARTICIPANT");
      }

      // Check participant exists
      const participant = await prisma.user.findUnique({ where: { id: participantId } });
      if (!participant) {
        throw new AppError(404, "User not found", "USER_NOT_FOUND");
      }

      // Check if direct chat already exists between these two users
      const existingChat = await prisma.chat.findFirst({
        where: {
          type: "direct",
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: participantId } } },
          ],
        },
        include: {
          participants: {
            include: { user: { select: { id: true, phone: true, name: true, avatar: true, isOnline: true, lastSeen: true } } },
          },
        },
      });

      if (existingChat) {
        res.json({ chat: existingChat });
        return;
      }

      // Create new chat
      const chat = await prisma.chat.create({
        data: {
          type: "direct",
          participants: {
            create: [
              { userId },
              { userId: participantId },
            ],
          },
        },
        include: {
          participants: {
            include: { user: { select: { id: true, phone: true, name: true, avatar: true, isOnline: true, lastSeen: true } } },
          },
        },
      });

      res.status(201).json({ chat });
    }),
  );

  // GET /chats — List all chats with last message
  router.get(
    "/",
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;

      const chats = await prisma.chat.findMany({
        where: {
          participants: { some: { userId } },
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, phone: true, name: true, avatar: true, isOnline: true, lastSeen: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      // Compute unread counts
      const chatsWithMeta = await Promise.all(
        chats.map(async (chat) => {
          const myParticipant = chat.participants.find((p) => p.userId === userId);
          const lastReadId = myParticipant?.lastReadMessageId;

          let unreadCount = 0;
          if (lastReadId) {
            const lastReadMsg = await prisma.message.findUnique({
              where: { id: lastReadId },
              select: { createdAt: true },
            });
            if (lastReadMsg) {
              unreadCount = await prisma.message.count({
                where: {
                  chatId: chat.id,
                  senderId: { not: userId },
                  createdAt: { gt: lastReadMsg.createdAt },
                  isDeleted: false,
                },
              });
            }
          } else {
            // Never read — count all messages from others
            unreadCount = await prisma.message.count({
              where: {
                chatId: chat.id,
                senderId: { not: userId },
                isDeleted: false,
              },
            });
          }

          const lastMessage = chat.messages[0] ?? null;

          return {
            id: chat.id,
            type: chat.type,
            participants: chat.participants,
            lastMessage,
            unreadCount,
            isPinned: myParticipant?.isPinned ?? false,
            updatedAt: chat.updatedAt,
          };
        }),
      );

      // Sort: pinned first, then by updatedAt
      chatsWithMeta.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });

      res.json({ chats: chatsWithMeta });
    }),
  );

  // GET /chats/:id/messages — Paginated messages
  router.get(
    "/:id/messages",
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const chatId = String(req.params.id);
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const limit = Math.min(Number(req.query.limit) || 50, 100);

      // Verify user is participant
      const participant = await prisma.chatParticipant.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!participant) {
        throw new AppError(403, "Not a participant of this chat", "FORBIDDEN");
      }

      const messages = await prisma.message.findMany({
        where: { chatId, isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          replyTo: {
            select: { id: true, content: true, senderId: true, type: true },
          },
        },
      });

      const hasMore = messages.length > limit;
      if (hasMore) messages.pop();

      res.json({
        messages,
        nextCursor: hasMore ? messages[messages.length - 1]?.id : null,
      });
    }),
  );

  return router;
}
