import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { CreateProductBody } from "@workspace/api-zod";

const router = Router();

function getUser(req: any) {
  return req.user;
}

function productWhere(req: any, productId: number) {
  const user = getUser(req);
  return user.role === "admin"
    ? eq(productsTable.id, productId)
    : and(eq(productsTable.id, productId), eq(productsTable.userId, user.id));
}

router.get("/products", async (req, res) => {
  const user = getUser(req);
  const products = await db.select().from(productsTable)
    .where(user.role === "admin" ? undefined : eq(productsTable.userId, user.id));
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
  const user = getUser(req);
  if (user.role !== "admin" && parsed.data.balance && parsed.data.balance > 0) {
    res.status(403).json({ error: "Clients cannot create products with starting balance" });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    userId: user.id,
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
  const [product] = await db.select().from(productsTable).where(productWhere(req, id));
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ id: product.id, name: product.name, spid: product.spid, type: product.type, balance: Number(product.balance), createdAt: product.createdAt });
});

router.put("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const user = getUser(req);
  if (user.role !== "admin" && req.body.balance !== undefined) {
    delete req.body.balance;
  }
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: Partial<typeof productsTable.$inferInsert> = {
    name: parsed.data.name,
    spid: parsed.data.spid,
    type: parsed.data.type,
  };
  if (user.role === "admin") {
    updates.balance = String(parsed.data.balance ?? 0);
  }
  const [product] = await db.update(productsTable).set(updates).where(productWhere(req, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ id: product.id, name: product.name, spid: product.spid, type: product.type, balance: Number(product.balance), createdAt: product.createdAt });
});

router.delete("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(productsTable).where(productWhere(req, id));
  res.status(204).end();
});

export default router;
