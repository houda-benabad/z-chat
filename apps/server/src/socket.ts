import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { verifyAccessToken } from "./lib/tokens";
import { sendMessageSchema, markReadSchema } from "./lib/validation";
import { getRedis } from "./lib/redis";

interface AuthenticatedSocket extends Socket {
  userId: string;
  userPhone: string;
}

// Map userId -> Set of socket IDs (user can have multiple connections)
const userSockets = new Map<string, Set<string>>();

export function getUserSocketIds(userId: string): Set<string> | undefined {
  return userSockets.get(userId);
}

export function createSocketServer(httpServer: HttpServer, prisma: PrismaClient, jwtSecret: string): Server {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Auth middleware — verify JWT on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = verifyAccessToken(token, jwtSecret);
      (socket as AuthenticatedSocket).userId = payload.sub;
      (socket as AuthenticatedSocket).userPhone = payload.phone;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userId = socket.userId;

    // Track socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Set user online
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastSeen: new Date() },
    });

    // Join all chat rooms this user belongs to
    const participations = await prisma.chatParticipant.findMany({
      where: { userId },
      select: { chatId: true },
    });
    for (const p of participations) {
      socket.join(`chat:${p.chatId}`);
    }

    // Broadcast online status to all chats
    for (const p of participations) {
      socket.to(`chat:${p.chatId}`).emit("user:online", { userId });
    }

    // --- Event: message:send ---
    socket.on("message:send", async (data, ack) => {
      try {
        const parsed = sendMessageSchema.parse(data);

        // Verify sender is participant
        const participant = await prisma.chatParticipant.findUnique({
          where: { chatId_userId: { chatId: parsed.chatId, userId } },
        });
        if (!participant) {
          ack?.({ error: "Not a participant of this chat" });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            chatId: parsed.chatId,
            senderId: userId,
            type: parsed.type,
            content: parsed.content,
            mediaUrl: parsed.mediaUrl,
            replyToId: parsed.replyToId,
          },
          include: {
            sender: { select: { id: true, name: true, avatar: true } },
            replyTo: {
              select: { id: true, content: true, senderId: true, type: true },
            },
          },
        });

        // Update chat's updatedAt
        await prisma.chat.update({
          where: { id: parsed.chatId },
          data: { updatedAt: new Date() },
        });

        // Fetch all participants
        const chatParticipants = await prisma.chatParticipant.findMany({
          where: { chatId: parsed.chatId },
          select: { userId: true },
        });

        // Ensure every connected participant is in the room and notify if needed
        for (const cp of chatParticipants) {
          const sIds = userSockets.get(cp.userId);
          if (sIds) {
            for (const sId of sIds) {
              const pSocket = io.sockets.sockets.get(sId);
              if (pSocket && !pSocket.rooms.has(`chat:${parsed.chatId}`)) {
                pSocket.join(`chat:${parsed.chatId}`);
              }
              // Notify recipients so their chat list re-fetches and re-shows the conversation
              // (deletedAt stays set — the server uses it to filter old messages)
              if (pSocket && cp.userId !== userId) {
                pSocket.emit("chat:new", { chatId: parsed.chatId });
              }
            }
          }
        }

        // Broadcast to all participants in the chat room
        io.to(`chat:${parsed.chatId}`).emit("message:new", message);

        const redis = getRedis();
        for (const cp of chatParticipants) {
          if (cp.userId !== userId && !userSockets.has(cp.userId)) {
            // Queue message for offline user
            await redis.lpush(`offline:${cp.userId}`, JSON.stringify(message));
          }
        }

        ack?.({ message });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message";
        ack?.({ error: errorMessage });
      }
    });

    // --- Event: message:read ---
    socket.on("message:read", async (data) => {
      try {
        const parsed = markReadSchema.parse(data);

        await prisma.chatParticipant.update({
          where: { chatId_userId: { chatId: parsed.chatId, userId } },
          data: { lastReadMessageId: parsed.messageId },
        });

        // Notify others that this user has read up to this message
        socket.to(`chat:${parsed.chatId}`).emit("message:read", {
          chatId: parsed.chatId,
          userId,
          messageId: parsed.messageId,
        });
      } catch {
        // Silently ignore invalid read receipts
      }
    });

    // --- Event: typing:start ---
    socket.on("typing:start", (data: { chatId: string }) => {
      if (data.chatId) {
        socket.to(`chat:${data.chatId}`).emit("typing:start", {
          chatId: data.chatId,
          userId,
        });
      }
    });

    // --- Event: typing:stop ---
    socket.on("typing:stop", (data: { chatId: string }) => {
      if (data.chatId) {
        socket.to(`chat:${data.chatId}`).emit("typing:stop", {
          chatId: data.chatId,
          userId,
        });
      }
    });

    // --- Disconnect ---
    socket.on("disconnect", async () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);

          // Set user offline
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeen: new Date() },
          });

          // Broadcast offline status
          for (const p of participations) {
            socket.to(`chat:${p.chatId}`).emit("user:offline", {
              userId,
              lastSeen: new Date(),
            });
          }
        }
      }
    });

    // Deliver queued offline messages
    const redis = getRedis();
    const offlineKey = `offline:${userId}`;
    const queued = await redis.lrange(offlineKey, 0, -1);
    if (queued.length > 0) {
      await redis.del(offlineKey);
      // Send in chronological order (oldest first)
      for (const raw of queued.reverse()) {
        try {
          socket.emit("message:new", JSON.parse(raw));
        } catch {
          // Skip malformed messages
        }
      }
    }
  });

  return io;
}
