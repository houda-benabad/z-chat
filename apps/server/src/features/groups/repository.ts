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

export class GroupRepository {
  constructor(private prisma: PrismaClient) {}

  async findUsersByIds(ids: string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
  }

  async createGroup(data: {
    name: string;
    description?: string | null;
    avatar?: string | null;
    createdBy: string;
    memberIds: string[];
  }) {
    return this.prisma.chat.create({
      data: {
        type: "group",
        name: data.name,
        description: data.description ?? null,
        avatar: data.avatar ?? null,
        createdBy: data.createdBy,
        participants: {
          create: [
            { userId: data.createdBy, role: "admin" },
            ...data.memberIds.map((id) => ({ userId: id, role: "member" })),
          ],
        },
      },
      include: {
        participants: {
          include: { user: { select: PARTICIPANT_USER_SELECT } },
        },
      },
    });
  }

  async findGroupById(chatId: string) {
    return this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: { user: { select: PARTICIPANT_USER_SELECT } },
        },
      },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true },
    });
  }

  async findParticipant(chatId: string, userId: string) {
    return this.prisma.chatParticipant.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
  }

  async updateGroup(
    chatId: string,
    data: { name?: string; description?: string | null; avatar?: string | null },
  ) {
    return this.prisma.chat.update({
      where: { id: chatId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
      },
      include: {
        participants: {
          include: { user: { select: PARTICIPANT_USER_SELECT } },
        },
      },
    });
  }

  async findExistingParticipants(chatId: string, userIds: string[]) {
    return this.prisma.chatParticipant.findMany({
      where: { chatId, userId: { in: userIds } },
      select: { userId: true },
    });
  }

  async addParticipants(chatId: string, userIds: string[]) {
    return this.prisma.chatParticipant.createMany({
      data: userIds.map((id) => ({ chatId, userId: id, role: "member" })),
    });
  }

  async findGroupWithParticipants(chatId: string) {
    return this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: { user: { select: PARTICIPANT_USER_SELECT } },
        },
      },
    });
  }

  async removeParticipant(chatId: string, userId: string) {
    return this.prisma.chatParticipant.delete({
      where: { chatId_userId: { chatId, userId } },
    });
  }

  async countAdmins(chatId: string) {
    return this.prisma.chatParticipant.count({
      where: { chatId, role: "admin" },
    });
  }

  async findOldestParticipant(chatId: string) {
    return this.prisma.chatParticipant.findFirst({
      where: { chatId },
      orderBy: { joinedAt: "asc" },
    });
  }

  async promoteToAdmin(participantId: string) {
    return this.prisma.chatParticipant.update({
      where: { id: participantId },
      data: { role: "admin" },
    });
  }

  async findValidParticipants(chatId: string, userIds: string[]) {
    return this.prisma.chatParticipant.findMany({
      where: { chatId, userId: { in: userIds } },
      select: { userId: true },
    });
  }

  async updateGroupKey(chatId: string, userId: string, encryptedKey: string, version: number) {
    return this.prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { encryptedGroupKey: encryptedKey, groupKeyVersion: version },
    });
  }

  async updateParticipantRole(chatId: string, userId: string, role: "admin" | "member") {
    return this.prisma.chatParticipant.update({
      where: { chatId_userId: { chatId, userId } },
      data: { role },
      include: { user: { select: PARTICIPANT_USER_SELECT } },
    });
  }
}
