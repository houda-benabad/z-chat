import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";
import { createApp } from "../app";
import { setRedisInstance } from "../lib/redis";

// ── Mocks ──────────────────────────────────────────────────────────

const JWT_SECRET = "test-jwt-secret-minimum-16";
const JWT_REFRESH_SECRET = "test-refresh-secret-minimum-16";

// In-memory Redis mock
const redisStore: Record<string, string> = {};
const redisTtls: Record<string, number> = {};

const mockRedis = {
  get: jest.fn(async (key: string) => redisStore[key] ?? null),
  set: jest.fn(async (key: string, value: string, _mode?: string, _ttl?: number) => {
    redisStore[key] = value;
    return "OK";
  }),
  del: jest.fn(async (key: string) => {
    delete redisStore[key];
    return 1;
  }),
  incr: jest.fn(async (key: string) => {
    const val = parseInt(redisStore[key] || "0", 10) + 1;
    redisStore[key] = val.toString();
    return val;
  }),
  expire: jest.fn(async () => 1),
  quit: jest.fn(),
} as any;

setRedisInstance(mockRedis);

// In-memory Prisma mock
const users: Record<string, any> = {};
const refreshTokens: Record<string, any> = {};

const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: any) => {
      if (where.id) return Object.values(users).find((u: any) => u.id === where.id) ?? null;
      if (where.phone) return Object.values(users).find((u: any) => u.phone === where.phone) ?? null;
      return null;
    }),
    create: jest.fn(async ({ data }: any) => {
      const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const user = { id, ...data, name: null, about: null, avatar: null, createdAt: new Date(), updatedAt: new Date() };
      users[id] = user;
      return user;
    }),
    update: jest.fn(async ({ where, data, select }: any) => {
      const user = Object.values(users).find((u: any) => u.id === where.id) as any;
      if (!user) throw new Error("User not found");
      Object.assign(user, data, { updatedAt: new Date() });
      if (select) {
        const result: any = {};
        for (const key of Object.keys(select)) {
          if (select[key]) result[key] = user[key];
        }
        return result;
      }
      return user;
    }),
  },
  refreshToken: {
    create: jest.fn(async ({ data }: any) => {
      const id = `rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const rt = { id, ...data, revokedAt: null, createdAt: new Date() };
      refreshTokens[id] = rt;
      return rt;
    }),
    findUnique: jest.fn(async ({ where, include }: any) => {
      const rt = Object.values(refreshTokens).find((t: any) => t.token === where.token) as any;
      if (!rt) return null;
      if (include?.user) {
        rt.user = Object.values(users).find((u: any) => u.id === rt.userId) ?? null;
      }
      return rt;
    }),
    update: jest.fn(async ({ where, data }: any) => {
      const rt = Object.values(refreshTokens).find((t: any) => t.id === where.id) as any;
      if (!rt) throw new Error("Token not found");
      Object.assign(rt, data);
      return rt;
    }),
  },
} as any;

// ── Test setup ─────────────────────────────────────────────────────

let app: express.Express;

beforeAll(() => {
  app = createApp(mockPrisma, JWT_SECRET, JWT_REFRESH_SECRET);
});

beforeEach(() => {
  // Clear stores
  for (const key of Object.keys(redisStore)) delete redisStore[key];
  for (const key of Object.keys(users)) delete users[key];
  for (const key of Object.keys(refreshTokens)) delete refreshTokens[key];
  jest.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────

describe("POST /auth/send-otp", () => {
  it("should send OTP for valid phone", async () => {
    const res = await request(app)
      .post("/auth/send-otp")
      .send({ phone: "+1234567890" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("OTP sent successfully");
    expect(mockRedis.set).toHaveBeenCalledWith(
      "otp:+1234567890",
      expect.stringMatching(/^\d{6}$/),
      "EX",
      300,
    );
  });

  it("should reject invalid phone format", async () => {
    const res = await request(app)
      .post("/auth/send-otp")
      .send({ phone: "not-a-phone" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject missing phone", async () => {
    const res = await request(app)
      .post("/auth/send-otp")
      .send({});

    expect(res.status).toBe(400);
  });

  it("should rate limit after 5 requests", async () => {
    // Simulate 5 prior requests
    redisStore["otp_rate:+1234567890"] = "5";

    const res = await request(app)
      .post("/auth/send-otp")
      .send({ phone: "+1234567890" });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
  });
});

describe("POST /auth/verify-otp", () => {
  it("should verify OTP and return tokens for new user", async () => {
    redisStore["otp:+1234567890"] = "123456";

    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "+1234567890", otp: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.phone).toBe("+1234567890");
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it("should return tokens for existing user without creating new one", async () => {
    const existingUser = {
      id: "existing-user",
      phone: "+1234567890",
      name: "Test",
      about: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users["existing-user"] = existingUser;
    redisStore["otp:+1234567890"] = "123456";

    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "+1234567890", otp: "123456" });

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("existing-user");
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("should reject invalid OTP", async () => {
    redisStore["otp:+1234567890"] = "123456";

    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "+1234567890", otp: "000000" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_OTP");
  });

  it("should reject expired/missing OTP", async () => {
    const res = await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "+1234567890", otp: "123456" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_OTP");
  });

  it("should delete OTP after successful verification", async () => {
    redisStore["otp:+1234567890"] = "123456";

    await request(app)
      .post("/auth/verify-otp")
      .send({ phone: "+1234567890", otp: "123456" });

    expect(mockRedis.del).toHaveBeenCalledWith("otp:+1234567890");
  });
});

describe("POST /auth/refresh", () => {
  it("should issue new tokens with valid refresh token", async () => {
    // Set up user and refresh token
    const user = {
      id: "user-1",
      phone: "+1234567890",
      name: null,
      about: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users["user-1"] = user;

    const refreshJwt = jwt.sign({ sub: "user-1" }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
    refreshTokens["rt-1"] = {
      id: "rt-1",
      token: refreshJwt,
      userId: "user-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      createdAt: new Date(),
    };

    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: refreshJwt });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    // Old token should be revoked
    expect(refreshTokens["rt-1"].revokedAt).toBeTruthy();
  });

  it("should reject revoked refresh token", async () => {
    const user = { id: "user-1", phone: "+1234567890", name: null, about: null, avatar: null, createdAt: new Date(), updatedAt: new Date() };
    users["user-1"] = user;

    const refreshJwt = jwt.sign({ sub: "user-1" }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
    refreshTokens["rt-1"] = {
      id: "rt-1",
      token: refreshJwt,
      userId: "user-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: new Date(), // Already revoked
      createdAt: new Date(),
    };

    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: refreshJwt });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("should reject invalid refresh token", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: "invalid-token" });

    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("should revoke refresh token", async () => {
    const refreshJwt = jwt.sign({ sub: "user-1" }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
    refreshTokens["rt-1"] = {
      id: "rt-1",
      token: refreshJwt,
      userId: "user-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
      createdAt: new Date(),
    };

    const res = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: refreshJwt });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
    expect(refreshTokens["rt-1"].revokedAt).toBeTruthy();
  });

  it("should succeed even with unknown token", async () => {
    const res = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: "some-unknown-token" });

    expect(res.status).toBe(200);
  });
});

describe("GET /users/me", () => {
  it("should return user profile with valid token", async () => {
    const user = {
      id: "user-1",
      phone: "+1234567890",
      name: "Test User",
      about: "Hello",
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users["user-1"] = user;

    const token = jwt.sign({ sub: "user-1", phone: "+1234567890" }, JWT_SECRET, { expiresIn: "15m" });

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe("user-1");
    expect(res.body.user.name).toBe("Test User");
  });

  it("should reject request without token", async () => {
    const res = await request(app).get("/users/me");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject expired token", async () => {
    const token = jwt.sign({ sub: "user-1", phone: "+1234567890" }, JWT_SECRET, { expiresIn: "-1s" });

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("should reject invalid token", async () => {
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
  });
});

describe("PATCH /users/me", () => {
  it("should update user profile", async () => {
    const user = {
      id: "user-1",
      phone: "+1234567890",
      name: null,
      about: null,
      avatar: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users["user-1"] = user;

    const token = jwt.sign({ sub: "user-1", phone: "+1234567890" }, JWT_SECRET, { expiresIn: "15m" });

    const res = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Name", about: "New about" });

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Updated Name");
    expect(res.body.user.about).toBe("New about");
  });

  it("should reject invalid avatar URL", async () => {
    const user = { id: "user-1", phone: "+1234567890", name: null, about: null, avatar: null, createdAt: new Date(), updatedAt: new Date() };
    users["user-1"] = user;

    const token = jwt.sign({ sub: "user-1", phone: "+1234567890" }, JWT_SECRET, { expiresIn: "15m" });

    const res = await request(app)
      .patch("/users/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ avatar: "not-a-url" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject unauthenticated request", async () => {
    const res = await request(app)
      .patch("/users/me")
      .send({ name: "Test" });

    expect(res.status).toBe(401);
  });
});

describe("GET /health", () => {
  it("should return ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
