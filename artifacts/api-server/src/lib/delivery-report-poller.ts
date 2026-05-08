import { db, messageRecordsTable, productsTable, tasksTable, usersTable } from "@workspace/db";
import { and, eq, gte } from "drizzle-orm";
import { logger } from "./logger";
import { fetchLaafficReports } from "./laaffic-reports";
import { chargeDeliveredRecords, refreshTaskCounters } from "./delivery-charging";

const POLL_INTERVAL_MS = 60_000;
const LOOKBACK_DAYS = 7;
let running = false;

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
    const deliveredRecordIds: number[] = [];

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
        if (report.sendResult === "delivered") {
          deliveredRecordIds.push(row.record.id);
        }
      }
    }

    if (changedTaskIds.length > 0) {
      try {
        await chargeDeliveredRecords(deliveredRecordIds);
        await refreshTaskCounters(changedTaskIds);
        logger.info({ updated: changedTaskIds.length }, "Delivery reports refreshed");
      } catch (err) {
        logger.error({ err, recordIds: deliveredRecordIds }, "Failed to charge delivered records");
      }
    }
  } catch (err) {
    logger.warn({ err }, "Delivery report polling failed");
  } finally {
    running = false;
  }
}

let pollerInterval: ReturnType<typeof setInterval> | null = null;
let pollerTimeout: ReturnType<typeof setTimeout> | null = null;

export function startDeliveryReportPoller() {
  pollerTimeout = setTimeout(() => {
    void pollDeliveryReports();
  }, 10_000);

  pollerInterval = setInterval(() => {
    void pollDeliveryReports();
  }, POLL_INTERVAL_MS);
}

export function stopDeliveryReportPoller() {
  if (pollerTimeout) clearTimeout(pollerTimeout);
  if (pollerInterval) clearInterval(pollerInterval);
}
