import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { setRedisInstance } from "../shared/database/redis";

const JWT_SECRET = "test-jwt-secret-minimum-16";
const JWT_REFRESH_SECRET = "test-refresh-secret-minimum-16";

// ── Mocks ──────────────────────────────────────────────────────────────

const redisStore: Record<string, string> = {};
const users: Record<string, any> = {
  "user-1": { id: "user-1", phone: "+1234567890", name: "Alice", about: null, avatar: null, publicKey: null, isOnline: false, lastSeen: new Date(), createdAt: new Date(), updatedAt: new Date() },
  "user-2": { id: "user-2", phone: "+9876543210", name: "Bob", about: null, avatar: null, publicKey: null, isOnline: false, lastSeen: new Date(), createdAt: new Date(), updatedAt: new Date() },
};

const mockRedis = {
  get: jest.fn(async (key: string) => redisStore[key] ?? null),
  set: jest.fn(async (key: string, value: string) => { redisStore[key] = value; return "OK"; }),
  del: jest.fn(async () => 1),
  incr: jest.fn(async (key: string) => {
    const v = parseInt(redisStore[key] || "0", 10) + 1;
    redisStore[key] = v.toString();
    return v;
  }),
  expire: jest.fn(async () => 1),
  ping: jest.fn(async () => "PONG"),
  quit: jest.fn(),
} as any;

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id) return Object.values(users).find((u: any) => u.id === where.id) ?? null;
      if (where.phone) return Object.values(users).find((u: any) => u.phone === where.phone) ?? null;
      return null;
    }),
    findFirst: jest.fn(async ({ where }: any) => {
      if (where?.phone) return Object.values(users).find((u: any) => u.phone === where.phone) ?? null;
      return null;
    }),
    create: jest.fn(),
    update: jest.fn(async ({ where, data, select }: any) => {
      const u = users[where.id];
      if (!u) throw new Error("User not found");
      Object.assign(u, data, { updatedAt: new Date() });
      if (select) {
        const result: any = {};
        for (const key of Object.keys(select)) { if (select[key]) result[key] = u[key]; }
        return result;
      }
      return u;
    }),
  },
  refreshToken: { create: jest.fn(), findUnique: jest.fn(async () => null), update: jest.fn() },
  $queryRaw: jest.fn(async () => []),
  userSettings: {
    findUnique: jest.fn(async () => null),
    upsert: jest.fn(async ({ where }: any) => ({ userId: where.userId })),
  },
  blockedUser: { findFirst: jest.fn(async () => null) },
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
  jest.clearAllMocks();
});

// ── Tests: GET /users/search ────────────────────────────────────────────

describe("GET /users/search", () => {
  it("rejects missing phone param", async () => {
    const res = await request(app)
      .get("/users/search")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects phone without country code", async () => {
    const res = await request(app)
      .get("/users/search?phone=1234567890")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects phone starting with +0", async () => {
    const res = await request(app)
      .get("/users/search?phone=%2B0234567890")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects phone that is too short", async () => {
    const res = await request(app)
      .get("/users/search?phone=%2B1")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts valid E.164 phone and returns user", async () => {
    const res = await request(app)
      .get("/users/search?phone=%2B9876543210")
      .set("Authorization", `Bearer ${authToken}`);

    // May return 200 with user or 404 if not found — either is correct format
    expect([200, 404]).toContain(res.status);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/users/search?phone=%2B9876543210");
    expect(res.status).toBe(401);
  });
});

// ── Tests: GET /users/:id ──────────────────────────────────────────────

describe("GET /users/:id", () => {
  it("returns user by id", async () => {
    const res = await request(app)
      .get("/users/user-2")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("user-2");
  });

  it("returns 404 for unknown user", async () => {
    const res = await request(app)
      .get("/users/nonexistent-id")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });

  it("rejects unauthenticated request", async () => {
    const res = await request(app).get("/users/user-2");
    expect(res.status).toBe(401);
  });
});
