import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { GroupRepository } from "./repository";
import { AppError } from "../../shared/utils/errors";

export class GroupService {
  constructor(
    private repo: GroupRepository,
    private getIO: () => Server | null,
    private prisma: PrismaClient,
  ) {}

  async createGroup(
    userId: string,
    data: { name: string; description?: string; avatar?: string; memberIds: string[] },
  ) {
    const uniqueMemberIds = [...new Set(data.memberIds.filter((id) => id !== userId))];

    const members = await this.repo.findUsersByIds(uniqueMemberIds);
    if (members.length !== uniqueMemberIds.length) {
      throw new AppError(400, "One or more members not found", "INVALID_MEMBERS");
    }

    const chat = await this.repo.createGroup({
      name: data.name,
      description: data.description ?? null,
      avatar: data.avatar ?? null,
      createdBy: userId,
      memberIds: uniqueMemberIds,
    });

    // Notify all members (including creator) via their personal socket rooms
    const io = this.getIO();
    if (io) {
      for (const p of chat.participants) {
        io.to(`user:${p.userId}`).emit("chat:new", { chatId: chat.id });
        const sockets = await io.in(`user:${p.userId}`).fetchSockets();
        for (const s of sockets) {
          s.join(`chat:${chat.id}`);
        }
      }
    }

    return chat;
  }

  async getGroup(userId: string, chatId: string) {
    const chat = await this.repo.findGroupById(chatId);

    if (!chat || chat.type !== "group") {
      throw new AppError(404, "Group not found", "NOT_FOUND");
    }

    type Participant = (typeof chat.participants)[number];
    const myParticipantEntry = chat.participants.find((p: Participant) => p.userId === userId);
    if (!myParticipantEntry) {
      throw new AppError(403, "Not a member of this group", "FORBIDDEN");
    }

    let creator = null;
    if (chat.createdBy) {
      creator = await this.repo.findUserById(chat.createdBy);
    }

    return {
      id: chat.id,
      name: chat.name,
      description: chat.description,
      avatar: chat.avatar,
      createdBy: chat.createdBy,
      creator,
      createdAt: chat.createdAt,
      participants: chat.participants.map((p: Participant) => ({
        ...p,
        encryptedGroupKey: p.userId === userId ? p.encryptedGroupKey : undefined,
      })),
      memberCount: chat.participants.length,
      myEncryptedGroupKey: myParticipantEntry.encryptedGroupKey,
      groupKeyVersion: myParticipantEntry.groupKeyVersion,
    };
  }

  async updateGroup(
    userId: string,
    chatId: string,
    data: { name?: string; description?: string | null; avatar?: string | null },
  ) {
    const participant = await this.repo.findParticipant(chatId, userId);
    if (!participant) {
      throw new AppError(403, "Not a member of this group", "FORBIDDEN");
    }
    if (participant.role !== "admin") {
      throw new AppError(403, "Only admins can update group details", "FORBIDDEN");
    }

    const chat = await this.repo.updateGroup(chatId, data);

    const io = this.getIO();
    if (io) {
      io.to(`chat:${chatId}`).emit("group:updated", {
        chatId,
        name: chat.name,
        description: chat.description,
        avatar: chat.avatar,
      });
    }

    return chat;
  }

  async addMembers(userId: string, chatId: string, memberIds: string[]) {
    const myParticipant = await this.repo.findParticipant(chatId, userId);
    if (!myParticipant) {
      throw new AppError(403, "Not a member of this group", "FORBIDDEN");
    }
    if (myParticipant.role !== "admin") {
      throw new AppError(403, "Only admins can add members", "FORBIDDEN");
    }

    const chat = await this.repo.findGroupById(chatId);
    if (!chat || chat.type !== "group") {
      throw new AppError(404, "Group not found", "NOT_FOUND");
    }

    const existing = await this.repo.findExistingParticipants(chatId, memberIds);
    const existingIds = new Set(existing.map((p: { userId: string }) => p.userId));
    const newIds = memberIds.filter((id) => !existingIds.has(id));

    if (chat.participants.length + newIds.length > 256) {
      throw new AppError(400, "Group cannot exceed 256 members", "GROUP_FULL");
    }

    if (newIds.length > 0) {
      const users = await this.repo.findUsersByIds(newIds);
      if (users.length !== newIds.length) {
        throw new AppError(400, "One or more users not found", "INVALID_MEMBERS");
      }
      await this.repo.addParticipants(chatId, newIds);
    }

    const updatedChat = await this.repo.findGroupWithParticipants(chatId);

    const io = this.getIO();
    if (io && newIds.length > 0) {
      for (const id of newIds) {
        const sockets = await io.in(`user:${id}`).fetchSockets();
        for (const s of sockets) {
          s.join(`chat:${chatId}`);
        }
        io.to(`user:${id}`).emit("chat:new", { chatId });
      }
      io.to(`chat:${chatId}`).emit("group:member:added", { chatId, memberIds: newIds });
    }

    return updatedChat;
  }

  async removeMember(userId: string, chatId: string, targetUserId: string) {
    const myParticipant = await this.repo.findParticipant(chatId, userId);
    if (!myParticipant) {
      throw new AppError(403, "Not a member of this group", "FORBIDDEN");
    }

    const isSelf = userId === targetUserId;
    if (!isSelf && myParticipant.role !== "admin") {
      throw new AppError(403, "Only admins can remove members", "FORBIDDEN");
    }

    const targetParticipant = await this.repo.findParticipant(chatId, targetUserId);
    if (!targetParticipant) {
      throw new AppError(404, "Member not found in this group", "NOT_FOUND");
    }

    await this.repo.removeParticipant(chatId, targetUserId);

    // If the removed member was the last admin, promote oldest remaining member
    if (targetParticipant.role === "admin") {
      const remainingAdmins = await this.repo.countAdmins(chatId);
      if (remainingAdmins === 0) {
        const oldest = await this.repo.findOldestParticipant(chatId);
        if (oldest) {
          await this.repo.promoteToAdmin(oldest.id);
        }
      }
    }

    const io = this.getIO();
    if (io) {
      io.to(`chat:${chatId}`).emit("group:member:removed", { chatId, userId: targetUserId });
      // Signal remaining members that group key rotation is needed
      io.to(`chat:${chatId}`).emit("group:key_rotation_needed", { chatId });
    }

    return isSelf ? "Left group" : "Member removed";
  }

  async distributeGroupKeys(
    userId: string,
    chatId: string,
    keys: { userId: string; encryptedKey: string }[],
    version: number,
  ) {
    const myParticipant = await this.repo.findParticipant(chatId, userId);
    if (!myParticipant) {
      throw new AppError(403, "Not a member of this group", "FORBIDDEN");
    }
    if (myParticipant.role !== "admin") {
      throw new AppError(403, "Only admins can distribute group keys", "FORBIDDEN");
    }

    const validParticipants = await this.repo.findValidParticipants(
      chatId,
      keys.map((k) => k.userId),
    );
    const validIds = new Set(validParticipants.map((p: { userId: string }) => p.userId));
    const filteredKeys = keys.filter((k) => validIds.has(k.userId));

    await this.prisma.$transaction(
      filteredKeys.map((k) =>
        this.prisma.chatParticipant.update({
          where: { chatId_userId: { chatId, userId: k.userId } },
          data: { encryptedGroupKey: k.encryptedKey, groupKeyVersion: version },
        }),
      ),
    );

    const io = this.getIO();
    if (io) {
      io.to(`chat:${chatId}`).emit("group:key_updated", { chatId, version });
    }

    return version;
  }

  async updateMemberRole(
    userId: string,
    chatId: string,
    targetUserId: string,
    role: "admin" | "member",
  ) {
    const myParticipant = await this.repo.findParticipant(chatId, userId);
    if (!myParticipant || myParticipant.role !== "admin") {
      throw new AppError(403, "Only admins can update member roles", "FORBIDDEN");
    }

    const targetParticipant = await this.repo.findParticipant(chatId, targetUserId);
    if (!targetParticipant) {
      throw new AppError(404, "Member not found in this group", "NOT_FOUND");
    }

    const updated = await this.repo.updateParticipantRole(chatId, targetUserId, role);

    const io = this.getIO();
    if (io) {
      io.to(`chat:${chatId}`).emit("group:member:role:updated", {
        chatId,
        userId: targetUserId,
        role,
      });
    }

    return updated;
  }
}
