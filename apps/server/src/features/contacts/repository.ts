import { PrismaClient } from "@prisma/client";

const CONTACT_USER_SELECT = {
  id: true,
  phone: true,
  name: true,
  avatar: true,
  about: true,
  isOnline: true,
  lastSeen: true,
} as const;

export class ContactRepository {
  constructor(private prisma: PrismaClient) {}

  async findUserByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
  }

  async findContact(userId: string, contactUserId: string) {
    return this.prisma.contact.findUnique({
      where: { userId_contactUserId: { userId, contactUserId } },
    });
  }

  async findContactById(id: string) {
    return this.prisma.contact.findUnique({ where: { id } });
  }

  async findContactWithUser(id: string) {
    return this.prisma.contact.findUnique({
      where: { id },
      include: { contactUser: { select: CONTACT_USER_SELECT } },
    });
  }

  async updateContactNickname(id: string, nickname: string | undefined) {
    return this.prisma.contact.update({
      where: { id },
      data: { nickname },
      include: { contactUser: { select: CONTACT_USER_SELECT } },
    });
  }

  async createContact(userId: string, contactUserId: string, nickname?: string) {
    return this.prisma.contact.create({
      data: { userId, contactUserId, nickname },
      include: { contactUser: { select: CONTACT_USER_SELECT } },
    });
  }

  async findAllContacts(userId: string, skip = 0, limit = 50) {
    return this.prisma.contact.findMany({
      where: { userId },
      include: { contactUser: { select: CONTACT_USER_SELECT } },
      orderBy: [{ contactUser: { name: "asc" } }, { createdAt: "asc" }],
      skip,
      take: limit + 1,
    });
  }

  async deleteContact(id: string) {
    return this.prisma.contact.delete({ where: { id } });
  }

  async findRegisteredUsers(phones: string[], excludeUserId: string) {
    return this.prisma.user.findMany({
      where: {
        phone: { in: phones },
        id: { not: excludeUserId },
      },
      select: { id: true, phone: true, name: true, avatar: true, isOnline: true, lastSeen: true },
    });
  }

  async bulkCreateContacts(userId: string, contactUserIds: string[]) {
    const result = await this.prisma.contact.createMany({
      data: contactUserIds.map((contactUserId) => ({
        userId,
        contactUserId,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async findExistingContactIds(userId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { userId },
      select: { contactUserId: true },
    });
    return new Set(contacts.map((c: { contactUserId: string }) => c.contactUserId));
  }
}
