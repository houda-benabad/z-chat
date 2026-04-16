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
import { ContactRepository } from "./features/contacts/repository";
import { CallRepository } from "./features/calls/repository";
import { CallService } from "./features/calls/service";
import { sendPushNotification, messagePreviewText } from "./shared/utils/pushNotifications";
import { logger } from "./shared/utils/logger";
import { AppError } from "./shared/utils/errors";
import { CallType, EndReason } from "@prisma/client";

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
  const contactRepo = new ContactRepository(prisma);
  const callRepo = new CallRepository(prisma);
  const callService = new CallService(callRepo);

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
    try {
      await userRepo.setOnlineStatus(userId, true);
    } catch (err: any) {
      if (err?.code === "P2025") {
        console.warn(`[socket] User ${userId} not found in DB — disconnecting`);
        socket.disconnect();
        return;
      }
      throw err;
    }

    // Join all chat rooms this user belongs to
    const participations = await chatRepo.getUserChatIds(userId);
    for (const p of participations) {
      socket.join(`chat:${p.chatId}`);
    }

    // Cached block list — avoids DB hits on every typing event
    // Invalidated by settings service on block/unblock via Redis DEL
    const BLOCK_CACHE_TTL = 300; // 5 minutes
    const getBlockedUserIdsCached = async (): Promise<string[]> => {
      const redis = getRedis();
      const cacheKey = `blocked:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
      const blockedIds = await settingsRepo.getBlockedUserIds(userId);
      const blockedByIds = await settingsRepo.getBlockedByUserIds(userId);
      const allIds = [...new Set([...blockedIds, ...blockedByIds])];
      await redis.set(cacheKey, JSON.stringify(allIds), "EX", BLOCK_CACHE_TTL);
      return allIds;
    };

    const getBlockedSocketIds = async () => {
      const allIds = await getBlockedUserIdsCached();
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

        const { message, chatParticipants, chatType } = await chatService.sendMessage(
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
        type ParticipantWithKeys = {
          userId: string;
          encryptedGroupKey: string | null;
          user: { publicKey: string | null } | null;
        };
        const typedParticipants = chatParticipants as ParticipantWithKeys[];

        const offlineIds = typedParticipants
          .filter((cp) => cp.userId !== userId && !userSockets.has(cp.userId))
          .map((cp) => cp.userId);

        if (offlineIds.length > 0) {
          const pushTokens   = await userRepo.getPushTokensByUserIds(offlineIds);
          const senderPhone  = socket.userPhone;
          const fallbackBody = messagePreviewText(parsed.type ?? "text");
          const notifsMap   = await settingsRepo.getNotificationSettings(offlineIds);
          const isGroup      = chatType === "group";
          const senderPublicKey = typedParticipants.find((cp) => cp.userId === userId)?.user?.publicKey ?? null;

          for (const [recipientId, token] of pushTokens) {
            const notifSettings = notifsMap.get(recipientId);
            const notifEnabled  = isGroup
              ? (notifSettings?.groupNotifications ?? true)
              : (notifSettings?.messageNotifications ?? true);
            if (!notifEnabled) continue;

            const contact    = await contactRepo.findContact(recipientId, userId);
            const senderName = contact?.nickname ?? senderPhone;
            const previewOn  = notifSettings?.notificationPreview ?? true;

            const pushData: Record<string, string> = {
              chatId:       parsed.chatId,
              senderName,
              fallbackBody,
              messageType:  parsed.type ?? "text",
            };

            if (previewOn && parsed.type === "text" && message.content) {
              if (isGroup) {
                const encGroupKey = typedParticipants.find((cp) => cp.userId === recipientId)?.encryptedGroupKey ?? null;
                if (encGroupKey) {
                  pushData.encryptedContent  = message.content;
                  pushData.encryptedGroupKey = encGroupKey;
                  pushData.chatType          = "group";
                }
              } else if (senderPublicKey) {
                pushData.encryptedContent = message.content;
                pushData.senderPublicKey  = senderPublicKey;
                pushData.chatType         = "direct";
              }
            }

            sendPushNotification(token, pushData, {
              title: senderName,
              body: fallbackBody,
              sound: notifSettings?.notificationSound ?? true,
            });
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

    // --- Event: message:read (debounced per chat) ---
    const readDebounce = new Map<string, ReturnType<typeof setTimeout>>();
    socket.on("message:read", (data) => {
      if (isRateLimited(readThrottle, userId, 30, 60_000)) return;
      try {
        const parsed = markReadSchema.parse(data);
        // Debounce: coalesce rapid reads for the same chat (e.g. fast scrolling)
        const key = parsed.chatId;
        const existing = readDebounce.get(key);
        if (existing) clearTimeout(existing);
        readDebounce.set(key, setTimeout(async () => {
          readDebounce.delete(key);
          try {
            const participant = await chatRepo.findParticipant(parsed.chatId, userId);
            if (!participant) return;

            await chatRepo.markMessageRead(parsed.chatId, userId, parsed.messageId);

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
        }, 500));
      } catch {
        // Invalid schema
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

    // --- Event: call:initiate ---
    socket.on("call:initiate", async (data: {
      calleeId?: string;
      chatId?: string;
      type: string;
      isGroup?: boolean;
    }, ack) => {
      try {
        const redis = getRedis();
        const callType = data.type === "VIDEO" ? CallType.VIDEO : CallType.VOICE;

        if (data.isGroup && data.chatId) {
          // Group call
          const call = await callService.initiateGroupCall(userId, data.chatId, callType);
          const token = callService.generateAgoraToken(call.channelName, 0);

          // Notify all group members
          socket.to(`chat:${data.chatId}`).emit("call:incoming", {
            callId: call.id,
            channelName: call.channelName,
            callerId: userId,
            caller: call.caller,
            chatId: data.chatId,
            type: callType,
            isGroup: true,
          });

          await redis.set(`call:active:${userId}`, call.id, "EX", 3600);

          ack?.({ call, token, channelName: call.channelName });
        } else if (data.calleeId) {
          // 1-on-1 call
          const busyKey = await redis.get(`call:active:${data.calleeId}`);
          if (busyKey) {
            ack?.({ error: "User is busy", code: "BUSY" });
            return;
          }

          const call = await callService.initiateCall(userId, data.calleeId, data.chatId, callType);
          const token = callService.generateAgoraToken(call.channelName, 0);

          // Notify callee
          const calleeSockets = userSockets.get(data.calleeId);
          if (calleeSockets) {
            for (const sId of calleeSockets) {
              io.to(sId).emit("call:incoming", {
                callId: call.id,
                channelName: call.channelName,
                callerId: userId,
                caller: call.caller,
                chatId: data.chatId,
                type: callType,
                isGroup: false,
              });
            }
          }

          await redis.set(`call:active:${userId}`, call.id, "EX", 3600);

          // Auto-miss after 30 seconds if not answered
          setTimeout(async () => {
            try {
              const currentCall = await callRepo.findById(call.id);
              if (currentCall && currentCall.status === "RINGING") {
                await callService.missCall(call.id);
                await redis.del(`call:active:${userId}`);
                io.to(`user:${userId}`).emit("call:timeout", { callId: call.id });
                if (data.calleeId) {
                  io.to(`user:${data.calleeId}`).emit("call:timeout", { callId: call.id });
                }
              }
            } catch {
              // Ignore timeout errors
            }
          }, 30000);

          ack?.({ call, token, channelName: call.channelName });
        } else {
          ack?.({ error: "calleeId or chatId required" });
        }
      } catch (err) {
        logger.error({ err, userId }, "call:initiate failed");
        ack?.({ error: err instanceof Error ? err.message : "Failed to initiate call" });
      }
    });

    // --- Event: call:accept ---
    socket.on("call:accept", async (data: { callId: string }, ack) => {
      try {
        const redis = getRedis();
        const call = await callService.acceptCall(data.callId);
        const token = callService.generateAgoraToken(call.channelName, 1);

        await redis.set(`call:active:${userId}`, call.id, "EX", 3600);

        // Notify caller
        io.to(`user:${call.callerId}`).emit("call:accepted", {
          callId: call.id,
          calleeId: userId,
        });

        ack?.({ call, token, channelName: call.channelName });
      } catch (err) {
        logger.error({ err, userId }, "call:accept failed");
        ack?.({ error: err instanceof Error ? err.message : "Failed to accept call" });
      }
    });

    // --- Event: call:reject ---
    socket.on("call:reject", async (data: { callId: string }, ack) => {
      try {
        const call = await callService.rejectCall(data.callId);
        const redis = getRedis();
        await redis.del(`call:active:${call.callerId}`);

        io.to(`user:${call.callerId}`).emit("call:rejected", {
          callId: call.id,
          calleeId: userId,
        });

        ack?.({ success: true });
      } catch (err) {
        logger.error({ err, userId }, "call:reject failed");
        ack?.({ error: err instanceof Error ? err.message : "Failed to reject call" });
      }
    });

    // --- Event: call:hangup ---
    socket.on("call:hangup", async (data: { callId: string }, ack) => {
      try {
        const redis = getRedis();
        const endReason = EndReason.CALLER_HANGUP;
        const call = await callService.endCall(data.callId, endReason);

        await redis.del(`call:active:${userId}`);
        if (call.calleeId) await redis.del(`call:active:${call.calleeId}`);

        // Notify other party
        if (call.calleeId && call.calleeId !== userId) {
          io.to(`user:${call.calleeId}`).emit("call:ended", {
            callId: call.id,
            endReason,
          });
        }
        if (call.callerId !== userId) {
          io.to(`user:${call.callerId}`).emit("call:ended", {
            callId: call.id,
            endReason,
          });
        }

        // For group calls, notify the chat room
        if (call.chatId && !call.calleeId) {
          socket.to(`chat:${call.chatId}`).emit("call:ended", {
            callId: call.id,
            endReason,
          });
        }

        ack?.({ success: true, duration: call.duration });
      } catch (err) {
        logger.error({ err, userId }, "call:hangup failed");
        ack?.({ error: err instanceof Error ? err.message : "Failed to hang up" });
      }
    });

    // --- Event: call:busy ---
    socket.on("call:busy", async (data: { callId: string }, ack) => {
      try {
        const call = await callService.busyCall(data.callId);
        const redis = getRedis();
        await redis.del(`call:active:${call.callerId}`);

        io.to(`user:${call.callerId}`).emit("call:busy", {
          callId: call.id,
          calleeId: userId,
        });

        ack?.({ success: true });
      } catch (err) {
        logger.error({ err, userId }, "call:busy failed");
        ack?.({ error: err instanceof Error ? err.message : "Failed to report busy" });
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

          // Clean up active call on disconnect
          const disconnectRedis = getRedis();
          const activeCallId = await disconnectRedis.get(`call:active:${userId}`);
          if (activeCallId) {
            await disconnectRedis.del(`call:active:${userId}`);
            try {
              await callService.endCall(activeCallId, EndReason.NETWORK_ERROR);
            } catch {
              // Call may already be ended
            }
          }

          // Set user offline
          try {
            await userRepo.setOnlineStatus(userId, false);
          } catch (err: any) {
            if (err?.code === "P2025") {
              console.warn(`[socket] User ${userId} not found in DB — skipping offline update`);
            } else {
              throw err;
            }
          }

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
