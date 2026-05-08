import { db, messageRecordsTable, productsTable, tasksTable, usersTable } from "@workspace/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { logger } from "./logger";
import { fetchLaafficReports } from "./laaffic-reports";

const POLL_INTERVAL_MS = 60_000;
const LOOKBACK_DAYS = 7;
let running = false;

async function refreshTaskCounters(taskIds: number[]) {
  const uniqueTaskIds = Array.from(new Set(taskIds));

  for (const taskId of uniqueTaskIds) {
    const [counts] = await db.select({
      delivered: sql<number>`count(*) filter (where ${messageRecordsTable.sendResult} = 'delivered')`,
      failed: sql<number>`count(*) filter (where ${messageRecordsTable.sendResult} = 'failed')`,
      sent: sql<number>`count(*)`,
    })
      .from(messageRecordsTable)
      .where(eq(messageRecordsTable.taskId, taskId));

    await db.update(tasksTable).set({
      deliveredCount: Number(counts?.delivered ?? 0),
      failedCount: Number(counts?.failed ?? 0),
      sentCount: Number(counts?.sent ?? 0),
    }).where(eq(tasksTable.id, taskId));
  }
}

export async function pollDeliveryReports() {
  if (running) return;
  running = true;

  try {
    const lookback = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const rows = await db.select({
      record: messageRecordsTable,
      appId: usersTable.httpApiKey,
      apiKey: usersTable.smppSystemId,
      apiSecret: usersTable.smppPassword,
    })
      .from(messageRecordsTable)
      .leftJoin(tasksTable, eq(messageRecordsTable.taskId, tasksTable.id))
      .leftJoin(productsTable, eq(messageRecordsTable.productId, productsTable.id))
      .leftJoin(usersTable, eq(productsTable.userId, usersTable.id))
      .where(and(
        eq(messageRecordsTable.sendResult, "submitted"),
        gte(messageRecordsTable.createdAt, lookback),
      ));

    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = `${row.appId ?? ""}:${row.apiKey ?? ""}:${row.apiSecret ?? ""}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    const changedTaskIds: number[] = [];

    for (const group of groups.values()) {
      const first = group[0];
      if (!first?.appId || !first.apiKey || !first.apiSecret) {
        continue;
      }

      const reports = await fetchLaafficReports(
        {
          appId: first.appId,
          apiKey: first.apiKey,
          apiSecret: first.apiSecret,
        },
        group.map((r) => r.record.messageId),
      );

      const updates = group
        .map((row) => ({ row, report: reports.get(row.record.messageId) }))
        .filter((item): item is { row: typeof group[number]; report: NonNullable<typeof item.report> } =>
          Boolean(item.report),
        );

      for (const { row, report } of updates) {
        await db.update(messageRecordsTable).set({
          sendResult: report.sendResult,
          deliveredAt: report.deliveredAt,
          failReason: report.failReason,
        }).where(eq(messageRecordsTable.id, row.record.id));
        changedTaskIds.push(row.record.taskId);
      }
    }

    if (changedTaskIds.length > 0) {
      await refreshTaskCounters(changedTaskIds);
      logger.info({ updated: changedTaskIds.length }, "Delivery reports refreshed");
    }
  } catch (err) {
    logger.warn({ err }, "Delivery report polling failed");
  } finally {
    running = false;
  }
}

export function startDeliveryReportPoller() {
  setTimeout(() => {
    void pollDeliveryReports();
  }, 10_000);

  setInterval(() => {
    void pollDeliveryReports();
  }, POLL_INTERVAL_MS);
}
