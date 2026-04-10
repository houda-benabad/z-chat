import { PrismaClient, Prisma } from "@prisma/client";

export class SettingsRepository {
  constructor(private prisma: PrismaClient) {}

  async getOrCreateSettings(userId: string) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async upsertSettings(userId: string, data: Record<string, unknown>) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }

  async getBlockedUserIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.blockedUser.findMany({
      where: { userId },
      select: { blockedUserId: true },
    });
    return rows.map((r) => r.blockedUserId);
  }

  async findBlockedUsers(userId: string, skip = 0, limit = 20) {
    return this.prisma.blockedUser.findMany({
      where: { userId },
      include: {
        blockedUser: {
          select: { id: true, phone: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit + 1,
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async blockUser(userId: string, blockedUserId: string) {
    return this.prisma.blockedUser.upsert({
      where: { userId_blockedUserId: { userId, blockedUserId } },
      create: { userId, blockedUserId },
      update: {},
    });
  }

  async unblockUser(userId: string, blockedUserId: string) {
    return this.prisma.blockedUser.deleteMany({
      where: { userId, blockedUserId },
    });
  }

  async deleteAccount(userId: string) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Null out reply references that point to this user's messages so FK constraints don't block deletion
      const userMessageIds = await tx.message.findMany({
        where: { senderId: userId },
        select: { id: true },
      });
      if (userMessageIds.length > 0) {
        await tx.message.updateMany({
          where: { replyToId: { in: userMessageIds.map((m: { id: string }) => m.id) } },
          data: { replyToId: null },
        });
      }
      // Delete the user's sent messages
      await tx.message.deleteMany({ where: { senderId: userId } });
      // Delete the user — DB cascades handle: refresh tokens, chat participants,
      // contacts, blocked relationships, and user settings
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
