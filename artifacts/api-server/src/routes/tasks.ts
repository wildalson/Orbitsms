import { Router } from "express";
import { db, tasksTable, productsTable, messageRecordsTable, billingRecordsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateTaskBody, ListTasksQueryParams } from "@workspace/api-zod";
import { sendMessagesOverSmpp } from "../lib/smpp-client";
import crypto from "crypto";

const router = Router();
const RECORD_INSERT_CHUNK_SIZE = 5_000;

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
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const params = parsed.data;
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const conditions = [];
  if (params.status) {
    conditions.push(eq(tasksTable.status, params.status));
  }
  if (params.productId) {
    conditions.push(eq(tasksTable.productId, params.productId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const tasks = await db.select({
    task: tasksTable,
    productName: productsTable.name,
  })
    .from(tasksTable)
    .leftJoin(productsTable, eq(tasksTable.productId, productsTable.id))
    .where(whereClause)
    .orderBy(desc(tasksTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = await db.select().from(tasksTable).where(whereClause);

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
  const { name, productId, messageContent, recipients, scheduledAt } = parsed.data;
  const senderId = parsed.data.senderId?.trim() ?? "";

  const [productRow] = await db.select({
    product: productsTable,
    user: usersTable,
  })
    .from(productsTable)
    .leftJoin(usersTable, eq(productsTable.userId, usersTable.id))
    .where(eq(productsTable.id, productId));

  if (!productRow) {
    res.status(400).json({ error: "Product not found" });
    return;
  }
  const product = productRow.product;
  const owner = productRow.user;

  const costPerSms = Number(owner?.smsRate ?? 0.25);
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

  const hasSmppCredentials = !!(
    owner?.smppHost &&
    owner.smppPort &&
    owner.smppSystemId &&
    owner.smppPassword
  );
  const smppResults = hasSmppCredentials
    ? await sendMessagesOverSmpp(
        {
          host: owner.smppHost!,
          port: Number(owner.smppPort),
          systemId: owner.smppSystemId!,
          password: owner.smppPassword!,
          appId: owner.httpApiKey,
        },
        recipients.map((recipient) => ({
          recipient,
          content: messageContent,
          senderId: parsed.data.senderId?.trim() ?? "",
        })),
      )
    : null;

  const simulatedResults = ["submitted", "delivered", "rejected"] as const;
  let deliveredCount = 0;
  let failedCount = 0;

  for (let start = 0; start < recipients.length; start += RECORD_INSERT_CHUNK_SIZE) {
    const chunk = recipients.slice(start, start + RECORD_INSERT_CHUNK_SIZE);
    const recordValues = chunk.map((recipient, index) => {
      const smppResult = smppResults?.[start + index];
      const sendResult =
        smppResult?.status ??
        simulatedResults[Math.floor(Math.random() * simulatedResults.length)];
      const isDelivered = sendResult === "delivered";
      if (isDelivered) deliveredCount += 1;
      if (sendResult === "rejected") failedCount += 1;

      return {
        taskId: task.id,
        productId,
        recipient,
        sendResult,
        failReason: sendResult === "rejected" ? (smppResult?.error ?? "Network error") : null,
        deliveredAt: isDelivered ? new Date() : null,
        deliveryLatency: isDelivered ? Math.floor(Math.random() * 20) + 2 : null,
        cost: String(costPerSms),
        messageId: smppResult?.messageId ?? crypto.randomBytes(8).toString("hex"),
      };
    });

    await db.insert(messageRecordsTable).values(recordValues);
  }

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
