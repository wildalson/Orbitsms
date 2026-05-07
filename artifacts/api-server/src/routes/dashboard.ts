import { Router } from "express";
import { db, usersTable, tasksTable, messageRecordsTable, productsTable } from "@workspace/db";
import { eq, gte, sql } from "drizzle-orm";

const router = Router();

function getAuthUserId(req: any): number {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return 1;
  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return parseInt(decoded.split(":")[0]) || 1;
  } catch {
    return 1;
  }
}

router.get("/dashboard/summary", async (req, res) => {
  const userId = getAuthUserId(req);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const balance = user ? Number(user.balance) : 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const allRecords = await db.select().from(messageRecordsTable);
  const todayRecords = allRecords.filter(r => r.createdAt >= todayStart);
  const monthRecords = allRecords.filter(r => r.createdAt >= monthStart);

  const todaySent = todayRecords.length;
  const monthSent = monthRecords.length;
  const todayDelivered = todayRecords.filter(r => r.sendResult === "delivered").length;
  const todayFailed = todayRecords.filter(r => r.sendResult === "failed").length;
  const successRate = todaySent > 0 ? Math.round((todayDelivered / todaySent) * 1000) / 10 : 0;

  const products = await db.select().from(productsTable).where(eq(productsTable.userId, userId));
  const productBalances = products.map(p => ({
    productId: p.id,
    productName: p.name,
    balance: Number(p.balance),
  }));

  res.json({
    balance,
    todaySent,
    monthSent,
    todayDelivered,
    todayFailed,
    successRate,
    productBalances,
  });
});

router.get("/dashboard/traffic", async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const records = await db.select({
    createdAt: messageRecordsTable.createdAt,
    productId: messageRecordsTable.productId,
  }).from(messageRecordsTable).where(gte(messageRecordsTable.createdAt, monthStart));

  const products = await db.select().from(productsTable);
  const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

  const grouped: Record<string, number> = {};
  for (const r of records) {
    const day = r.createdAt.getDate();
    const key = `${day}:${r.productId}`;
    grouped[key] = (grouped[key] ?? 0) + 1;
  }

  const result = Object.entries(grouped).map(([key, count]) => {
    const [day, productId] = key.split(":").map(Number);
    return {
      day,
      productId,
      productName: productMap[productId] ?? "Unknown",
      count,
    };
  });

  result.sort((a, b) => a.day - b.day || a.productId - b.productId);

  res.json(result);
});

export default router;
