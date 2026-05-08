import { Router } from "express";
import { db, usersTable, messageRecordsTable, productsTable } from "@workspace/db";
import { eq, gte, inArray, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const userId = (req as any).user.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const balance = user ? Number(user.balance) : 0;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const userProducts = await db.select().from(productsTable).where(eq(productsTable.userId, userId));
  const userProductIds = userProducts.map((p) => p.id);

  const [stats] = userProductIds.length > 0
    ? await db.select({
        todaySent: sql<number>`count(*) filter (where ${messageRecordsTable.createdAt} >= ${todayStart})`,
        monthSent: sql<number>`count(*) filter (where ${messageRecordsTable.createdAt} >= ${monthStart})`,
        todayDelivered: sql<number>`count(*) filter (where ${messageRecordsTable.createdAt} >= ${todayStart} and ${messageRecordsTable.sendResult} = 'delivered')`,
        todayFailed: sql<number>`count(*) filter (where ${messageRecordsTable.createdAt} >= ${todayStart} and ${messageRecordsTable.sendResult} = 'failed')`,
      }).from(messageRecordsTable).where(inArray(messageRecordsTable.productId, userProductIds))
    : [{ todaySent: 0, monthSent: 0, todayDelivered: 0, todayFailed: 0 }];

  const todaySent = Number(stats?.todaySent ?? 0);
  const monthSent = Number(stats?.monthSent ?? 0);
  const todayDelivered = Number(stats?.todayDelivered ?? 0);
  const todayFailed = Number(stats?.todayFailed ?? 0);
  const successRate = todaySent > 0 ? Math.round((todayDelivered / todaySent) * 1000) / 10 : 0;

  const productBalances = userProducts.map(p => ({
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

router.get("/dashboard/traffic", async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const user = (req as any).user;

  const records = await db.select({
    createdAt: messageRecordsTable.createdAt,
    productId: messageRecordsTable.productId,
  })
    .from(messageRecordsTable)
    .leftJoin(productsTable, eq(messageRecordsTable.productId, productsTable.id))
    .where(user.role === "admin"
      ? gte(messageRecordsTable.createdAt, monthStart)
      : sql`${messageRecordsTable.createdAt} >= ${monthStart} and ${productsTable.userId} = ${user.id}`);

  const products = await db.select().from(productsTable)
    .where(user.role === "admin" ? undefined : eq(productsTable.userId, user.id));
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
