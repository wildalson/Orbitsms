import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";

// Mock the DB module so tests don't need a live database
vi.mock("@workspace/db", () => {
  const mockUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    phone: null,
    companyName: null,
    role: "client",
    status: "active",
    password: "$2b$12$validhashplaceholder000000000000000000000000000000000000",
    smsRate: "1.00",
    balance: "500",
    emailVerified: false,
    phoneVerified: false,
    smppHost: null,
    smppPort: null,
    smppSystemId: null,
    smppPassword: null,
    httpApiKey: null,
    permissions: "{}",
    createdAt: new Date(),
  };

  return {
    db: {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([mockUser]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockUser]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([]),
    },
    usersTable: {},
    loginAuditTable: {},
    otpCodesTable: {},
  };
});

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue("$2b$12$hashed"),
  },
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue("$2b$12$hashed"),
}));

// Set required env vars before importing the app
process.env.AUTH_TOKEN_SECRET = "test-secret-for-unit-tests-must-be-long-enough";
process.env.ALLOWED_ORIGINS = "http://localhost:3000";

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing body fields", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 429 after too many login attempts", async () => {
    const attempts = Array.from({ length: 10 }, () =>
      request(app).post("/api/auth/login").send({ username: "bruteforce", password: "wrong" }),
    );
    const results = await Promise.all(attempts);
    expect(results.some((r) => r.status === 429)).toBe(true);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/register", () => {
  it("returns 403 when public registration is disabled", async () => {
    const original = process.env.ENABLE_PUBLIC_REGISTRATION;
    delete process.env.ENABLE_PUBLIC_REGISTRATION;
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "new", password: "password123!", email: "new@example.com" });
    expect(res.status).toBe(403);
    process.env.ENABLE_PUBLIC_REGISTRATION = original;
  });
});

describe("GET /api/health", () => {
  it("returns health status", async () => {
    const res = await request(app).get("/api/health");
    // May be 200 (ok) or 503 (db unavailable) — either is a valid structured response
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
  });
});
