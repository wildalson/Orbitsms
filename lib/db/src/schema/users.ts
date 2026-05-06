import { pgTable, serial, text, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  companyName: text("company_name"),
  role: text("role", { enum: ["admin", "client"] }).notNull().default("client"),
  status: text("status", { enum: ["active", "suspended"] }).notNull().default("active"),
  smsRate: numeric("sms_rate", { precision: 10, scale: 6 }).notNull().default("0.250000"),
  permissions: text("permissions").notNull().default('{"sendSms":true,"sendBulkSms":true,"uploadContacts":false,"viewDeliveryReports":true,"accessApiCredentials":false,"useSenderId":true,"exportReports":true}'),
  balance: numeric("balance", { precision: 18, scale: 4 }).notNull().default("0"),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  smppHost: text("smpp_host"),
  smppPort: text("smpp_port"),
  smppSystemId: text("smpp_system_id"),
  smppPassword: text("smpp_password"),
  httpApiKey: text("http_api_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
