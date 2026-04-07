import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { setRedisInstance } from "../shared/database/redis";

const JWT_SECRET = "test-jwt-secret-minimum-16";
const JWT_REFRESH_SECRET = "test-refresh-secret-minimum-16";

// ── Mocks ──────────────────────────────────────────────────────────────

const redisStore: Record<string, string> = {};

const mockRedis = {
  get: jest.fn(async (key: string) => redisStore[key] ?? null),
  set: jest.fn(async (key: string, value: string) => { redisStore[key] = value; return "OK"; }),
  del: jest.fn(async (key: string) => { delete redisStore[key]; return 1; }),
  incr: jest.fn(async (key: string) => {
    const v = parseInt(redisStore[key] || "0", 10) + 1;
    redisStore[key] = v.toString();
    return v;
  }),
  expire: jest.fn(async () => 1),
  ping: jest.fn(async () => "PONG"),
  quit: jest.fn(),
} as any;

const userSettings: Record<string, any> = {};

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id === "user-1") return { id: "user-1", phone: "+1234567890", name: "Test", about: null, avatar: null };
      return null;
    }),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(async () => null),
    update: jest.fn(),
  },
  $queryRaw: jest.fn(async () => []),
  userSettings: {
    findUnique: jest.fn(async ({ where }: any) => userSettings[where.userId] ?? null),
    upsert: jest.fn(async ({ where, create, update }: any) => {
      const current = userSettings[where.userId] ?? {};
      const next = { ...current, ...create, ...update, userId: where.userId };
      userSettings[where.userId] = next;
      return next;
    }),
  },
  blockedUser: {
    findMany: jest.fn(async () => []),
    findFirst: jest.fn(async () => null),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
} as any;

// ── Setup ──────────────────────────────────────────────────────────────

let app: express.Express;
let authToken: string;

beforeAll(() => {
  setRedisInstance(mockRedis);
  app = createApp(mockPrisma, mockRedis, JWT_SECRET, JWT_REFRESH_SECRET, "*", "http://localhost:3000");
  authToken = jwt.sign({ sub: "user-1", phone: "+1234567890" }, JWT_SECRET, { expiresIn: "15m" });
});

beforeEach(() => {
  for (const key of Object.keys(redisStore)) delete redisStore[key];
  for (const key of Object.keys(userSettings)) delete userSettings[key];
  jest.clearAllMocks();
});

// ── Tests: Privacy Settings ─────────────────────────────────────────────

describe("PATCH /settings/privacy", () => {
  it("rejects defaultDisappearTimer above max (604800)", async () => {
    const res = await request(app)
      .patch("/settings/privacy")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ defaultDisappearTimer: 604801 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects negative defaultDisappearTimer", async () => {
    const res = await request(app)
      .patch("/settings/privacy")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ defaultDisappearTimer: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects non-integer defaultDisappearTimer", async () => {
    const res = await request(app)
      .patch("/settings/privacy")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ defaultDisappearTimer: 3600.5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts defaultDisappearTimer = 0 (off)", async () => {
    const res = await request(app)
      .patch("/settings/privacy")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ defaultDisappearTimer: 0 });

    expect(res.status).toBe(200);
  });

  it("accepts defaultDisappearTimer = 604800 (7 days)", async () => {
    const res = await request(app)
      .patch("/settings/privacy")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ defaultDisappearTimer: 604800 });

    expect(res.status).toBe(200);
  });

  it("accepts valid lastSeenVisibility values", async () => {
    for (const v of ["everyone", "contacts", "nobody"]) {
      const res = await request(app)
        .patch("/settings/privacy")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ lastSeenVisibility: v });

      expect(res.status).toBe(200);
    }
  });

  it("rejects invalid lastSeenVisibility", async () => {
    const res = await request(app)
      .patch("/settings/privacy")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ lastSeenVisibility: "public" });

    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app)
      .patch("/settings/privacy")
      .send({ readReceipts: false });

    expect(res.status).toBe(401);
  });
});

describe("GET /settings", () => {
  it("returns settings for authenticated user", async () => {
    const res = await request(app)
      .get("/settings")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/settings");
    expect(res.status).toBe(401);
  });
});
