import { Router } from "express";
import { db, channelsTable, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateChannelBody } from "@workspace/api-zod";

const router = Router();

function requireAdminUser(req: any, res: any) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin only" });
    return false;
  }
  return true;
}

function mapChannel(c: typeof channelsTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    protocol: c.protocol,
    host: c.host,
    port: c.port,
    username: c.username,
    maxBindings: c.maxBindings,
    channelType: c.channelType,
    status: c.status,
    productId: c.productId,
    createdAt: c.createdAt,
  };
}

router.get("/channels", async (req, res) => {
  if (!requireAdminUser(req, res)) return;
  const channels = await db.select().from(channelsTable);
  res.json(channels.map(mapChannel));
});

router.post("/channels", async (req, res) => {
  if (!requireAdminUser(req, res)) return;
  const parsed = CreateChannelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [channel] = await db.insert(channelsTable).values({
    productId: parsed.data.productId,
    name: parsed.data.name,
    protocol: parsed.data.protocol,
    host: parsed.data.host,
    port: parsed.data.port,
    username: parsed.data.username,
    password: parsed.data.password,
    maxBindings: parsed.data.maxBindings,
    channelType: parsed.data.channelType,
    status: "active",
  }).returning();
  res.status(201).json(mapChannel(channel));
});

router.get("/channels/:id", async (req, res) => {
  if (!requireAdminUser(req, res)) return;
  const id = parseInt(req.params.id);
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, id));
  if (!channel) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(mapChannel(channel));
});

router.put("/channels/:id", async (req, res) => {
  if (!requireAdminUser(req, res)) return;
  const id = parseInt(req.params.id);
  const parsed = CreateChannelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [channel] = await db.update(channelsTable).set({
    productId: parsed.data.productId,
    name: parsed.data.name,
    protocol: parsed.data.protocol,
    host: parsed.data.host,
    port: parsed.data.port,
    username: parsed.data.username,
    password: parsed.data.password,
    maxBindings: parsed.data.maxBindings,
    channelType: parsed.data.channelType,
  }).where(eq(channelsTable.id, id)).returning();
  if (!channel) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(mapChannel(channel));
});

router.delete("/channels/:id", async (req, res) => {
  if (!requireAdminUser(req, res)) return;
  const id = parseInt(req.params.id);
  await db.delete(channelsTable).where(eq(channelsTable.id, id));
  res.status(204).end();
});

export default router;
