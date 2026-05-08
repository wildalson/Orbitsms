import { Router } from "express";
import { db, messageRecordsTable, tasksTable, productsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { ListRecordsQueryParams } from "@workspace/api-zod";
import { detectPhilippineOperator } from "../lib/ph-operators";
import { queryMessagesOverSmpp } from "../lib/smpp-client";

const router = Router();

async function refreshLaafficReportsForRecords(records: Array<{
  record: typeof messageRecordsTable.$inferSelect;
  senderId: string | null;
  smppHost: string | null;
  smppPort: string | null;
  smppSystemId: string | null;
  smppPassword: string | null;
  appId: string | null;
}>) {
  const candidates = records.filter((r) =>
    r.record.sendResult === "submitted",
  );
  if (candidates.length === 0) return;

  const first = candidates[0];
  if (!first?.smppHost || !first.smppPort || !first.smppSystemId || !first.smppPassword) return;

  const reports = await queryMessagesOverSmpp(
    {
      host: first.smppHost,
      port: Number(first.smppPort),
      systemId: first.smppSystemId,
      password: first.smppPassword,
      appId: first.appId,
    },
    candidates.map((r) => ({
      messageId: r.record.messageId,
      senderId: r.senderId ?? "",
    })),
  );

  for (const candidate of candidates) {
    const report = reports.get(candidate.record.messageId);
    if (!report) continue;
    await db.update(messageRecordsTable).set({
      sendResult: report.sendResult,
      deliveredAt: report.deliveredAt,
      failReason: report.failReason,
    }).where(eq(messageRecordsTable.id, candidate.record.id));
  }
}

router.get("/records", async (req, res) => {
  const parsed = ListRecordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const params = parsed.data;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const conditions = [];
  if (params.sendResult) {
    conditions.push(eq(messageRecordsTable.sendResult, params.sendResult));
  }
  if (params.productId) {
    conditions.push(eq(messageRecordsTable.productId, params.productId));
  }
  if (params.taskId) {
    conditions.push(eq(messageRecordsTable.taskId, params.taskId));
  }
  if (params.startTime) {
    conditions.push(gte(messageRecordsTable.createdAt, params.startTime as Date));
  }
  if (params.endTime) {
    conditions.push(lte(messageRecordsTable.createdAt, params.endTime as Date));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const records = await db.select({
    record: messageRecordsTable,
    taskName: tasksTable.name,
    messageContent: tasksTable.messageContent,
    senderId: tasksTable.senderId,
    productName: productsTable.name,
    smppHost: usersTable.smppHost,
    smppPort: usersTable.smppPort,
    smppSystemId: usersTable.smppSystemId,
    smppPassword: usersTable.smppPassword,
    appId: usersTable.httpApiKey,
  })
    .from(messageRecordsTable)
    .leftJoin(tasksTable, eq(messageRecordsTable.taskId, tasksTable.id))
    .leftJoin(productsTable, eq(messageRecordsTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(productsTable.userId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(messageRecordsTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  await refreshLaafficReportsForRecords(records);

  const refreshedRecords = records.length > 0
    ? await db.select({
      record: messageRecordsTable,
      taskName: tasksTable.name,
      messageContent: tasksTable.messageContent,
      senderId: tasksTable.senderId,
      productName: productsTable.name,
    })
      .from(messageRecordsTable)
      .leftJoin(tasksTable, eq(messageRecordsTable.taskId, tasksTable.id))
      .leftJoin(productsTable, eq(messageRecordsTable.productId, productsTable.id))
      .where(inArray(messageRecordsTable.id, records.map((r) => r.record.id)))
      .orderBy(desc(messageRecordsTable.createdAt))
    : [];

  const totalRows = await db.select({ count: sql<number>`count(*)` })
    .from(messageRecordsTable)
    .where(whereClause);

  res.json({
    data: refreshedRecords.map(r => ({
      id: r.record.id,
      taskId: r.record.taskId,
      taskName: r.taskName ?? "",
      messageContent: r.messageContent ?? "",
      senderId: r.senderId || "Laaffic default",
      productId: r.record.productId,
      productName: r.productName ?? "",
      operator: detectPhilippineOperator(r.record.recipient),
      recipient: r.record.recipient,
      sendResult: r.record.sendResult,
      failReason: r.record.failReason,
      deliveredAt: r.record.deliveredAt,
      deliveryLatency: r.record.deliveryLatency,
      cost: Number(r.record.cost),
      messageId: r.record.messageId,
      createdAt: r.record.createdAt,
    })),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  });
});

router.get("/records/stats", async (_req, res) => {
  const allRecords = await db.select().from(messageRecordsTable);
  const totalSent = allRecords.length;
  const totalDelivered = allRecords.filter(r => r.sendResult === "delivered").length;
  const totalFailed = allRecords.filter(r => r.sendResult === "failed").length;
  const totalCost = allRecords.reduce((sum, r) => sum + Number(r.cost), 0);
  const latencies = allRecords.filter(r => r.deliveryLatency != null).map(r => r.deliveryLatency!);
  const avgLatencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

  res.json({
    totalSent,
    totalDelivered,
    totalFailed,
    deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 1000) / 10 : 0,
    totalCost: Math.round(totalCost * 1000000) / 1000000,
    avgLatencyMs,
  });
});

export default router;
