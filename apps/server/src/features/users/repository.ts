import { PrismaClient } from "@prisma/client";

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, phone: true, name: true, about: true, avatar: true, createdAt: true },
    });
  }

  async findByIdPublic(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, phone: true, name: true, about: true, avatar: true,
        isOnline: true, lastSeen: true, publicKey: true,
        settings: {
          select: {
            lastSeenVisibility: true,
            profilePhotoVisibility: true,
            aboutVisibility: true,
          },
        },
      },
    });
  }

  async isContact(requesterId: string, targetId: string): Promise<boolean> {
    const contact = await this.prisma.contact.findFirst({
      where: { userId: targetId, contactUserId: requesterId },
    });
    return contact !== null;
  }

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
      select: { id: true, phone: true, name: true, avatar: true, isOnline: true, lastSeen: true, publicKey: true },
    });
  }

  async updateProfile(id: string, data: { name?: string; about?: string; avatar?: string }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, phone: true, name: true, about: true, avatar: true, createdAt: true },
    });
  }

  async updatePublicKey(id: string, publicKey: string) {
    return this.prisma.user.update({
      where: { id },
      data: { publicKey },
      select: { id: true, publicKey: true },
    });
  }

  async setOnlineStatus(id: string, isOnline: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isOnline, lastSeen: new Date() },
    });
  }

  async updatePushToken(id: string, pushToken: string | null) {
    return this.prisma.user.update({
      where: { id },
      data: { pushToken },
      select: { id: true },
    });
  }

  async getPushTokensByUserIds(ids: string[]): Promise<Map<string, string>> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, pushToken: { not: null } },
      select: { id: true, pushToken: true },
    });
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.pushToken) map.set(u.id, u.pushToken);
    }
    return map;
  }
}
