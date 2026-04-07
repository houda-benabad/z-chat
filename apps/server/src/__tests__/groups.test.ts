import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { setRedisInstance } from "../shared/database/redis";

const JWT_SECRET = "test-jwt-secret-minimum-16";
const JWT_REFRESH_SECRET = "test-refresh-secret-minimum-16";

// ── UUID-format test IDs ────────────────────────────────────────────────

const UID1 = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"; // creator / auth user
const UID2 = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const UID3 = "cccccccc-cccc-4ccc-cccc-cccccccccccc";

function makeUser(id: string, phone: string) {
  return { id, phone, name: id.slice(0, 8), about: null, avatar: null, publicKey: null, isOnline: false, lastSeen: new Date(), createdAt: new Date(), updatedAt: new Date() };
}

function makeParticipant(chatId: string, userId: string, role = "member") {
  return { id: `p-${userId}`, chatId, userId, role, joinedAt: new Date(), deletedAt: null, lastReadMessageId: null, encryptedGroupKey: null, groupKeyVersion: null };
}

// ── Mocks ──────────────────────────────────────────────────────────────

const redisStore: Record<string, string> = {};

const mockRedis = {
  get: jest.fn(async (k: string) => redisStore[k] ?? null),
  set: jest.fn(async (k: string, v: string) => { redisStore[k] = v; return "OK"; }),
  del: jest.fn(async () => 1),
  incr: jest.fn(async (k: string) => { const v = parseInt(redisStore[k] || "0", 10) + 1; redisStore[k] = v.toString(); return v; }),
  expire: jest.fn(async () => 1),
  ping: jest.fn(async () => "PONG"),
  quit: jest.fn(),
} as any;

let mockUsers: Record<string, any> = {};
let mockChats: Record<string, any> = {};
let mockParticipants: any[] = [];

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: any) => mockUsers[where.id] ?? null),
    findMany: jest.fn(async ({ where }: any) => {
      if (where?.id?.in) return (where.id.in as string[]).map((id) => mockUsers[id]).filter(Boolean);
      return [];
    }),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: { create: jest.fn(), findUnique: jest.fn(async () => null), update: jest.fn() },
  $queryRaw: jest.fn(async () => []),
  chat: {
    create: jest.fn(async ({ data }: any) => {
      const id = `f47ac10b-58cc-4372-a567-${Date.now().toString().slice(-12)}`;
      const participantDefs = data.participants.create;
      const participants = participantDefs.map((p: any) => ({
        ...makeParticipant(id, p.userId, p.role),
        user: mockUsers[p.userId],
      }));
      const chat = {
        id, type: "group", name: data.name, description: data.description ?? null,
        avatar: null, createdBy: data.createdBy,
        createdAt: new Date(), updatedAt: new Date(), participants,
      };
      mockChats[id] = chat;
      participants.forEach((p: any) => mockParticipants.push(p));
      return chat;
    }),
    findUnique: jest.fn(async ({ where }: any) => {
      const chat = mockChats[where.id];
      if (!chat) return null;
      // Return fresh copy with current participants
      return { ...chat, participants: mockParticipants.filter((p) => p.chatId === where.id).map((p) => ({ ...p, user: mockUsers[p.userId] })) };
    }),
    update: jest.fn(),
  },
  chatParticipant: {
    findUnique: jest.fn(async ({ where }: any) => {
      const { chatId, userId } = where.chatId_userId ?? {};
      return mockParticipants.find((p) => p.chatId === chatId && p.userId === userId) ?? null;
    }),
    findMany: jest.fn(async ({ where }: any) => {
      if (where?.chatId && where?.userId?.in) {
        return mockParticipants.filter((p) => p.chatId === where.chatId && (where.userId.in as string[]).includes(p.userId));
      }
      return [];
    }),
    createMany: jest.fn(async ({ data }: any) => {
      for (const d of data) {
        mockParticipants.push({ ...makeParticipant(d.chatId, d.userId, d.role), user: mockUsers[d.userId] });
      }
      return { count: data.length };
    }),
    count: jest.fn(async ({ where }: any) => mockParticipants.filter((p) => p.chatId === where.chatId && p.role === where.role).length),
    delete: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(async ({ where }: any) => mockParticipants.find((p) => p.chatId === where.chatId) ?? null),
  },
} as any;

// ── Setup ──────────────────────────────────────────────────────────────

let app: express.Express;
let authToken: string;

beforeAll(() => {
  setRedisInstance(mockRedis);
  app = createApp(mockPrisma, mockRedis, JWT_SECRET, JWT_REFRESH_SECRET, "*", "http://localhost:3000");
  authToken = jwt.sign({ sub: UID1, phone: "+1234567890" }, JWT_SECRET, { expiresIn: "15m" });
});

beforeEach(() => {
  for (const k of Object.keys(redisStore)) delete redisStore[k];
  mockUsers = {
    [UID1]: makeUser(UID1, "+1234567890"),
    [UID2]: makeUser(UID2, "+1000000002"),
    [UID3]: makeUser(UID3, "+1000000003"),
  };
  mockChats = {};
  mockParticipants = [];
  jest.clearAllMocks();
});

// ── Tests: POST /groups ────────────────────────────────────────────────

describe("POST /groups", () => {
  it("creates a group with valid members", async () => {
    const res = await request(app)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Test Group", memberIds: [UID2] });

    expect(res.status).toBe(201);
    expect(res.body.chat.name).toBe("Test Group");
  });

  it("rejects missing name", async () => {
    const res = await request(app)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ memberIds: [UID2] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects name over 100 chars", async () => {
    const res = await request(app)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "x".repeat(101), memberIds: [UID2] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects non-UUID memberIds", async () => {
    const res = await request(app)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Test", memberIds: ["not-a-uuid"] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app)
      .post("/groups")
      .send({ name: "Test", memberIds: [UID2] });

    expect(res.status).toBe(401);
  });
});

// ── Tests: 256-member cap ──────────────────────────────────────────────

describe("POST /groups/:chatId/members — 256-member cap", () => {
  it("rejects adding members when group already has 256 participants", async () => {
    const createRes = await request(app)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Full Group", memberIds: [UID2] });

    expect(createRes.status).toBe(201);
    const chatId = createRes.body.chat.id;

    // Pad participant list to exactly 256 (creator + UID2 + 254 more)
    for (let i = 0; i < 254; i++) {
      const uid = `${i.toString(16).padStart(8, "0")}-0000-4000-8000-${i.toString(16).padStart(12, "0")}`;
      mockUsers[uid] = makeUser(uid, `+100${i.toString().padStart(10, "0")}`);
      mockParticipants.push(makeParticipant(chatId, uid));
    }

    // Now 256 participants. Adding UID3 would make 257 → should fail
    const addRes = await request(app)
      .post(`/groups/${chatId}/members`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ memberIds: [UID3] });

    expect(addRes.status).toBe(400);
    expect(addRes.body.error.message).toContain("256");
  });

  it("allows adding a member when under the cap", async () => {
    const createRes = await request(app)
      .post("/groups")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Small Group", memberIds: [UID2] });

    expect(createRes.status).toBe(201);
    const chatId = createRes.body.chat.id;

    const addRes = await request(app)
      .post(`/groups/${chatId}/members`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ memberIds: [UID3] });

    expect(addRes.status).toBe(200);
  });
});
