import { Router } from "express";
import { db, usersTable, messageRecordsTable, tasksTable, productsTable, billingRecordsTable, channelsTable } from "@workspace/db";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { detectPhilippineOperator } from "../lib/ph-operators";
import { fetchLaafficReports } from "../lib/laaffic-reports";
import { chargeDeliveredRecords, refreshTaskCounters } from "../lib/delivery-charging";
import { hashPassword, requireAdmin } from "../lib/auth";

const router = Router();

function formatClient(c: any) {
  return {
    ...c,
    password: undefined,
    smppPassword: c.smppPassword ? "configured" : null,
    smsRate: Number(c.smsRate),
    balance: Number(c.balance),
    emailVerified: c.emailVerified ?? false,
    phoneVerified: c.phoneVerified ?? false,
    permissions: (() => { try { return JSON.parse(c.permissions); } catch { return {}; } })(),
  };
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
  const totalRevenue = allRecords
    .filter((r) => r.sendResult === "delivered")
    .reduce((s, r) => s + Number(r.cost), 0);

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
    emailVerified: usersTable.emailVerified,
    phoneVerified: usersTable.phoneVerified,
    smppHost: usersTable.smppHost,
    smppPort: usersTable.smppPort,
    smppSystemId: usersTable.smppSystemId,
    smppPassword: usersTable.smppPassword,
    httpApiKey: usersTable.httpApiKey,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(eq(usersTable.role, "client")).orderBy(desc(usersTable.createdAt));

  res.json(clients.map(formatClient));
});

router.post("/admin/clients", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { username, email, password, phone, companyName, smsRate, balance, permissions,
    smppHost, smppPort, smppSystemId, smppPassword, httpApiKey } = req.body;
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
    password: await hashPassword(password),
    phone: phone || null,
    companyName: companyName || null,
    role: "client",
    status: "active",
    smsRate: String(smsRate ?? 0.25),
    balance: String(balance ?? 0),
    permissions: JSON.stringify(permissions ?? defaultPerms),
    smppHost: smppHost || null,
    smppPort: smppPort || null,
    smppSystemId: smppSystemId || null,
    smppPassword: smppPassword || null,
    httpApiKey: httpApiKey || null,
  }).returning();

  res.status(201).json(formatClient(user));
});

router.get("/admin/clients/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const id = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, "client")));
  if (!user) { res.status(404).json({ error: "Client not found" }); return; }

  const clientProducts = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.userId, id));
  const clientProductIds = clientProducts.map((p) => p.id);
  const billingHistory = await db.select().from(billingRecordsTable)
    .where(clientProductIds.length > 0
      ? inArray(billingRecordsTable.productId, clientProductIds)
      : sql`false`)
    .orderBy(desc(billingRecordsTable.createdAt))
    .limit(20);

  const records = await db.select({
    record: messageRecordsTable,
    senderId: tasksTable.senderId,
    messageContent: tasksTable.messageContent,
  })
    .from(messageRecordsTable)
    .leftJoin(tasksTable, eq(messageRecordsTable.taskId, tasksTable.id))
    .where(clientProductIds.length > 0
      ? inArray(messageRecordsTable.productId, clientProductIds)
      : sql`false`)
    .orderBy(desc(messageRecordsTable.createdAt))
    .limit(20);

  res.json({
    ...formatClient(user),
    billing: billingHistory.map(b => ({
      id: b.id,
      type: b.type,
      amount: Number(b.amount),
      description: b.description,
      createdAt: b.createdAt,
    })),
    records: records.map(r => ({
      id: r.record.id,
      recipient: r.record.recipient,
      senderId: r.senderId || "",
      messageContent: r.messageContent || "",
      sendResult: r.record.sendResult,
      cost: Number(r.record.cost),
      createdAt: r.record.createdAt,
    })),
  });
});

router.put("/admin/clients/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const id = parseInt(req.params.id);
  const { username, email, phone, companyName, smsRate, status, permissions, password,
    smppHost, smppPort, smppSystemId, smppPassword, httpApiKey } = req.body;

  const updates: Record<string, any> = {};
  if (username !== undefined) updates.username = username;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone || null;
  if (companyName !== undefined) updates.companyName = companyName || null;
  if (smsRate !== undefined) updates.smsRate = String(smsRate);
  if (status !== undefined) updates.status = status;
  if (permissions !== undefined) updates.permissions = JSON.stringify(permissions);
  if (password) updates.password = await hashPassword(password);
  if (smppHost !== undefined) updates.smppHost = smppHost || null;
  if (smppPort !== undefined) updates.smppPort = smppPort || null;
  if (smppSystemId !== undefined) updates.smppSystemId = smppSystemId || null;
  if (smppPassword !== undefined && smppPassword !== "" && smppPassword !== "configured") {
    updates.smppPassword = smppPassword;
  }
  if (httpApiKey !== undefined) updates.httpApiKey = httpApiKey || null;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Client not found" }); return; }

  res.json(formatClient(updated));
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

// Admin channels CRUD
router.get("/admin/channels", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const channels = await db.select().from(channelsTable).orderBy(desc(channelsTable.createdAt));
  res.json(channels);
});

router.post("/admin/channels", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const { name, protocol, host, port, username, password, maxBindings, channelType } = req.body;
  if (!name || !host || !port || !username || !password) {
    res.status(400).json({ error: "name, host, port, username, password are required" });
    return;
  }

  const [channel] = await db.insert(channelsTable).values({
    name,
    protocol: protocol ?? "SMPP",
    host,
    port: Number(port),
    username,
    password,
    maxBindings: Number(maxBindings ?? 5),
    channelType: channelType ?? "transmitter",
    status: "active",
    productId: null,
  }).returning();

  res.status(201).json(channel);
});

router.put("/admin/channels/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const id = parseInt(req.params.id);
  const { name, protocol, host, port, username, password, maxBindings, channelType, status } = req.body;

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (protocol !== undefined) updates.protocol = protocol;
  if (host !== undefined) updates.host = host;
  if (port !== undefined) updates.port = Number(port);
  if (username !== undefined) updates.username = username;
  if (password) updates.password = password;
  if (maxBindings !== undefined) updates.maxBindings = Number(maxBindings);
  if (channelType !== undefined) updates.channelType = channelType;
  if (status !== undefined) updates.status = status;

  const [updated] = await db.update(channelsTable).set(updates).where(eq(channelsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Channel not found" }); return; }
  res.json(updated);
});

router.delete("/admin/channels/:id", async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;

  const id = parseInt(req.params.id);
  await db.delete(channelsTable).where(eq(channelsTable.id, id));
  res.json({ success: true });
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
    clientId: usersTable.id,
    clientName: usersTable.username,
    clientCompany: usersTable.companyName,
    appId: usersTable.httpApiKey,
    apiKey: usersTable.smppSystemId,
    apiSecret: usersTable.smppPassword,
  })
    .from(messageRecordsTable)
    .leftJoin(tasksTable, eq(messageRecordsTable.taskId, tasksTable.id))
    .leftJoin(productsTable, eq(messageRecordsTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(productsTable.userId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(messageRecordsTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const reportCandidates = records.filter((r) =>
    r.record.sendResult === "submitted",
  );
  const groups = new Map<string, typeof reportCandidates>();
  for (const row of reportCandidates) {
    const key = `${row.appId ?? ""}:${row.apiKey ?? ""}:${row.apiSecret ?? ""}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
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
    for (const row of group) {
      const report = reports.get(row.record.messageId);
      if (!report) continue;
      await db.update(messageRecordsTable).set({
        sendResult: report.sendResult,
        deliveredAt: report.deliveredAt,
        failReason: report.failReason,
      }).where(eq(messageRecordsTable.id, row.record.id));
      row.record.sendResult = report.sendResult;
      row.record.deliveredAt = report.deliveredAt;
      row.record.failReason = report.failReason;
    }
  }

  await chargeDeliveredRecords(
    records
      .filter((row) => row.record.sendResult === "delivered")
      .map((row) => row.record.id),
  );
  await refreshTaskCounters(records.map((row) => row.record.taskId));

  const totalRows = await db.select({ count: sql<number>`count(*)` })
    .from(messageRecordsTable)
    .where(whereClause);

  res.json({
    data: records.map(r => ({
      id: r.record.id,
      clientId: r.clientId,
      clientName: r.clientName ?? "—",
      clientCompany: r.clientCompany ?? "",
      taskName: r.taskName ?? "—",
      messageContent: r.messageContent ?? "",
      senderId: r.senderId || "Laaffic default",
      productName: r.productName ?? "",
      operator: detectPhilippineOperator(r.record.recipient),
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
