import { SettingsRepository } from "./repository";
import { AppError } from "../../shared/utils/errors";
import { getIO } from "../../socket";

export class SettingsService {
  constructor(private repo: SettingsRepository) {}

  async getSettings(userId: string) {
    return this.repo.getOrCreateSettings(userId);
  }

  async updatePrivacy(userId: string, data: Record<string, unknown>) {
    return this.repo.upsertSettings(userId, data);
  }

  async updateNotifications(userId: string, data: Record<string, unknown>) {
    return this.repo.upsertSettings(userId, data);
  }

  async updateAppearance(userId: string, data: Record<string, unknown>) {
    return this.repo.upsertSettings(userId, data);
  }

  async updateStorage(userId: string, data: Record<string, unknown>) {
    return this.repo.upsertSettings(userId, data);
  }

  async getBlockedUsers(userId: string, skip = 0, limit = 20) {
    const rows = await this.repo.findBlockedUsers(userId, skip, limit);
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    return { blocked: rows, hasMore };
  }

  async blockUser(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new AppError(400, "Cannot block yourself", "INVALID_TARGET");
    }

    const target = await this.repo.findUserById(targetId);
    if (!target) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    await this.repo.blockUser(userId, targetId);

    // Immediately hide presence for both parties (bidirectional, like WhatsApp)
    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit("user:offline", { userId: targetId, lastSeen: null });
      io.to(`user:${targetId}`).emit("user:offline", { userId, lastSeen: null });
    }
  }

  async unblockUser(userId: string, blockedUserId: string) {
    await this.repo.unblockUser(userId, blockedUserId);

    // Restore presence if no reverse block exists
    const reverseBlocked = await this.repo.isBlockedBy(blockedUserId, userId);
    if (!reverseBlocked) {
      const io = getIO();
      if (io) {
        const [unblockedIsOnline, unblockerIsOnline] = await Promise.all([
          this.repo.isUserOnline(blockedUserId),
          this.repo.isUserOnline(userId),
        ]);
        if (unblockedIsOnline) {
          io.to(`user:${userId}`).emit("user:online", { userId: blockedUserId });
        }
        if (unblockerIsOnline) {
          io.to(`user:${blockedUserId}`).emit("user:online", { userId });
        }
      }
    }
  }

  async deleteAccount(userId: string, confirmation: string) {
    if (confirmation.trim() !== "DELETE MY ACCOUNT") {
      throw new AppError(400, "Invalid confirmation", "INVALID_CONFIRMATION");
    }
    await this.repo.deleteAccount(userId);
  }
}
