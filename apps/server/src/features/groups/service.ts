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

  private async createSystemMessage(
    chatId: string,
    senderId: string,
    eventContent: object,
  ): Promise<void> {
    try {
      const sysMsg = await this.prisma.message.create({
        data: {
          chatId,
          senderId,
          type: "system",
          content: JSON.stringify(eventContent),
          mediaUrl: null,
          replyToId: null,
          isForwarded: false,
          isDeleted: false,
          disappearsAt: null,
        },
        include: { sender: { select: { id: true, name: true, avatar: true } } },
      });
      this.getIO()?.to(`chat:${chatId}`).emit("message:new", sysMsg);
    } catch {
      // system message failure must not break the main operation
    }
  }

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

    const actor = await this.repo.findUserById(userId);
    await this.createSystemMessage(chat.id, userId, {
      event: "group_created",
      actorId: userId,
      actorName: actor?.name ?? actor?.phone ?? null,
    });

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

    const actor = await this.repo.findUserById(userId);
    const actorName = actor?.name ?? actor?.phone ?? null;
    if (data.name !== undefined) {
      await this.createSystemMessage(chatId, userId, {
        event: "name_changed",
        actorId: userId,
        actorName,
        newName: chat.name,
      });
    }
    if (data.avatar !== undefined && data.name === undefined) {
      await this.createSystemMessage(chatId, userId, {
        event: "icon_changed",
        actorId: userId,
        actorName,
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

    if (newIds.length > 0) {
      const actor = await this.repo.findUserById(userId);
      const members = await this.repo.findUsersWithNames(newIds);
      const memberNames = newIds.map((id) => {
        const m = members.find((u) => u.id === id);
        return m?.name ?? m?.phone ?? null;
      });
      await this.createSystemMessage(chatId, userId, {
        event: "members_added",
        actorId: userId,
        actorName: actor?.name ?? actor?.phone ?? null,
        memberIds: newIds,
        memberNames,
      });
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
      // Kick removed user from the chat socket room (after they receive the removal event)
      try {
        const sockets = await io.in(`user:${targetUserId}`).fetchSockets();
        for (const s of sockets) {
          s.leave(`chat:${chatId}`);
        }
      } catch {}
    }

    const actor = await this.repo.findUserById(userId);
    if (isSelf) {
      await this.createSystemMessage(chatId, userId, {
        event: "member_left",
        actorId: userId,
        actorName: actor?.name ?? actor?.phone ?? null,
      });
    } else {
      const target = await this.repo.findUserById(targetUserId);
      await this.createSystemMessage(chatId, userId, {
        event: "member_removed",
        actorId: userId,
        actorName: actor?.name ?? actor?.phone ?? null,
        targetId: targetUserId,
        targetName: target?.name ?? target?.phone ?? null,
      });
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

    const actor = await this.repo.findUserById(userId);
    const target = await this.repo.findUserById(targetUserId);
    await this.createSystemMessage(chatId, userId, {
      event: "role_updated",
      actorId: userId,
      actorName: actor?.name ?? actor?.phone ?? null,
      targetId: targetUserId,
      targetName: target?.name ?? target?.phone ?? null,
      role,
    });

    return updated;
  }
}
