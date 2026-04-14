import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { verifyAccessToken } from "./shared/utils/tokens";
import { sendMessageSchema, markReadSchema } from "./shared/utils/validation";
import { getRedis } from "./shared/database/redis";
import { ChatRepository } from "./features/chats/repository";
import { ChatService } from "./features/chats/service";
import { UserRepository } from "./features/users/repository";
import { SettingsRepository } from "./features/settings/repository";
import { sendPushNotification, messagePreviewText } from "./shared/utils/pushNotifications";
import { logger } from "./shared/utils/logger";
import { AppError } from "./shared/utils/errors";

interface AuthenticatedSocket extends Socket {
  userId: string;
  userPhone: string;
}

// Map userId -> Set of socket IDs (user can have multiple connections)
const userSockets = new Map<string, Set<string>>();

// ─── Per-user event throttle state ────────────────────────────────────────────
interface ThrottleEntry { count: number; windowStart: number }
const msgThrottle  = new Map<string, ThrottleEntry>(); // 60 messages/min
const readThrottle = new Map<string, ThrottleEntry>(); // 30 read receipts/min
const typingThrottle = new Map<string, number>();       // last typing:start timestamp

function isRateLimited(map: Map<string, ThrottleEntry>, userId: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = map.get(userId) ?? { count: 0, windowStart: now };
  if (now - entry.windowStart > windowMs) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count += 1;
  map.set(userId, entry);
  return entry.count > limit;
}

let ioInstance: Server | null = null;

export function getIO(): Server | null {
  return ioInstance;
}

export function getUserSocketIds(userId: string): Set<string> | undefined {
  return userSockets.get(userId);
}

export function createSocketServer(httpServer: HttpServer, prisma: PrismaClient, jwtSecret: string, allowedOrigin: string): Server {
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigin, credentials: true },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  const chatRepo = new ChatRepository(prisma);
  const chatService = new ChatService(chatRepo);
  const userRepo = new UserRepository(prisma);
  const settingsRepo = new SettingsRepository(prisma);

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

  ioInstance = io;

  io.on("connection", async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userId = socket.userId;

    // Track socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join personal room so we can target this user from HTTP routes
    socket.join(`user:${userId}`);

    // Set user online
    await userRepo.setOnlineStatus(userId, true);

    // Join all chat rooms this user belongs to
    const participations = await chatRepo.getUserChatIds(userId);
    for (const p of participations) {
      socket.join(`chat:${p.chatId}`);
    }

    // Fetches a fresh block list each time — ensures unblock takes effect immediately
    // Bidirectional: excludes both users this user blocked AND users who blocked this user
    const getBlockedSocketIds = async () => {
      const blockedIds = await settingsRepo.getBlockedUserIds(userId);
      const blockedByIds = await settingsRepo.getBlockedByUserIds(userId);
      const allIds = [...new Set([...blockedIds, ...blockedByIds])];
      return allIds.flatMap((id) => [...(userSockets.get(id) ?? [])]);
    };

    // Broadcast online status to all chats, excluding blocked users
    const onlineBlockedIds = await getBlockedSocketIds();
    for (const p of participations) {
      (onlineBlockedIds.length > 0
        ? socket.except(onlineBlockedIds).to(`chat:${p.chatId}`)
        : socket.to(`chat:${p.chatId}`)
      ).emit("user:online", { userId });
    }

    // --- Event: message:send ---
    socket.on("message:send", async (data, ack) => {
      if (isRateLimited(msgThrottle, userId, 60, 60_000)) {
        ack?.({ error: "Too many messages. Please slow down." });
        return;
      }
      try {
        const parsed = sendMessageSchema.parse(data);
        const redis = getRedis();

        const { message, chatParticipants } = await chatService.sendMessage(
          {
            chatId: parsed.chatId,
            senderId: userId,
            type: parsed.type,
            content: parsed.content,
            mediaUrl: parsed.mediaUrl,
            replyToId: parsed.replyToId,
            isForwarded: parsed.isForwarded,
          },
          redis,
          new Set(userSockets.keys()),
        );

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

        // Send push notifications to offline participants
        const offlineIds = (chatParticipants as Array<{ userId: string }>)
          .filter((cp) => cp.userId !== userId && !userSockets.has(cp.userId))
          .map((cp) => cp.userId);

        if (offlineIds.length > 0) {
          const pushTokens = await userRepo.getPushTokensByUserIds(offlineIds);
          const senderName = (message as { sender?: { name?: string | null } }).sender?.name ?? "New message";
          const body = messagePreviewText(parsed.type ?? "text");
          for (const [, token] of pushTokens) {
            sendPushNotification(token, senderName, body, { chatId: parsed.chatId });
          }
        }

        ack?.({ message });
      } catch (err) {
        logger.error({ err, userId, chatId: (data as { chatId?: string })?.chatId }, "message:send failed");
        const errorMessage = err instanceof Error ? err.message : "Failed to send message";
        const errorCode = err instanceof AppError ? err.code : undefined;
        ack?.({ error: errorMessage, ...(errorCode ? { code: errorCode } : {}) });
      }
    });

    // --- Event: message:read ---
    socket.on("message:read", async (data) => {
      if (isRateLimited(readThrottle, userId, 30, 60_000)) return;
      try {
        const parsed = markReadSchema.parse(data);

        // Validate the user is actually a participant in this chat
        const participant = await chatRepo.findParticipant(parsed.chatId, userId);
        if (!participant) return;

        await chatRepo.markMessageRead(parsed.chatId, userId, parsed.messageId);

        // Only broadcast the read receipt if the user has readReceipts enabled.
        // Matching WhatsApp behaviour: disabling readReceipts means neither
        // party can see read status.
        const userSettings = await settingsRepo.getOrCreateSettings(userId);
        if (userSettings.readReceipts !== false) {
          socket.to(`chat:${parsed.chatId}`).emit("message:read", {
            chatId: parsed.chatId,
            userId,
            messageId: parsed.messageId,
          });
        }
      } catch {
        // Silently ignore invalid read receipts
      }
    });

    // --- Event: typing:start ---
    socket.on("typing:start", async (data: { chatId: string }) => {
      const now = Date.now();
      const last = typingThrottle.get(userId) ?? 0;
      if (now - last < 2000) return; // max one broadcast per 2 s per user
      typingThrottle.set(userId, now);
      if (data.chatId) {
        const blockedIds = await getBlockedSocketIds();
        const room = socket.to(`chat:${data.chatId}`);
        (blockedIds.length > 0 ? socket.except(blockedIds).to(`chat:${data.chatId}`) : room)
          .emit("typing:start", { chatId: data.chatId, userId });
      }
    });

    // --- Event: typing:stop ---
    socket.on("typing:stop", async (data: { chatId: string }) => {
      if (data.chatId) {
        const blockedIds = await getBlockedSocketIds();
        const room = socket.to(`chat:${data.chatId}`);
        (blockedIds.length > 0 ? socket.except(blockedIds).to(`chat:${data.chatId}`) : room)
          .emit("typing:stop", { chatId: data.chatId, userId });
      }
    });

    // --- Disconnect ---
    socket.on("disconnect", async () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);

          // Clean up per-user throttle state
          typingThrottle.delete(userId);
          msgThrottle.delete(userId);
          readThrottle.delete(userId);

          // Set user offline
          await userRepo.setOnlineStatus(userId, false);

          // Broadcast offline status, excluding blocked users (fresh query — unblock may have happened)
          const offlineBlockedIds = await getBlockedSocketIds();
          for (const p of participations) {
            (offlineBlockedIds.length > 0
              ? socket.except(offlineBlockedIds).to(`chat:${p.chatId}`)
              : socket.to(`chat:${p.chatId}`)
            ).emit("user:offline", { userId, lastSeen: new Date() });
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
