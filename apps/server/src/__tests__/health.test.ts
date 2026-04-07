import request from "supertest";
import express from "express";
import { createApp } from "../app";
import { setRedisInstance } from "../shared/database/redis";

const JWT_SECRET = "test-jwt-secret-minimum-16";
const JWT_REFRESH_SECRET = "test-refresh-secret-minimum-16";

// ── Base mocks ──────────────────────────────────────────────────────────

const mockRedisBase = {
  get: jest.fn(async () => null),
  set: jest.fn(async () => "OK"),
  del: jest.fn(async () => 1),
  incr: jest.fn(async () => 1),
  expire: jest.fn(async () => 1),
  ping: jest.fn(async () => "PONG"),
  quit: jest.fn(),
} as any;

const mockPrismaBase = {
  user: { findUnique: jest.fn(async () => null), create: jest.fn(), update: jest.fn() },
  refreshToken: { create: jest.fn(), findUnique: jest.fn(async () => null), update: jest.fn() },
  $queryRaw: jest.fn(async () => [{ "?column?": 1 }]),
} as any;

// ── Tests ────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  let app: express.Express;

  beforeAll(() => {
    setRedisInstance(mockRedisBase);
    app = createApp(mockPrismaBase, mockRedisBase, JWT_SECRET, JWT_REFRESH_SECRET, "*", "http://localhost:3000");
  });

  it("returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("GET /health/ready", () => {
  it("returns ready when Prisma and Redis are healthy", async () => {
    const redis = { ...mockRedisBase, ping: jest.fn(async () => "PONG") } as any;
    const prisma = { ...mockPrismaBase, $queryRaw: jest.fn(async () => [{ "?column?": 1 }]) } as any;
    setRedisInstance(redis);
    const app = createApp(prisma, redis, JWT_SECRET, JWT_REFRESH_SECRET, "*", "http://localhost:3000");

    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.db).toBe("ok");
    expect(res.body.cache).toBe("ok");
  });

  it("returns 503 when Prisma is down", async () => {
    const redis = { ...mockRedisBase, ping: jest.fn(async () => "PONG") } as any;
    const prisma = { ...mockPrismaBase, $queryRaw: jest.fn(async () => { throw new Error("DB unavailable"); }) } as any;
    setRedisInstance(redis);
    const app = createApp(prisma, redis, JWT_SECRET, JWT_REFRESH_SECRET, "*", "http://localhost:3000");

    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("not ready");
  });

  it("returns 503 when Redis is down", async () => {
    const redis = { ...mockRedisBase, ping: jest.fn(async () => { throw new Error("Redis unavailable"); }) } as any;
    const prisma = { ...mockPrismaBase, $queryRaw: jest.fn(async () => [{ "?column?": 1 }]) } as any;
    setRedisInstance(redis);
    const app = createApp(prisma, redis, JWT_SECRET, JWT_REFRESH_SECRET, "*", "http://localhost:3000");

    const res = await request(app).get("/health/ready");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("not ready");
  });
});
