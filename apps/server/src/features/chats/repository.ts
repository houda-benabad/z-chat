import { PrismaClient } from "@prisma/client";

const PARTICIPANT_USER_SELECT = {
  id: true,
  phone: true,
  name: true,
  avatar: true,
  isOnline: true,
  lastSeen: true,
  publicKey: true,
} as const;

export class ChatRepository {
  constructor(private prisma: PrismaClient) {}

  async findExistingDirectChat(userId: string, participantId: string) {
    return this.prisma.chat.findFirst({
      where: {
        type: "direct",
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: participantId } } },
        ],
      },
      include: {
        participants: {
          include: { user: { select: PARTICIPANT_USER_SELECT } },
        },
      },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createDirectChat(userId: string, participantId: string) {
    return this.prisma.chat.create({
      data: {
        type: "direct",
        participants: {
          create: [{ userId }, { userId: participantId }],
        },
      },
      include: {
        participants: {
          include: { user: { select: PARTICIPANT_USER_SELECT } },
        },
      },
    });
  }

  async findAllChatsForUser(userId: string, cursor?: string, limit = 25) {
    return this.prisma.chat.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: { select: PARTICIPANT_USER_SELECT },
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
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 5, // buffer for soft-deleted chats that get filtered out
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  }

  async findMessageById(id: string) {
    return this.prisma.message.findUnique({
      where: { id },
      select: { createdAt: true },
    });
  }

  async countUnreadMessages(
    chatId: string,
    userId: string,
    afterDate: Date,
  ) {
    return this.prisma.message.count({
      where: {
        chatId,
        senderId: { not: userId },
        createdAt: { gt: afterDate },
        isDeleted: false,
      },
    });
  }

  async findParticipant(chatId: string, userId: string) {
    return this.prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
  }

  async getChatType(chatId: string): Promise<string | null> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      select: { type: true },
    });
    return chat?.type ?? null;
  }

  async isBlockedBy(blockerId: string, blockedUserId: string): Promise<boolean> {
    const block = await this.prisma.blockedUser.findUnique({
      where: { userId_blockedUserId: { userId: blockerId, blockedUserId } },
    });
    return !!block;
  }

  async softDeleteChat(chatId: string, userId: string) {
    return this.prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { deletedAt: new Date() },
    });
  }

  async findMessages(
    chatId: string,
    limit: number,
    cursor: string | undefined,
    visibleAfter: Date | null,
  ) {
    return this.prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
        ...(visibleAfter ? { createdAt: { gt: visibleAfter } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        replyTo: {
          select: { id: true, content: true, senderId: true, type: true, isDeleted: true },
        },
      },
    });
  }

  async findChatParticipants(chatId: string) {
    return this.prisma.chatParticipant.findMany({
      where: { chatId },
      select: {
        userId: true,
        lastReadMessageId: true,
        encryptedGroupKey: true,
        groupKeyVersion: true,
        user: { select: PARTICIPANT_USER_SELECT },
      },
    });
  }

  async getUserChatIds(userId: string) {
    return this.prisma.chatParticipant.findMany({
      where: { userId },
      select: { chatId: true },
    });
  }

  async createMessage(data: {
    chatId: string;
    senderId: string;
    type: string;
    content?: string | null;
    mediaUrl?: string | null;
    replyToId?: string | null;
    disappearsAt?: Date | null;
  }) {
    if (data.replyToId) {
      const referenced = await this.prisma.message.findUnique({
        where: { id: data.replyToId },
        select: { chatId: true },
      });
      if (!referenced || referenced.chatId !== data.chatId) {
        data = { ...data, replyToId: null };
      }
    }

    return this.prisma.message.create({
      data: {
        chatId: data.chatId,
        senderId: data.senderId,
        type: data.type,
        content: data.content,
        mediaUrl: data.mediaUrl,
        replyToId: data.replyToId,
        disappearsAt: data.disappearsAt,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        replyTo: {
          select: { id: true, content: true, senderId: true, type: true, isDeleted: true },
        },
      },
    });
  }

  async updateChatTimestamp(chatId: string) {
    return this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });
  }

  async searchMessages(chatId: string, userId: string, query: string, limit = 30) {
    // Ensure user is a participant before searching
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!participant) return [];

    return this.prisma.message.findMany({
      where: {
        chatId,
        isDeleted: false,
        content: { contains: query, mode: 'insensitive' },
        ...(participant.deletedAt ? { createdAt: { gt: participant.deletedAt } } : {}),
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async softDeleteMessage(messageId: string, senderId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.senderId !== senderId) return null;
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: null, mediaUrl: null },
    });
  }

  async getSenderDisappearTimer(userId: string): Promise<number> {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { defaultDisappearTimer: true },
    });
    return settings?.defaultDisappearTimer ?? 0;
  }

  async markMessageRead(chatId: string, userId: string, messageId: string) {
    return this.prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { lastReadMessageId: messageId },
    });
  }

  async deleteExpiredMessages() {
    const now = new Date();
    const expiredIds = await this.prisma.message.findMany({
      where: { disappearsAt: { lt: now } },
      select: { id: true },
    });
    if (expiredIds.length > 0) {
      const ids = expiredIds.map((m: { id: string }) => m.id);
      await this.prisma.message.updateMany({
        where: { replyToId: { in: ids } },
        data: { replyToId: null },
      });
    }
    return this.prisma.message.deleteMany({
      where: { disappearsAt: { lt: now } },
    });
  }
}
