import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../lib/asyncHandler";
import { addContactSchema, syncContactsSchema } from "../lib/validation";
import { AppError } from "../lib/errors";

export function createContactRouter(prisma: PrismaClient, jwtSecret: string): Router {
  const router = Router();

  router.use(authMiddleware(jwtSecret));

  // POST /contacts — Add a contact by phone number
  router.post(
    "/",
    validate(addContactSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const { phone, nickname } = req.body;

      // Find the user by phone
      const contactUser = await prisma.user.findUnique({
        where: { phone },
        select: { id: true },
      });

      if (!contactUser) {
        throw new AppError(404, "No user found with that phone number", "USER_NOT_FOUND");
      }

      if (contactUser.id === userId) {
        throw new AppError(400, "Cannot add yourself as a contact", "SELF_CONTACT");
      }

      // Check if already a contact
      const existing = await prisma.contact.findUnique({
        where: { userId_contactUserId: { userId, contactUserId: contactUser.id } },
      });

      if (existing) {
        // Update nickname if provided
        if (nickname !== undefined) {
          const updated = await prisma.contact.update({
            where: { id: existing.id },
            data: { nickname },
            include: {
              contactUser: {
                select: { id: true, phone: true, name: true, avatar: true, about: true, isOnline: true, lastSeen: true },
              },
            },
          });
          res.json({ contact: updated });
          return;
        }

        const withUser = await prisma.contact.findUnique({
          where: { id: existing.id },
          include: {
            contactUser: {
              select: { id: true, phone: true, name: true, avatar: true, about: true, isOnline: true, lastSeen: true },
            },
          },
        });
        res.json({ contact: withUser });
        return;
      }

      const contact = await prisma.contact.create({
        data: {
          userId,
          contactUserId: contactUser.id,
          nickname,
        },
        include: {
          contactUser: {
            select: { id: true, phone: true, name: true, avatar: true, about: true, isOnline: true, lastSeen: true },
          },
        },
      });

      res.status(201).json({ contact });
    }),
  );

  // GET /contacts — List all contacts
  router.get(
    "/",
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;

      const contacts = await prisma.contact.findMany({
        where: { userId },
        include: {
          contactUser: {
            select: { id: true, phone: true, name: true, avatar: true, about: true, isOnline: true, lastSeen: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Sort alphabetically by display name (nickname > name > phone)
      contacts.sort((a, b) => {
        const nameA = (a.nickname ?? a.contactUser.name ?? a.contactUser.phone).toLowerCase();
        const nameB = (b.nickname ?? b.contactUser.name ?? b.contactUser.phone).toLowerCase();
        return nameA.localeCompare(nameB);
      });

      res.json({ contacts });
    }),
  );

  // DELETE /contacts/:id — Remove a contact
  router.delete(
    "/:id",
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const contactId = String(req.params.id);

      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });

      if (!contact || contact.userId !== userId) {
        throw new AppError(404, "Contact not found", "CONTACT_NOT_FOUND");
      }

      await prisma.contact.delete({ where: { id: contactId } });

      res.json({ message: "Contact removed" });
    }),
  );

  // POST /contacts/sync — Match phone numbers against registered users
  router.post(
    "/sync",
    validate(syncContactsSchema),
    asyncHandler(async (req: AuthRequest, res) => {
      const userId = req.userId!;
      const { phones } = req.body as { phones: string[] };

      // Find which phone numbers are registered on z.chat
      const registeredUsers = await prisma.user.findMany({
        where: {
          phone: { in: phones },
          id: { not: userId }, // exclude self
        },
        select: { id: true, phone: true, name: true, avatar: true, isOnline: true, lastSeen: true },
      });

      // Get existing contacts so we know which are already added
      const existingContacts = await prisma.contact.findMany({
        where: { userId },
        select: { contactUserId: true },
      });
      const existingIds = new Set(existingContacts.map((c) => c.contactUserId));

      const results = registeredUsers.map((user) => ({
        ...user,
        isContact: existingIds.has(user.id),
      }));

      res.json({ users: results });
    }),
  );

  return router;
}
