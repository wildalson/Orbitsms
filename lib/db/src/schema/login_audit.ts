import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const loginAuditTable = pgTable("login_audit", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  username: text("username").notNull(),
  success: boolean("success").notNull(),
  role: text("role"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("idx_login_audit_user_id").on(t.userId),
  index("idx_login_audit_created_at").on(t.createdAt),
]);
