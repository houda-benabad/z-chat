import { ChatRepository } from "./repository";
import { AppError } from "../../shared/utils/errors";
import { getIO } from "../../socket";
import type { Redis } from "ioredis";

export class ChatService {
  constructor(private repo: ChatRepository) {}

  async createOrGetDirectChat(userId: string, participantId: string) {
    if (participantId === userId) {
      throw new AppError(400, "Cannot create chat with yourself", "INVALID_PARTICIPANT");
    }

    const participant = await this.repo.findUserById(participantId);
    if (!participant) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    // Reject if the target has blocked the requester (they cannot initiate contact)
    const isBlocked = await this.repo.isBlockedBy(participantId, userId);
    if (isBlocked) {
      throw new AppError(403, "You cannot message this user", "BLOCKED");
    }

    const existingChat = await this.repo.findExistingDirectChat(userId, participantId);
    if (existingChat) {
      return { chat: existingChat, created: false };
    }

    const chat = await this.repo.createDirectChat(userId, participantId);
    return { chat, created: true };
  }

  async listChats(userId: string, cursor?: string, limit = 25) {
    const rows = await this.repo.findAllChatsForUser(userId, cursor, limit);

    const chatsWithMeta = await Promise.all(
      rows.map(async (chat: (typeof rows)[number]) => {
        const myParticipant = chat.participants.find((p: { userId: string }) => p.userId === userId);
        const deletedAt = myParticipant?.deletedAt ?? null;

        // Hide chat if user deleted it and no new messages have arrived since
        if (deletedAt && chat.updatedAt <= deletedAt) return null;

        const lastReadId = myParticipant?.lastReadMessageId;
        const visibleSince = deletedAt ?? new Date(0);

        let unreadCount = 0;
        if (lastReadId) {
          const lastReadMsg = await this.repo.findMessageById(lastReadId);
          if (lastReadMsg) {
            // Use the later of lastRead or deletedAt so deleted chats don't
            // re-surface old unread counts when new messages arrive
            const cutoff =
              lastReadMsg.createdAt > visibleSince ? lastReadMsg.createdAt : visibleSince;
            unreadCount = await this.repo.countUnreadMessages(chat.id, userId, cutoff);
          }
        } else {
          unreadCount = await this.repo.countUnreadMessages(chat.id, userId, visibleSince);
        }

        // Only show the last message if it arrived after the deletion
        const lastMessage =
          chat.messages[0] && (!deletedAt || new Date(chat.messages[0].createdAt) > deletedAt)
            ? chat.messages[0]
            : null;

        return {
          id: chat.id,
          type: chat.type,
          name: chat.name ?? null,
          avatar: chat.avatar ?? null,
          description: chat.description ?? null,
          createdBy: chat.createdBy ?? null,
          participants: chat.participants,
          lastMessage,
          unreadCount,
          isPinned: myParticipant?.isPinned ?? false,
          updatedAt: chat.updatedAt,
        };
      }),
    );

    const filtered = chatsWithMeta.filter(Boolean) as NonNullable<
      (typeof chatsWithMeta)[number]
    >[];

    // Sort: pinned first, then by updatedAt
    filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    // We fetched limit+5 rows as a buffer; hasMore is true when we got enough
    // rows to fill the page (meaning there are likely more beyond the buffer)
    const hasMore = rows.length > limit;
    const nextCursor = hasMore && filtered.length > 0
      ? filtered[filtered.length - 1]!.id
      : null;

    return { chats: filtered.slice(0, limit), hasMore, nextCursor };
  }

  async deleteChat(userId: string, chatId: string) {
    const participant = await this.repo.findParticipant(chatId, userId);
    if (!participant) {
      throw new AppError(403, "Not a participant of this chat", "FORBIDDEN");
    }
    await this.repo.softDeleteChat(chatId, userId);
  }

  async sendMessage(
    data: {
      chatId: string;
      senderId: string;
      type: string;
      content?: string | null;
      mediaUrl?: string | null;
      replyToId?: string | null;
    },
    redis: Redis,
    onlineUserIds: Set<string>,
  ) {
    const participant = await this.repo.findParticipant(data.chatId, data.senderId);
    if (!participant) {
      throw new AppError(403, "Not a participant of this chat", "FORBIDDEN");
    }

    // Block enforcement: for direct chats, reject if any recipient has blocked the sender
    const chatType = await this.repo.getChatType(data.chatId);
    if (chatType === "direct") {
      const participants = await this.repo.findChatParticipants(data.chatId);
      for (const cp of participants) {
        if (cp.userId !== data.senderId) {
          const blocked = await this.repo.isBlockedBy(cp.userId, data.senderId);
          if (blocked) {
            throw new AppError(403, "You cannot message this user", "BLOCKED");
          }
        }
      }
    }

    const timerSeconds = await this.repo.getSenderDisappearTimer(data.senderId);
    const disappearsAt = timerSeconds > 0 ? new Date(Date.now() + timerSeconds * 1000) : null;

    const message = await this.repo.createMessage({ ...data, disappearsAt });
    await this.repo.updateChatTimestamp(data.chatId);

    const chatParticipants = await this.repo.findChatParticipants(data.chatId);

    // Queue messages for offline participants (24-hour TTL to prevent memory leak)
    for (const cp of chatParticipants) {
      if (cp.userId !== data.senderId && !onlineUserIds.has(cp.userId)) {
        const offlineKey = `offline:${cp.userId}`;
        await redis.lpush(offlineKey, JSON.stringify(message));
        await redis.expire(offlineKey, 86400);
      }
    }

    return { message, chatParticipants };
  }

  async searchMessages(userId: string, chatId: string, query: string) {
    return this.repo.searchMessages(chatId, userId, query);
  }

  async deleteMessage(userId: string, chatId: string, messageId: string) {
    const participant = await this.repo.findParticipant(chatId, userId);
    if (!participant) {
      throw new AppError(403, "Not a participant of this chat", "FORBIDDEN");
    }
    const updated = await this.repo.softDeleteMessage(messageId, userId);
    if (!updated) {
      throw new AppError(403, "Cannot delete this message", "FORBIDDEN");
    }
    getIO()?.to(`chat:${chatId}`).emit("message:deleted", { chatId, messageId });
    return updated;
  }

  async starMessage(userId: string, chatId: string, messageId: string) {
    const participant = await this.repo.findParticipant(chatId, userId);
    if (!participant) {
      throw new AppError(403, "Not a participant of this chat", "FORBIDDEN");
    }
    return this.repo.starMessage(userId, messageId);
  }

  async unstarMessage(userId: string, chatId: string, messageId: string) {
    const participant = await this.repo.findParticipant(chatId, userId);
    if (!participant) {
      throw new AppError(403, "Not a participant of this chat", "FORBIDDEN");
    }
    await this.repo.unstarMessage(userId, messageId);
  }

  async getStarredMessages(userId: string, cursor?: string, limit = 25) {
    const rows = await this.repo.findStarredMessages(userId, cursor, limit);
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();

    // Sanitize: per message, expose only the requesting user's encryptedGroupKey
    // and the other participant's publicKey (for direct chat decryption)
    const starredMessages = rows.map((row: (typeof rows)[number]) => {
      const chat = row.message.chat as any;
      const participants = chat.participants ?? [];

      let encryptedGroupKey: string | null = null;
      let recipientPublicKey: string | null = null;

      if (chat.type === "group") {
        const myEntry = participants.find((p: any) => p.userId === userId);
        encryptedGroupKey = myEntry?.encryptedGroupKey ?? null;
      } else {
        const other = participants.find((p: any) => p.userId !== userId);
        recipientPublicKey = other?.user?.publicKey ?? null;
      }

      // Strip participants from the response — only return the derived keys
      const { participants: _p, ...chatWithoutParticipants } = chat;

      return {
        ...row,
        message: {
          ...row.message,
          chat: chatWithoutParticipants,
        },
        encryptedGroupKey,
        recipientPublicKey,
      };
    });

    return {
      starredMessages,
      hasMore,
      nextCursor: hasMore && starredMessages.length > 0 ? starredMessages[starredMessages.length - 1]!.id : null,
    };
  }

  async getStarredMessageIdsForChat(userId: string, chatId: string) {
    const participant = await this.repo.findParticipant(chatId, userId);
    if (!participant) {
      throw new AppError(403, "Not a participant of this chat", "FORBIDDEN");
    }
    return this.repo.findStarredMessageIdsForChat(userId, chatId);
  }

  async getMessages(
    userId: string,
    chatId: string,
    limit: number,
    cursor: string | undefined,
  ) {
    const participant = await this.repo.findParticipant(chatId, userId);
    if (!participant) {
      throw new AppError(403, "Not a participant of this chat", "FORBIDDEN");
    }

    // If the user previously deleted this chat but is now viewing it again,
    // clear the deletion so old messages and read receipts are fully restored.
    if (participant.deletedAt) {
      await this.repo.clearDeletedAt(chatId, userId);
    }

    const messages = await this.repo.findMessages(
      chatId,
      limit,
      cursor,
      null,
    );

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Strip replyTo for deleted messages to avoid leaking senderId/content
    type RawMessage = (typeof messages)[number];
    const sanitizedMessages = messages.map((msg: RawMessage) => ({
      ...msg,
      replyTo: msg.replyTo?.isDeleted ? null : msg.replyTo,
    }));

    const participants = await this.repo.findChatParticipants(chatId);

    // Only expose each participant's own encrypted group key — never expose others'
    const sanitizedParticipants = participants.map((p: (typeof participants)[number]) => ({
      userId: p.userId,
      lastReadMessageId: p.lastReadMessageId,
      encryptedGroupKey: p.userId === userId ? p.encryptedGroupKey : undefined,
      groupKeyVersion: p.userId === userId ? p.groupKeyVersion : undefined,
      user: p.user,
    }));

    return {
      messages: sanitizedMessages,
      nextCursor: hasMore ? sanitizedMessages[sanitizedMessages.length - 1]?.id : null,
      participants: sanitizedParticipants,
    };
  }
}
