import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tasksTable } from "./tasks";
import { productsTable } from "./products";

export const messageRecordsTable = pgTable("message_records", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  recipient: text("recipient").notNull(),
  sendResult: text("send_result", {
    enum: [
      "submitted",
      "delivered",
      "failed",
    ],
  }).notNull().default("submitted"),
  failReason: text("fail_reason"),
  deliveredAt: timestamp("delivered_at"),
  deliveryLatency: integer("delivery_latency"),
  cost: numeric("cost", { precision: 18, scale: 6 }).notNull().default("0.250000"),
  messageId: text("message_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageRecordSchema = createInsertSchema(messageRecordsTable).omit({ id: true, createdAt: true });
export type InsertMessageRecord = z.infer<typeof insertMessageRecordSchema>;
export type MessageRecord = typeof messageRecordsTable.$inferSelect;
