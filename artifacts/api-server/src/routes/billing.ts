import { Router } from "express";
import { db, billingRecordsTable, productsTable, tasksTable, messageRecordsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { ListBillingQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/billing", async (req, res) => {
  const parsed = ListBillingQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const params = parsed.data;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const conditions = [];
  const user = (req as any).user;
  if (user.role !== "admin") {
    conditions.push(eq(productsTable.userId, user.id));
  }
  if (params.productId) {
    conditions.push(eq(billingRecordsTable.productId, params.productId));
  }
  if (params.startTime) {
    conditions.push(gte(billingRecordsTable.createdAt, params.startTime as Date));
  }
  if (params.endTime) {
    conditions.push(lte(billingRecordsTable.createdAt, params.endTime as Date));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const records = await db.select({
    record: billingRecordsTable,
    productName: productsTable.name,
    taskName: tasksTable.name,
    clientName: usersTable.username,
  })
    .from(billingRecordsTable)
    .leftJoin(productsTable, eq(billingRecordsTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(productsTable.userId, usersTable.id))
    .leftJoin(tasksTable, eq(billingRecordsTable.taskId, tasksTable.id))
    .where(whereClause)
    .orderBy(desc(billingRecordsTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRows = await db.select({ count: sql<number>`count(*)` })
    .from(billingRecordsTable)
    .leftJoin(productsTable, eq(billingRecordsTable.productId, productsTable.id))
    .where(whereClause);

  res.json({
    data: records.map(r => ({
      id: r.record.id,
      productId: r.record.productId,
      productName: r.productName ?? "",
      clientName: r.clientName ?? "",
      taskId: r.record.taskId,
      taskName: r.taskName ?? null,
      type: r.record.type,
      amount: Number(r.record.amount),
      messageCount: r.record.messageCount,
      description: r.record.description,
      createdAt: r.record.createdAt,
    })),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  });
});

router.get("/billing/summary", async (req, res) => {
  const user = (req as any).user;
  const bills = await db.select({ bill: billingRecordsTable })
    .from(billingRecordsTable)
    .leftJoin(productsTable, eq(billingRecordsTable.productId, productsTable.id))
    .where(user.role === "admin" ? undefined : eq(productsTable.userId, user.id));
  const allRecords = await db.select({ record: messageRecordsTable })
    .from(messageRecordsTable)
    .leftJoin(productsTable, eq(messageRecordsTable.productId, productsTable.id))
    .where(user.role === "admin" ? undefined : eq(productsTable.userId, user.id));

  const billRows = bills.map((r) => r.bill);
  const recordRows = allRecords.map((r) => r.record);
  const smsBills = billRows.filter((b) => b.type === "sms");
  const totalExpense = smsBills.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalMessages = smsBills.reduce((sum, b) => sum + b.messageCount, 0);
  const totalSent = recordRows.length;
  const totalDelivered = recordRows.filter(r => r.sendResult === "delivered").length;
  const totalFailed = recordRows.filter(r => r.sendResult === "failed").length;

  res.json({
    totalExpense: Math.round(totalExpense * 10000) / 10000,
    totalMessages,
    totalSent,
    totalDelivered,
    totalFailed,
    deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 1000) / 10 : 0,
  });
});

export default router;
