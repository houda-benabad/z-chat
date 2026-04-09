import { Response } from "express";
import { ChatService } from "./service";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { AuthRequest } from "../../shared/middleware/auth";

export class ChatController {
  constructor(private service: ChatService) {}

  createOrGetChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { participantId } = req.body;
    const { chat, created } = await this.service.createOrGetDirectChat(req.userId!, participantId);
    if (created) {
      res.status(201).json({ chat });
    } else {
      res.json({ chat });
    }
  });

  listChats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const limit = Math.min(Number(req.query.limit) || 25, 50);
    const result = await this.service.listChats(req.userId!, cursor, limit);
    res.json(result);
  });

  deleteChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteChat(req.userId!, String(req.params.id));
    res.json({ message: "Conversation deleted" });
  });

  searchMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = String(req.params.id);
    const query = String(req.query.q ?? '').trim();
    if (!query) {
      res.json({ messages: [] });
      return;
    }
    const messages = await this.service.searchMessages(req.userId!, chatId, query);
    res.json({ messages });
  });

  deleteMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = String(req.params.id);
    const messageId = String(req.params.messageId);
    await this.service.deleteMessage(req.userId!, chatId, messageId);
    res.json({ message: "Message deleted" });
  });

  starMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = String(req.params.id);
    const messageId = String(req.params.messageId);
    await this.service.starMessage(req.userId!, chatId, messageId);
    res.status(201).json({ message: "Message starred" });
  });

  unstarMessage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = String(req.params.id);
    const messageId = String(req.params.messageId);
    await this.service.unstarMessage(req.userId!, chatId, messageId);
    res.json({ message: "Message unstarred" });
  });

  getStarredMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const limit = Math.min(Number(req.query.limit) || 25, 50);
    const result = await this.service.getStarredMessages(req.userId!, cursor, limit);
    res.json(result);
  });

  getStarredMessageIdsForChat = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = String(req.params.id);
    const starredMessageIds = await this.service.getStarredMessageIdsForChat(req.userId!, chatId);
    res.json({ starredMessageIds });
  });

  getMessages = asyncHandler(async (req: AuthRequest, res: Response) => {
    const chatId = String(req.params.id);
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const result = await this.service.getMessages(req.userId!, chatId, limit, cursor);
    res.json(result);
  });
}
