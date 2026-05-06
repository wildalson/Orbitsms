import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { tasksTable } from "./tasks";

export const billingRecordsTable = pgTable("billing_records", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  taskId: integer("task_id").references(() => tasksTable.id),
  type: text("type", { enum: ["sms", "recharge"] }).notNull(),
  amount: numeric("amount", { precision: 18, scale: 6 }).notNull(),
  messageCount: integer("message_count").notNull().default(0),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBillingRecordSchema = createInsertSchema(billingRecordsTable).omit({ id: true, createdAt: true });
export type InsertBillingRecord = z.infer<typeof insertBillingRecordSchema>;
export type BillingRecord = typeof billingRecordsTable.$inferSelect;
