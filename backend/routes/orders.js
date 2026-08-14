import { Router } from "express";
import { getDb, saveDb, nextId } from "../db.js";
import { authRequired } from "../middleware.js";

const router = Router();

const DELIVERY_FEE = 50;

export function computeTotals(items) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = subtotal >= 2000 ? 0 : DELIVERY_FEE;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

function orderResponse(order, db) {
  return {
    id: order.id,
    items: order.items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus || "pending",
    deliveryDetails: order.deliveryDetails || {},
    shippingAddress: order.shippingAddress,
    phone: order.phone,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
  };
}

router.use(authRequired);

router.get("/", (req, res) => {
  const db = getDb();
  const orders = db.orders
    .filter((o) => o.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((o) => orderResponse(o, db));
  res.json({ orders });
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const order = db.orders.find(
    (o) => String(o.id) === String(req.params.id) && o.userId === req.user.id
  );
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order: orderResponse(order, db) });
});

router.post("/checkout", (req, res) => {
  const { deliveryDetails = {}, paymentMethod = "Cash on Delivery" } = req.body || {};
  const db = getDb();
  const cart = db.cartItems.filter((ci) => ci.userId === req.user.id);
  if (cart.length === 0) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  // Validate against the admin-configured checkout form
  const configured = db.settings.checkoutFields.filter((f) => f.active);
  if (configured.length === 0) {
    return res.status(400).json({
      message: "The checkout form has no active fields. An admin must configure delivery fields.",
    });
  }
  const missingRequired = [];
  for (const f of configured) {
    const val = deliveryDetails[f.key];
    if (f.required && (val === undefined || val === null || String(val).trim() === "")) {
      missingRequired.push(f.label);
    }
  }
  if (missingRequired.length > 0) {
    return res.status(400).json({
      message: `Please fill in the required fields: ${missingRequired.join(", ")}`,
    });
  }

  // Persist only configured field values (ignore unknown keys)
  const cleanDetails = {};
  for (const f of configured) {
    const val = deliveryDetails[f.key];
    cleanDetails[f.key] = val === undefined || val === null ? "" : String(val);
  }

  const items = [];
  for (const ci of cart) {
    const product = db.products.find((p) => p.id === ci.productId);
    if (!product) {
      return res.status(400).json({ message: `Product in cart is no longer available` });
    }
    if (ci.quantity > product.stock) {
      return res.status(400).json({
        message: `Only ${product.stock} left in stock for ${product.name}`,
      });
    }
    product.stock -= ci.quantity;
    product.sold += ci.quantity;
    const cat = db.categories.find((c) => c.id === product.categoryId);
    items.push({
      productId: product.id,
      productName: product.name,
      price: product.price,
      unitCost: product.costPrice || 0,
      quantity: ci.quantity,
      categorySlug: cat ? cat.slug : "",
      image: product.image || "",
    });
    db.seq.movement = (db.seq.movement || 0) + 1;
    db.stockMovements.push({
      id: db.seq.movement,
      productId: product.id,
      productName: product.name,
      type: "sale",
      quantity: -ci.quantity,
      note: `Sale from order checkout`,
      user: db.users.find((u) => u.id === req.user.id)?.name || req.user.email || "Customer",
      createdAt: new Date().toISOString(),
    });
  }

  const { subtotal, deliveryFee, total } = computeTotals(items);
  const order = {
    id: nextId("order"),
    userId: req.user.id,
    items,
    subtotal,
    deliveryFee,
    total,
    status: "pending",
    paymentStatus: "pending",
    deliveryDetails: cleanDetails,
    shippingAddress: cleanDetails.shippingAddress || "",
    phone: cleanDetails.phone || "",
    paymentMethod,
    createdAt: new Date().toISOString(),
  };
  db.orders.push(order);
  db.cartItems = db.cartItems.filter((ci) => ci.userId !== req.user.id);
  saveDb();
  res.status(201).json({ order: orderResponse(order, db) });
});

export default router;
