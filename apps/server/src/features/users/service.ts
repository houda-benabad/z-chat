import { UserRepository } from "./repository";
import { AppError } from "../../shared/utils/errors";

export class UserService {
  constructor(private repo: UserRepository) {}

  async getMe(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }
    return user;
  }

  async getUserById(id: string, requesterId: string) {
    const user = await this.repo.findByIdPublic(id);
    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    const isSelf = requesterId === id;
    if (isSelf) {
      const { settings: _s, ...rest } = user;
      return rest;
    }

    // Bidirectional: hide if either side has blocked the other (WhatsApp behavior)
    const isBlockedByTarget = await this.repo.isBlockedBy(id, requesterId);
    const hasBlockedTarget = await this.repo.isBlockedBy(requesterId, id);
    if (isBlockedByTarget || hasBlockedTarget) {
      const { settings: _s, isOnline: _o, lastSeen: _l, ...base } = user;
      return {
        ...base,
        isOnline: false,
        lastSeen: null,
        avatar: null,
        about: null,
      };
    }

    const settings = user.settings;
    const isContact = settings ? await this.repo.isContact(requesterId, id) : false;

    const canSee = (visibility: string | undefined) => {
      if (!visibility || visibility === "everyone") return true;
      if (visibility === "contacts") return isContact;
      return false; // "nobody"
    };

    const { settings: _s, ...base } = user;
    return {
      ...base,
      lastSeen: canSee(settings?.lastSeenVisibility) ? user.lastSeen : null,
      isOnline: canSee(settings?.lastSeenVisibility) ? user.isOnline : false,
      avatar: canSee(settings?.profilePhotoVisibility) ? user.avatar : null,
      about: canSee(settings?.aboutVisibility) ? user.about : null,
    };
  }

  async searchByPhone(phone: string, requesterId: string) {
    if (!phone) {
      throw new AppError(400, "Phone query parameter required", "MISSING_PHONE");
    }
    const user = await this.repo.findByPhone(phone);
    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }
    // Reuse getUserById so privacy settings are respected
    return this.getUserById(user.id, requesterId);
  }

  async updateProfile(userId: string, data: { name?: string; about?: string; avatar?: string | null }) {
    return this.repo.updateProfile(userId, data);
  }

  async updatePublicKey(userId: string, publicKey: string) {
    return this.repo.updatePublicKey(userId, publicKey);
  }

  async savePushToken(userId: string, pushToken: string | null) {
    return this.repo.updatePushToken(userId, pushToken);
  }
}
