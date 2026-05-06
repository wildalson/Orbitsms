import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

export const channelsTable = pgTable("channels", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  name: text("name").notNull(),
  protocol: text("protocol", { enum: ["SMPP", "HTTP"] }).notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  maxBindings: integer("max_bindings").notNull().default(5),
  channelType: text("channel_type", { enum: ["transmitter", "receiver", "transceiver"] }).notNull(),
  status: text("status", { enum: ["active", "inactive", "error"] }).notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChannelSchema = createInsertSchema(channelsTable).omit({ id: true, createdAt: true });
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channelsTable.$inferSelect;
