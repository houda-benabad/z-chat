import { ContactRepository } from "./repository";
import { AppError } from "../../shared/utils/errors";

export class ContactService {
  constructor(private repo: ContactRepository) {}

  async checkContact(userId: string, contactUserId: string) {
    const contact = await this.repo.findContact(userId, contactUserId);
    if (!contact) return { isContact: false, nickname: null };
    return { isContact: true, nickname: contact.nickname ?? null };
  }

  async addContact(userId: string, phone: string, nickname?: string) {
    const contactUser = await this.repo.findUserByPhone(phone);
    if (!contactUser) {
      throw new AppError(404, "No user found with that phone number", "USER_NOT_FOUND");
    }

    if (contactUser.id === userId) {
      throw new AppError(400, "Cannot add yourself as a contact", "SELF_CONTACT");
    }

    const existing = await this.repo.findContact(userId, contactUser.id);

    if (existing) {
      if (nickname !== undefined) {
        return { contact: await this.repo.updateContactNickname(existing.id, nickname), created: false };
      }
      return { contact: await this.repo.findContactWithUser(existing.id), created: false };
    }

    const contact = await this.repo.createContact(userId, contactUser.id, nickname);
    return { contact, created: true };
  }

  async listContacts(userId: string, skip = 0, limit = 50) {
    const rows = await this.repo.findAllContacts(userId, skip, limit);
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    return { contacts: rows, hasMore };
  }

  async removeContact(userId: string, contactId: string) {
    const contact = await this.repo.findContactById(contactId);
    if (!contact || contact.userId !== userId) {
      throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    }
    await this.repo.deleteContact(contactId);
  }

  async updateNickname(userId: string, contactId: string, nickname: string) {
    const contact = await this.repo.findContactById(contactId);
    if (!contact || contact.userId !== userId) {
      throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
    }
    return { contact: await this.repo.updateContactNickname(contactId, nickname || undefined) };
  }

  async syncContacts(userId: string, phones: string[]) {
    const registeredUsers = await this.repo.findRegisteredUsers(phones, userId);
    const existingIds = await this.repo.findExistingContactIds(userId);

    return registeredUsers.map((user: (typeof registeredUsers)[number]) => ({
      ...user,
      isContact: existingIds.has(user.id),
    }));
  }

  async syncAndAddContacts(userId: string, contacts: Array<{ phone: string; name?: string }>) {
    const phones = contacts.map((c) => c.phone);
    const phoneToName = new Map<string, string>();
    for (const c of contacts) {
      const name = c.name?.trim();
      if (name) phoneToName.set(c.phone, name);
    }

    const registeredUsers = await this.repo.findRegisteredUsers(phones, userId);

    if (registeredUsers.length === 0) {
      return { users: [] as Array<(typeof registeredUsers)[number] & { isContact: boolean }>, addedCount: 0 };
    }

    const addedCount = await this.repo.bulkCreateContacts(
      userId,
      registeredUsers.map((u) => ({ contactUserId: u.id, nickname: phoneToName.get(u.phone) })),
    );

    return {
      users: registeredUsers.map((user) => ({ ...user, isContact: true })),
      addedCount,
    };
  }
}
