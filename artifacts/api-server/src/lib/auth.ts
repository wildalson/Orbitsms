import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const LEGACY_PASSWORD_SALT = "sms_gateway_salt";
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

function tokenSecret() {
  return process.env.AUTH_TOKEN_SECRET || process.env.SESSION_SECRET || "orbitsms-change-this-secret";
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
}

export function legacyHashPassword(password: string) {
  return crypto.createHash("sha256").update(password + LEGACY_PASSWORD_SALT).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, storedHash: string) {
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    return bcrypt.compare(password, storedHash);
  }

  return storedHash === legacyHashPassword(password);
}

export function isLegacyPasswordHash(storedHash: string) {
  return !storedHash.startsWith("$2a$") && !storedHash.startsWith("$2b$") && !storedHash.startsWith("$2y$");
}

export function generateToken(userId: number) {
  const payload = JSON.stringify({
    sub: userId,
    iat: Date.now(),
    exp: Date.now() + TOKEN_TTL_MS,
    nonce: crypto.randomBytes(16).toString("hex"),
  });
  const encoded = base64url(payload);
  return `${encoded}.${sign(encoded)}`;
}

export async function getAuthUserFromRequest(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (!payload?.sub || !payload?.exp || Date.now() > Number(payload.exp)) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(payload.sub)));
    if (!user || user.status === "suspended") return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next?: NextFunction): Promise<number | null> {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  if (user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin only" });
    return null;
  }
  (req as any).user = user;
  if (next) next();
  return user.id;
}

export function getClientIp(req: Request) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
    .split(",")[0]
    .trim();
}
