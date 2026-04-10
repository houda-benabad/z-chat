import { Response } from "express";
import { ContactService } from "./service";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { AuthRequest } from "../../shared/middleware/auth";

export class ContactController {
  constructor(private service: ContactService) {}

  addContact = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { phone, nickname } = req.body;
    const { contact, created } = await this.service.addContact(req.userId!, phone, nickname);
    if (created) {
      res.status(201).json({ contact });
    } else {
      res.json({ contact });
    }
  });

  listContacts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const result = await this.service.listContacts(req.userId!, skip, limit);
    res.json(result);
  });

  removeContact = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.removeContact(req.userId!, String(req.params.id));
    res.json({ message: "Contact removed" });
  });

  updateNickname = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { nickname } = req.body;
    const result = await this.service.updateNickname(req.userId!, String(req.params.id), nickname);
    res.json(result);
  });

  syncContacts = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { phones } = req.body;
    const users = await this.service.syncContacts(req.userId!, phones);
    res.json({ users });
  });
}
