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
    emailVerified: user.emailVerified ?? false,
    phoneVerified: user.phoneVerified ?? false,
    smppHost: user.smppHost ?? null,
    smppPort: user.smppPort ?? null,
    smppSystemId: user.smppSystemId ?? null,
    smppPassword: user.smppPassword ?? null,
    httpApiKey: user.httpApiKey ?? null,
    createdAt: user.createdAt,
  };
}

async function getAuthUser(req: any, res: any): Promise<any | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const userId = parseInt(decoded.split(":")[0]);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
    return user;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

// In-memory OTP store: key = `${userId}:${type}`, value = {otp, expires}
const otpStore = new Map<string, { otp: string; expires: number }>();

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
  const user = await getAuthUser(req, res);
  if (!user) return;
  res.json(formatUser(user));
});

// Profile routes
router.get("/profile", async (req, res) => {
  const user = await getAuthUser(req, res);
  if (!user) return;
  res.json(formatUser(user));
});

router.put("/profile", async (req, res) => {
  const user = await getAuthUser(req, res);
  if (!user) return;

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
    if (user.password !== hashPassword(currentPassword)) { res.status(400).json({ error: "Current password is incorrect" }); return; }
    if (newPassword.length < 6) { res.status(400).json({ error: "New password must be at least 6 characters" }); return; }
    updates.password = hashPassword(newPassword);
  }

  if (Object.keys(updates).length === 0) {
    res.json(formatUser(user));
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  res.json(formatUser(updated));
});

router.post("/profile/send-otp", async (req, res) => {
  const user = await getAuthUser(req, res);
  if (!user) return;

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

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const key = `${user.id}:${type}`;
  otpStore.set(key, { otp, expires: Date.now() + 10 * 60 * 1000 });

  // In production: send via email/SMS service. For now return OTP in response.
  const destination = type === "email" ? user.email : user.phone;
  res.json({
    message: `Verification code sent to ${destination}`,
    // Development only — remove this in production:
    devOtp: otp,
  });
});

router.post("/profile/verify-otp", async (req, res) => {
  const user = await getAuthUser(req, res);
  if (!user) return;

  const { type, otp } = req.body;
  if (!type || !otp) {
    res.status(400).json({ error: "type and otp are required" });
    return;
  }

  const key = `${user.id}:${type}`;
  const stored = otpStore.get(key);

  if (!stored) {
    res.status(400).json({ error: "No OTP found. Please request a new code." });
    return;
  }
  if (Date.now() > stored.expires) {
    otpStore.delete(key);
    res.status(400).json({ error: "OTP expired. Please request a new code." });
    return;
  }
  if (stored.otp !== String(otp).trim()) {
    res.status(400).json({ error: "Incorrect code. Please try again." });
    return;
  }

  otpStore.delete(key);
  const updates: Record<string, any> = type === "email"
    ? { emailVerified: true }
    : { phoneVerified: true };

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  res.json(formatUser(updated));
});

export default router;
