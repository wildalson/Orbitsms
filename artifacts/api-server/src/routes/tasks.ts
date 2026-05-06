import { Router } from "express";
import { db, tasksTable, productsTable, messageRecordsTable, billingRecordsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateTaskBody, ListTasksQueryParams } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function mapTask(t: typeof tasksTable.$inferSelect, productName: string) {
  return {
    id: t.id,
    name: t.name,
    productId: t.productId,
    productName,
    messageContent: t.messageContent,
    senderId: t.senderId,
    status: t.status,
    totalRecipients: t.totalRecipients,
    sentCount: t.sentCount,
    deliveredCount: t.deliveredCount,
    failedCount: t.failedCount,
    cost: Number(t.cost),
    scheduledAt: t.scheduledAt,
    createdAt: t.createdAt,
  };
}

router.get("/tasks", async (req, res) => {
  const parsed = ListTasksQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const tasks = await db.select({
    task: tasksTable,
    productName: productsTable.name,
  })
    .from(tasksTable)
    .leftJoin(productsTable, eq(tasksTable.productId, productsTable.id))
    .orderBy(desc(tasksTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = await db.select().from(tasksTable);

  res.json({
    data: tasks.map(r => mapTask(r.task, r.productName ?? "")),
    total: total.length,
    page,
    pageSize,
  });
});

router.post("/tasks", async (req, res) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { name, productId, messageContent, senderId, recipients, scheduledAt } = parsed.data;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(400).json({ error: "Product not found" });
    return;
  }

  const costPerSms = 0.005;
  const totalCost = recipients.length * costPerSms;

  const [task] = await db.insert(tasksTable).values({
    productId,
    name,
    messageContent,
    senderId,
    status: "sending",
    totalRecipients: recipients.length,
    sentCount: recipients.length,
    deliveredCount: 0,
    failedCount: 0,
    cost: String(totalCost),
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
  }).returning();

  const results = ["submitted", "delivered", "failed"] as const;
  const recordValues = recipients.map((recipient) => {
    const sendResult = results[Math.floor(Math.random() * results.length)];
    const isDelivered = sendResult === "delivered";
    return {
      taskId: task.id,
      productId,
      recipient,
      sendResult: sendResult as "submitted" | "delivered" | "failed",
      failReason: sendResult === "failed" ? "Network error" : null,
      deliveredAt: isDelivered ? new Date() : null,
      deliveryLatency: isDelivered ? Math.floor(Math.random() * 20) + 2 : null,
      cost: String(costPerSms),
      messageId: crypto.randomBytes(8).toString("hex"),
    };
  });

  if (recordValues.length > 0) {
    await db.insert(messageRecordsTable).values(recordValues);
  }

  const deliveredCount = recordValues.filter(r => r.sendResult === "delivered").length;
  const failedCount = recordValues.filter(r => r.sendResult === "failed").length;

  const [updated] = await db.update(tasksTable).set({
    status: "completed",
    deliveredCount,
    failedCount,
  }).where(eq(tasksTable.id, task.id)).returning();

  await db.insert(billingRecordsTable).values({
    productId,
    taskId: task.id,
    type: "sms",
    amount: String(totalCost),
    messageCount: recipients.length,
    description: `SMS task: ${name}`,
  });

  res.status(201).json(mapTask(updated, product.name));
});

router.get("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [row] = await db.select({
    task: tasksTable,
    productName: productsTable.name,
  }).from(tasksTable)
    .leftJoin(productsTable, eq(tasksTable.productId, productsTable.id))
    .where(eq(tasksTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const t = row.task;
  const successRate = t.sentCount > 0 ? (t.deliveredCount / t.sentCount) * 100 : 0;
  const deliveryRate = t.totalRecipients > 0 ? (t.deliveredCount / t.totalRecipients) * 100 : 0;

  res.json({
    ...mapTask(t, row.productName ?? ""),
    successRate: Math.round(successRate * 10) / 10,
    deliveryRate: Math.round(deliveryRate * 10) / 10,
  });
});

router.delete("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  res.status(204).end();
});

export default router;
