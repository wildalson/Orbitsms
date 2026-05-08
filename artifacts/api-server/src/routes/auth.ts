import { Router } from "express";
import { db, loginAuditTable, otpCodesTable, usersTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import {
  generateToken,
  getAuthUserFromRequest,
  getClientIp,
  hashPassword,
  isLegacyPasswordHash,
  verifyPassword,
} from "../lib/auth";

const router = Router();

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;

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
    emailVerified: user.emailVerified ?? false,
    phoneVerified: user.phoneVerified ?? false,
    smppHost: user.smppHost ? "configured" : null,
    smppPort: user.smppPort ?? null,
    smppSystemId: user.smppSystemId ? "configured" : null,
    smppPassword: user.smppPassword ? "configured" : null,
    httpApiKey: user.httpApiKey ?? null,
    createdAt: user.createdAt,
  };
}

function checkLoginRateLimit(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_LOGIN_ATTEMPTS;
}

async function auditLogin(req: any, username: string, success: boolean, user: any | null, reason?: string) {
  await db.insert(loginAuditTable).values({
    userId: user?.id ?? null,
    username,
    success,
    role: user?.role ?? null,
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] ?? null,
    reason: reason ?? null,
  });
}

const OTP_TTL_MS = 10 * 60 * 1000;

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { username, password } = parsed.data;
  const rateKey = `${getClientIp(req)}:${username.toLowerCase()}`;
  if (!checkLoginRateLimit(rateKey)) {
    await auditLogin(req, username, false, null, "rate_limited");
    res.status(429).json({ error: "Too many login attempts. Please try again later." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (!user || !(await verifyPassword(password, user.password))) {
    await auditLogin(req, username, false, user ?? null, "invalid_credentials");
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (user.status === "suspended") {
    await auditLogin(req, username, false, user, "suspended");
    res.status(403).json({ error: "Account suspended. Please contact your administrator." });
    return;
  }
  if (isLegacyPasswordHash(user.password)) {
    await db.update(usersTable).set({ password: await hashPassword(password) }).where(eq(usersTable.id, user.id));
  }
  await auditLogin(req, username, true, user);
  const token = await generateToken(user.id);
  res.json({ token, user: formatUser(user) });
});

router.post("/auth/register", async (req, res) => {
  if (process.env.ENABLE_PUBLIC_REGISTRATION !== "true") {
    res.status(403).json({ error: "Public registration is disabled. Please contact the administrator." });
    return;
  }
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
    password: await hashPassword(password),
    email,
    phone: phone ?? null,
    role: "client",
    status: "active",
    balance: "1000",
  }).returning();
  const token = await generateToken(user.id);
  res.status(201).json({ token, user: formatUser(user) });
});

router.get("/auth/me", async (req, res) => {
  const user = await getAuthUserFromRequest(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json(formatUser(user));
});

// Profile routes
router.get("/profile", async (req, res) => {
  const user = await getAuthUserFromRequest(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json(formatUser(user));
});

router.put("/profile", async (req, res) => {
  const user = await getAuthUserFromRequest(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { companyName, email, phone, currentPassword, newPassword } = req.body;
  const updates: Record<string, any> = {};

  if (companyName !== undefined) updates.companyName = companyName || null;

  if (email !== undefined && email !== user.email) {
    const exists = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (exists.length > 0 && exists[0].id !== user.id) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }
    updates.email = email;
    updates.emailVerified = false;
  }

  if (phone !== undefined) {
    const cleaned = phone.replace(/\s+/g, "").replace(/^\+/, "");
    if (cleaned && !/^63\d{10}$/.test(cleaned)) {
      res.status(400).json({ error: "Phone must be a valid Philippine number (e.g. 639171234567)" });
      return;
    }
    if (cleaned !== (user.phone ?? "").replace(/^\+/, "")) {
      updates.phone = cleaned ? cleaned : null;
      updates.phoneVerified = false;
    }
  }

  if (newPassword) {
    if (!currentPassword) { res.status(400).json({ error: "Current password is required" }); return; }
    if (!(await verifyPassword(currentPassword, user.password))) { res.status(400).json({ error: "Current password is incorrect" }); return; }
    if (newPassword.length < 10) { res.status(400).json({ error: "New password must be at least 10 characters" }); return; }
    updates.password = await hashPassword(newPassword);
  }

  if (Object.keys(updates).length === 0) {
    res.json(formatUser(user));
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  res.json(formatUser(updated));
});

router.post("/profile/send-otp", async (req, res) => {
  const user = await getAuthUserFromRequest(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { type } = req.body;
  if (type !== "email" && type !== "phone") {
    res.status(400).json({ error: "type must be 'email' or 'phone'" });
    return;
  }
  if (type === "email" && !user.email) {
    res.status(400).json({ error: "No email on file" });
    return;
  }
  if (type === "phone" && !user.phone) {
    res.status(400).json({ error: "Add a phone number first" });
    return;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await db.delete(otpCodesTable).where(
    and(eq(otpCodesTable.userId, user.id), eq(otpCodesTable.type, type)),
  );
  await db.insert(otpCodesTable).values({ userId: user.id, type, code, expiresAt });

  // TODO: send via email/SMS service
  const destination = type === "email" ? user.email : user.phone;
  res.json({ message: `Verification code sent to ${destination}` });
});

router.post("/profile/verify-otp", async (req, res) => {
  const user = await getAuthUserFromRequest(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { type, otp } = req.body;
  if (!type || !otp) {
    res.status(400).json({ error: "type and otp are required" });
    return;
  }

  const now = new Date();
  const [stored] = await db.select().from(otpCodesTable).where(
    and(
      eq(otpCodesTable.userId, user.id),
      eq(otpCodesTable.type, type),
      gt(otpCodesTable.expiresAt, now),
    ),
  );

  if (!stored) {
    res.status(400).json({ error: "No valid OTP found. Please request a new code." });
    return;
  }
  if (stored.code !== String(otp).trim()) {
    res.status(400).json({ error: "Incorrect code. Please try again." });
    return;
  }

  await db.delete(otpCodesTable).where(eq(otpCodesTable.id, stored.id));

  const field = type === "email" ? { emailVerified: true } : { phoneVerified: true };
  const [updated] = await db.update(usersTable).set(field).where(eq(usersTable.id, user.id)).returning();
  res.json(formatUser(updated));
});

export default router;
