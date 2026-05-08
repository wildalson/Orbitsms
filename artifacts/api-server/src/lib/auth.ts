import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const LEGACY_PASSWORD_SALT = "sms_gateway_salt";
const TOKEN_TTL = "12h";
const BCRYPT_ROUNDS = 12;

function tokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("AUTH_TOKEN_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
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

export async function generateToken(userId: number) {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(tokenSecret());
}

export async function getAuthUserFromRequest(req: Request) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, tokenSecret()) as { payload: JWTPayload & { sub: string } };
    const userId = Number(payload.sub);
    if (!userId) return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
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
