import { billingRecordsTable, db, messageRecordsTable, productsTable, tasksTable, usersTable } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";

export async function refreshTaskCounters(taskIds: number[]) {
  const uniqueTaskIds = Array.from(new Set(taskIds));

  for (const taskId of uniqueTaskIds) {
    const [counts] = await db.select({
      delivered: sql<number>`count(*) filter (where ${messageRecordsTable.sendResult} = 'delivered')`,
      failed: sql<number>`count(*) filter (where ${messageRecordsTable.sendResult} = 'failed')`,
      sent: sql<number>`count(*)`,
      charged: sql<number>`sum(${messageRecordsTable.cost}) filter (where ${messageRecordsTable.sendResult} = 'delivered')`,
    })
      .from(messageRecordsTable)
      .where(eq(messageRecordsTable.taskId, taskId));

    await db.update(tasksTable).set({
      deliveredCount: Number(counts?.delivered ?? 0),
      failedCount: Number(counts?.failed ?? 0),
      sentCount: Number(counts?.sent ?? 0),
      cost: String(Number(counts?.charged ?? 0)),
    }).where(eq(tasksTable.id, taskId));
  }
}

export async function chargeDeliveredRecords(recordIds: number[]) {
  const uniqueRecordIds = Array.from(new Set(recordIds));
  if (uniqueRecordIds.length === 0) return;

  const deliveredRows = await db.select({
    record: messageRecordsTable,
    task: tasksTable,
    product: productsTable,
    user: usersTable,
  })
    .from(messageRecordsTable)
    .leftJoin(tasksTable, eq(messageRecordsTable.taskId, tasksTable.id))
    .leftJoin(productsTable, eq(messageRecordsTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(productsTable.userId, usersTable.id))
    .where(and(
      inArray(messageRecordsTable.id, uniqueRecordIds),
      eq(messageRecordsTable.sendResult, "delivered"),
    ));

  for (const row of deliveredRows) {
    if (!row.product || !row.user) continue;

    const existing = await db.select({ id: billingRecordsTable.id })
      .from(billingRecordsTable)
      .where(and(
        eq(billingRecordsTable.taskId, row.record.taskId),
        eq(billingRecordsTable.description, `Delivered SMS: ${row.record.messageId}`),
      ))
      .limit(1);

    if (existing.length > 0) continue;

    const amount = Number(row.record.cost);

    await db.insert(billingRecordsTable).values({
      productId: row.record.productId,
      taskId: row.record.taskId,
      type: "sms",
      amount: String(amount),
      messageCount: 1,
      description: `Delivered SMS: ${row.record.messageId}`,
    });

    await db.update(usersTable).set({
      balance: sql`${usersTable.balance} - ${amount}`,
    }).where(eq(usersTable.id, row.user.id));

    await db.update(productsTable).set({
      balance: sql`${productsTable.balance} - ${amount}`,
    }).where(eq(productsTable.id, row.product.id));
  }
}
