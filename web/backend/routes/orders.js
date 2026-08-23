import { Router } from "express";
import { getDb, saveDb, nextId } from "../db.js";
import { authOptional, customerKey } from "../middleware.js";
import { resolveCoupon, applyCoupon } from "../coupons.js";

const router = Router();

const DELIVERY_FEE = 50;
const FREE_SHIP_THRESHOLD = 2000;

export function computeTotals(items, discount = 0) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = subtotal >= FREE_SHIP_THRESHOLD ? 0 : DELIVERY_FEE;
  const discountAmount = Math.min(Math.max(0, discount), subtotal);
  return {
    subtotal,
    deliveryFee,
    discount: discountAmount,
    total: subtotal + deliveryFee - discountAmount,
  };
}

function orderResponse(order, db) {
  return {
    id: order.id,
    items: order.items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount || 0,
    coupon: order.coupon || null,
    total: order.total,
    status: order.status,
    paymentStatus: order.paymentStatus || "pending",
    deliveryDetails: order.deliveryDetails || {},
    shippingAddress: order.shippingAddress,
    phone: order.phone,
    paymentMethod: order.paymentMethod,
    payment: order.payment || null,
    createdAt: order.createdAt,
  };
}

// Support both logged-in users and guests (guest session via X-Guest-Id).
router.use(authOptional);

function requireOwner(req, res) {
  const owner = customerKey(req);
  if (!owner) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  return owner;
}

function actorLabel(db, req, order) {
  if (req.user) {
    const u = db.users.find((x) => String(x.id) === String(req.user.id));
    if (u) return u.name;
  }
  const dd = order?.deliveryDetails || {};
  return dd.fullName || dd.email || "Customer";
}

router.get("/", (req, res) => {
  const db = getDb();
  const owner = customerKey(req);
  const orders = db.orders
    .filter((o) => owner && o.owner === owner)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((o) => orderResponse(o, db));
  res.json({ orders });
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const owner = customerKey(req);
  const order = db.orders.find(
    (o) => String(o.id) === String(req.params.id) && owner && o.owner === owner
  );
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json({ order: orderResponse(order, db) });
});

router.post("/checkout", (req, res) => {
  const { deliveryDetails = {}, paymentMethod = "Cash on Delivery", couponCode } = req.body || {};
  const owner = requireOwner(req, res);
  if (!owner) return;
  const db = getDb();

  const cart = db.cartItems.filter((ci) => ci.owner === owner);
  if (cart.length === 0) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  const isOnline = paymentMethod === "eSewa" || paymentMethod === "Khalti";
  if (isOnline && !req.user) {
    return res.status(400).json({
      message: "Please login to pay with eSewa or Khalti. Guests can use Cash on Delivery or Bank Transfer.",
    });
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

  // Build line items and validate stock availability (no mutation yet so a
  // failed coupon or stock check leaves no partial side effects).
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
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  // Coupon resolution (authoritative, server-side)
  let coupon = null;
  let couponSnapshot = null;
  let discountAmount = 0;
  if (couponCode && String(couponCode).trim()) {
    const resolved = resolveCoupon(db, couponCode, subtotal, owner);
    if (resolved.error) {
      return res.status(400).json({ message: resolved.error });
    }
    coupon = resolved.coupon;
    discountAmount = resolved.amount;
  }

  const { deliveryFee, total } = computeTotals(items, discountAmount);

  // All validations passed — now apply stock changes.
  for (const it of items) {
    const product = db.products.find((p) => p.id === it.productId);
    product.stock -= it.quantity;
    product.sold += it.quantity;
    db.seq.movement = (db.seq.movement || 0) + 1;
    db.stockMovements.push({
      id: db.seq.movement,
      productId: product.id,
      productName: product.name,
      type: "sale",
      quantity: -it.quantity,
      note: `Sale from order checkout`,
      user: actorLabel(db, req),
      createdAt: new Date().toISOString(),
    });
  }

  if (coupon) {
    couponSnapshot = {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      amount: discountAmount,
    };
  }

  const payment = {};
  if (paymentMethod === "eSewa") {
    payment.provider = "esewa";
    payment.status = "initiated";
  } else if (paymentMethod === "Khalti") {
    payment.provider = "khalti";
    payment.status = "initiated";
  }

  const order = {
    id: nextId("order"),
    owner,
    userId: req.user ? req.user.id : null,
    guestId: req.user ? null : (req.headers["x-guest-id"] || "").trim() || null,
    items,
    subtotal,
    deliveryFee,
    discount: discountAmount,
    coupon: couponSnapshot,
    total,
    status: "pending",
    paymentStatus: "pending",
    payment: Object.keys(payment).length > 0 ? payment : undefined,
    deliveryDetails: cleanDetails,
    shippingAddress: cleanDetails.shippingAddress || "",
    phone: cleanDetails.phone || "",
    paymentMethod,
    createdAt: new Date().toISOString(),
  };
  db.orders.push(order);
  // Online payments are only "initiated" here. Keep the cart so that if the
  // user abandons or cancels the payment they can still return to it. The cart
  // is cleared server-side once payment is verified (see routes/payments.js).
  if (!isOnline) {
    db.cartItems = db.cartItems.filter((ci) => ci.owner !== owner);
  }
  if (coupon) applyCoupon(db, coupon, discountAmount, owner, order.id);
  saveDb();
  res.status(201).json({ order: orderResponse(order, db) });
});

// Customer self-service cancellation (restores stock).
router.post("/:id/cancel", (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const db = getDb();
  const order = db.orders.find(
    (o) => String(o.id) === String(req.params.id) && o.owner === owner
  );
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (!["pending", "confirmed"].includes(order.status)) {
    return res.status(400).json({
      message: "This order can no longer be cancelled",
    });
  }
  order.status = "cancelled";
  if (order.paymentStatus === "paid") order.paymentStatus = "refunded";
  for (const it of order.items) {
    const product = db.products.find((p) => p.id === it.productId);
    if (!product) continue;
    product.stock += it.quantity;
    product.sold = Math.max(0, (product.sold || 0) - it.quantity);
    db.seq.movement = (db.seq.movement || 0) + 1;
    db.stockMovements.push({
      id: db.seq.movement,
      productId: product.id,
      productName: product.name,
      type: "cancel",
      quantity: it.quantity,
      note: `Order #${order.id} cancelled by customer`,
      user: actorLabel(db, req, order),
      createdAt: new Date().toISOString(),
    });
  }
  saveDb();
  res.json({ order: orderResponse(order, db) });
});

export default router;
