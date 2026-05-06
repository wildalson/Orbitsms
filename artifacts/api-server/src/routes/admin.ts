import { Router } from "express";
import { db, usersTable, messageRecordsTable, tasksTable, productsTable, billingRecordsTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "sms_gateway_salt").digest("hex");
}

async function requireAdmin(req: any, res: any): Promise<number | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const userId = parseInt(decoded.split(":")[0]);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin only" });
      return null;
    }
    return userId;
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return null;
  }
}

router.get("/admin/stats", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const clients = await db.select().from(usersTable).where(eq(usersTable.role, "client"));
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === "active").length;
  const totalBalance = clients.reduce((s, c) => s + Number(c.balance), 0);

  const allRecords = await db.select().from(messageRecordsTable);
  const totalSent = allRecords.length;
  const totalDelivered = allRecords.filter(r => r.sendResult === "delivered").length;
  const totalFailed = allRecords.filter(r => r.sendResult === "failed").length;
  const totalRevenue = allRecords.reduce((s, r) => s + Number(r.cost), 0);

  res.json({
    totalClients,
    activeClients,
    totalBalance: Math.round(totalBalance * 100) / 100,
    totalSent,
    totalDelivered,
    totalFailed,
    deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 1000) / 10 : 0,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
  });
});

router.get("/admin/clients", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const clients = await db.select({
    id: usersTable.id,
    username: usersTable.username,
    email: usersTable.email,
    phone: usersTable.phone,
    companyName: usersTable.companyName,
    status: usersTable.status,
    smsRate: usersTable.smsRate,
    balance: usersTable.balance,
    permissions: usersTable.permissions,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.role, "client")).orderBy(desc(usersTable.createdAt));

  res.json(clients.map(c => ({
    ...c,
    smsRate: Number(c.smsRate),
    balance: Number(c.balance),
    permissions: (() => { try { return JSON.parse(c.permissions); } catch { return {}; } })(),
  })));
});

router.post("/admin/clients", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { username, email, password, phone, companyName, smsRate, balance, permissions } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: "username, email, password are required" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length > 0) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const defaultPerms = { sendSms: true, sendBulkSms: true, uploadContacts: false, viewDeliveryReports: true, accessApiCredentials: false, useSenderId: true, exportReports: true };

  const [user] = await db.insert(usersTable).values({
    username,
    email,
    password: hashPassword(password),
    phone: phone ?? null,
    companyName: companyName ?? null,
    role: "client",
    status: "active",
    smsRate: String(smsRate ?? 0.25),
    balance: String(balance ?? 0),
    permissions: JSON.stringify(permissions ?? defaultPerms),
  }).returning();

  res.status(201).json({
    ...user,
    smsRate: Number(user.smsRate),
    balance: Number(user.balance),
    permissions: JSON.parse(user.permissions),
  });
});

router.get("/admin/clients/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const id = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, "client")));
  if (!user) { res.status(404).json({ error: "Client not found" }); return; }

  const billingHistory = await db.select().from(billingRecordsTable)
    .orderBy(desc(billingRecordsTable.createdAt))
    .limit(20);

  res.json({
    ...user,
    smsRate: Number(user.smsRate),
    balance: Number(user.balance),
    permissions: (() => { try { return JSON.parse(user.permissions); } catch { return {}; } })(),
    billing: billingHistory.map(b => ({
      id: b.id,
      type: b.type,
      amount: Number(b.amount),
      description: b.description,
      createdAt: b.createdAt,
    })),
  });
});

router.put("/admin/clients/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const id = parseInt(req.params.id);
  const { username, email, phone, companyName, smsRate, status, permissions, password } = req.body;

  const updates: Record<string, any> = {};
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (companyName !== undefined) updates.companyName = companyName;
  if (smsRate !== undefined) updates.smsRate = String(smsRate);
  if (status !== undefined) updates.status = status;
  if (permissions !== undefined) updates.permissions = JSON.stringify(permissions);
  if (password) updates.password = hashPassword(password);

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Client not found" }); return; }

  res.json({
    ...updated,
    smsRate: Number(updated.smsRate),
    balance: Number(updated.balance),
    permissions: (() => { try { return JSON.parse(updated.permissions); } catch { return {}; } })(),
  });
});

router.delete("/admin/clients/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const id = parseInt(req.params.id);
  await db.delete(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, "client")));
  res.json({ success: true });
});

router.post("/admin/clients/:id/balance", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const id = parseInt(req.params.id);
  const { amount, description } = req.body;
  if (typeof amount !== "number") { res.status(400).json({ error: "amount required (number, can be negative to deduct)" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Client not found" }); return; }

  const newBalance = Number(user.balance) + amount;
  const [updated] = await db.update(usersTable).set({ balance: String(Math.max(0, newBalance)) }).where(eq(usersTable.id, id)).returning();

  const products = await db.select().from(productsTable).limit(1);
  if (products.length > 0) {
    await db.insert(billingRecordsTable).values({
      productId: products[0].id,
      type: amount >= 0 ? "recharge" : "sms",
      amount: String(Math.abs(amount)),
      messageCount: 0,
      description: description ?? (amount >= 0 ? `Admin top-up for ${user.username}` : `Admin deduction for ${user.username}`),
    });
  }

  res.json({ balance: Number(updated.balance) });
});

router.get("/admin/records", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const page = parseInt(String(req.query.page ?? 1));
  const pageSize = parseInt(String(req.query.pageSize ?? 20));
  const sendResult = req.query.sendResult as string | undefined;

  const conditions = sendResult ? [eq(messageRecordsTable.sendResult, sendResult as any)] : [];
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const records = await db.select({
    record: messageRecordsTable,
    taskName: tasksTable.name,
    messageContent: tasksTable.messageContent,
    senderId: tasksTable.senderId,
    productName: productsTable.name,
  })
    .from(messageRecordsTable)
    .leftJoin(tasksTable, eq(messageRecordsTable.taskId, tasksTable.id))
    .leftJoin(productsTable, eq(messageRecordsTable.productId, productsTable.id))
    .where(whereClause)
    .orderBy(desc(messageRecordsTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const totalRows = await db.select({ count: sql<number>`count(*)` })
    .from(messageRecordsTable)
    .where(whereClause);

  res.json({
    data: records.map(r => ({
      id: r.record.id,
      taskName: r.taskName ?? "—",
      messageContent: r.messageContent ?? "",
      senderId: r.senderId ?? "",
      productName: r.productName ?? "",
      recipient: r.record.recipient,
      sendResult: r.record.sendResult,
      failReason: r.record.failReason,
      deliveredAt: r.record.deliveredAt,
      deliveryLatency: r.record.deliveryLatency,
      cost: Number(r.record.cost),
      createdAt: r.record.createdAt,
    })),
    total: Number(totalRows[0]?.count ?? 0),
    page,
    pageSize,
  });
});

export default router;
