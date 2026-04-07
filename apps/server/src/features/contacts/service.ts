import { ContactRepository } from "./repository";
import { AppError } from "../../shared/utils/errors";

export class ContactService {
  constructor(private repo: ContactRepository) {}

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

  async syncContacts(userId: string, phones: string[]) {
    const registeredUsers = await this.repo.findRegisteredUsers(phones, userId);
    const existingIds = await this.repo.findExistingContactIds(userId);

    return registeredUsers.map((user: (typeof registeredUsers)[number]) => ({
      ...user,
      isContact: existingIds.has(user.id),
    }));
  }
}
