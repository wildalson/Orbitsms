import { pgTable, serial, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => usersTable.id),
  name: text("name").notNull(),
  spid: text("spid").notNull(),
  type: text("type", { enum: ["OTP", "Market", "WS", "International"] }).notNull(),
  balance: numeric("balance", { precision: 18, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_products_user_id").on(t.userId),
]);

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
