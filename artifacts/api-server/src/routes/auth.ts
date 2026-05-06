import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "sms_gateway_salt").digest("hex");
}

function generateToken(userId: number): string {
  return Buffer.from(`${userId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`).toString("base64");
}

function formatUser(user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName,
    role: user.role,
    status: user.status,
    smsRate: Number(user.smsRate),
    balance: Number(user.balance),
    createdAt: user.createdAt,
  };
}

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || user.password !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.status === "suspended") {
    res.status(403).json({ error: "Account suspended. Please contact your administrator." });
    return;
  }
  const token = generateToken(user.id);
  res.json({ token, user: formatUser(user) });
});

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { username, password, email, phone } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length > 0) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    username,
    password: hashPassword(password),
    email,
    phone: phone ?? null,
    role: "client",
    status: "active",
    balance: "1000",
  }).returning();
  const token = generateToken(user.id);
  res.status(201).json({ token, user: formatUser(user) });
});

router.get("/auth/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const userId = parseInt(decoded.split(":")[0]);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    res.json(formatUser(user));
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
