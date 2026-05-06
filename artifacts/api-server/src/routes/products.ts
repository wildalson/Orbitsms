import { Router } from "express";
import { db, productsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateProductBody } from "@workspace/api-zod";

const router = Router();

function getAuthUserId(req: any): number | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return parseInt(decoded.split(":")[0]);
  } catch {
    return null;
  }
}

router.get("/products", async (req, res) => {
  const userId = getAuthUserId(req) ?? 1;
  const products = await db.select().from(productsTable).where(eq(productsTable.userId, userId));
  res.json(products.map(p => ({
    id: p.id,
    name: p.name,
    spid: p.spid,
    type: p.type,
    balance: Number(p.balance),
    createdAt: p.createdAt,
  })));
});

router.post("/products", async (req, res) => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const userId = getAuthUserId(req) ?? 1;
  const [product] = await db.insert(productsTable).values({
    userId,
    name: parsed.data.name,
    spid: parsed.data.spid,
    type: parsed.data.type,
    balance: String(parsed.data.balance ?? 0),
  }).returning();
  res.status(201).json({
    id: product.id,
    name: product.name,
    spid: product.spid,
    type: product.type,
    balance: Number(product.balance),
    createdAt: product.createdAt,
  });
});

router.get("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ id: product.id, name: product.name, spid: product.spid, type: product.type, balance: Number(product.balance), createdAt: product.createdAt });
});

router.put("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [product] = await db.update(productsTable).set({
    name: parsed.data.name,
    spid: parsed.data.spid,
    type: parsed.data.type,
    balance: String(parsed.data.balance ?? 0),
  }).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ id: product.id, name: product.name, spid: product.spid, type: product.type, balance: Number(product.balance), createdAt: product.createdAt });
});

router.delete("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.status(204).end();
});

export default router;
