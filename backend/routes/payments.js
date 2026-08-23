import { Router } from "express";
import crypto from "node:crypto";
import { getDb, saveDb } from "../db.js";
import { authOptional, authRequired } from "../middleware.js";
import {
  esewaConfig,
  generateTransactionUuid,
  esewaSign,
  validateEsewaCallback,
  esewaStatusCheck,
  khaltiConfig,
  khaltiInitiate,
  khaltiLookup,
  paymentConfig,
  paymentSettings,
} from "../payments.js";

const router = Router();

router.get("/config", (req, res) => {
  res.json({ providers: paymentConfig() });
});

function orderResponse(order) {
  return {
    id: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus || "pending",
    paymentMethod: order.paymentMethod,
    total: order.total,
    payment: order.payment || null,
  };
}

function findOwnOrder(req, res) {
  const db = getDb();
  const order = db.orders.find(
    (o) => String(o.id) === String(req.body?.orderId) && o.userId === req.user.id
  );
  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return null;
  }
  return order;
}

// One-time token that lets the payment callback page verify an order even when
// the JWT is unavailable. This happens on mobile: the native WebView's local
// storage is origin-scoped, so after the gateway redirects the WebView back to
// the backend origin, the app's token is not present there. The token is random,
// stored server-side on the order, and cleared after a successful verification.
function resolveVerifyOrder(req) {
  const db = getDb();
  const body = req.body || {};
  const orderId = Number(body.orderId);
  if (!orderId) return null;
  if (req.user) {
    const own = db.orders.find((o) => o.id === orderId && o.userId === req.user.id);
    if (own) return own;
  }
  const token = String(body.token || "").trim();
  if (!token) return null;
  return db.orders.find((o) => o.id === orderId && o.payment?.verifyToken === token);
}

function clearVerifyToken(order) {
  if (order.payment?.verifyToken) {
    delete order.payment.verifyToken;
  }
}

function normalizeBase(base) {
  if (!base) return "";
  return String(base).replace(/\/+$/, "");
}

// ---------- eSewa ----------

router.post("/esewa/initiate", authRequired, async (req, res) => {
  const db = getDb();
  const order = findOwnOrder(req, res);
  if (!order) return;

  if (order.payment?.status === "paid") {
    return res.status(400).json({ message: "This order is already paid" });
  }
  if (order.paymentMethod !== "eSewa") {
    return res.status(400).json({ message: "This order is not set up for eSewa payment" });
  }
  if (paymentSettings().esewa?.enabled === false) {
    return res.status(503).json({ message: "eSewa payments are currently disabled" });
  }

  const base = normalizeBase(req.body?.callbackBase || req.get("origin") || req.get("host"));
  if (!base) {
    return res.status(400).json({ message: "callbackBase is required" });
  }

  const cfg = esewaConfig();
  if (cfg.misconfigured) {
    return res.status(503).json({
      message:
        "eSewa is not ready for live payments: set your live Product Code and Secret Key (Admin → Payments) and disable test mode.",
    });
  }
  const uuid = order.payment?.transactionUuid || generateTransactionUuid(order.id);
  const verifyToken = order.payment?.verifyToken || crypto.randomBytes(18).toString("hex");
  const successUrl = `${base}/payment/result?provider=esewa&orderId=${order.id}&token=${verifyToken}`;
  const failureUrl = `${base}/payment/result?provider=esewa&orderId=${order.id}&token=${verifyToken}`;

  const values = {
    amount: String(order.subtotal || 0),
    tax_amount: "0",
    total_amount: String(order.total || 0),
    transaction_uuid: uuid,
    product_code: cfg.productCode,
    product_service_charge: "0",
    product_delivery_charge: String(order.deliveryFee || 0),
    success_url: successUrl,
    failure_url: failureUrl,
  };
  const signedFieldNames = ["total_amount", "transaction_uuid", "product_code"];

  order.payment = {
    provider: "esewa",
    status: "initiated",
    transactionUuid: uuid,
    verifyToken,
    initiatedAt: new Date().toISOString(),
  };
  saveDb();

  res.json({
    formUrl: cfg.formUrl,
    fields: {
      ...values,
      signed_field_names: signedFieldNames.join(","),
      signature: esewaSign(values, signedFieldNames),
    },
    order: orderResponse(order),
  });
});

router.post("/esewa/verify", authOptional, async (req, res) => {
  const db = getDb();
  const order = resolveVerifyOrder(req);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.paymentStatus === "paid") {
    return res.json({ success: true, alreadyPaid: true, order: orderResponse(order) });
  }
  if (order.paymentMethod !== "eSewa" || !order.payment?.transactionUuid) {
    return res.status(400).json({ message: "No eSewa payment session for this order" });
  }

  const { data, signature } = req.body || {};
  if (!data || !signature) {
    return res.status(400).json({ message: "Missing eSewa callback data" });
  }

  const check = validateEsewaCallback(data, signature);
  if (!check.ok) {
    return res.status(400).json({ message: check.error });
  }
  const payload = check.payload;

  const uuid = order.payment.transactionUuid;
  if (payload.transaction_uuid !== uuid) {
    return res.status(400).json({ message: "eSewa transaction does not match this order" });
  }
  if (String(payload.status || "").toUpperCase() !== "COMPLETE") {
    return res.status(400).json({ message: `eSewa payment not complete (${payload.status})` });
  }

  const cfg = esewaConfig();
  const statusRes = await esewaStatusCheck({
    productCode: cfg.productCode,
    transactionUuid: uuid,
    totalAmount: order.total,
  });
  if (!statusRes.ok || String(statusRes.data?.status || "").toUpperCase() !== "COMPLETE") {
    return res.status(502).json({
      message: "Payment verification failed. Please contact support with your order number.",
    });
  }

  order.paymentStatus = "paid";
  order.payment = {
    ...(order.payment || {}),
    provider: "esewa",
    status: "paid",
    refId: payload.transaction_code || statusRes.data?.ref_id || "",
    paidAt: new Date().toISOString(),
  };
  clearVerifyToken(order);
  saveDb();

  res.json({ success: true, order: orderResponse(order) });
});

// ---------- Khalti ----------

router.post("/khalti/initiate", authRequired, async (req, res) => {
  const db = getDb();
  const order = findOwnOrder(req, res);
  if (!order) return;

  if (order.payment?.status === "paid") {
    return res.status(400).json({ message: "This order is already paid" });
  }
  if (order.paymentMethod !== "Khalti") {
    return res.status(400).json({ message: "This order is not set up for Khalti payment" });
  }
  if (paymentSettings().khalti?.enabled === false) {
    return res.status(503).json({ message: "Khalti payments are currently disabled" });
  }
  const khalti = khaltiConfig();
  if (!khalti.secretKey) {
    return res.status(503).json({
      message: "Khalti is not configured. Please set KHALTI_SECRET_KEY in backend/.env",
    });
  }
  if (khalti.misconfigured) {
    return res.status(503).json({
      message:
        "Khalti is not ready for live payments: set your live Secret Key (Admin → Payments) and disable test mode.",
    });
  }
  if (order.total < 10) {
    return res.status(400).json({ message: "Khalti requires a minimum order total of Rs. 10" });
  }

  const base = normalizeBase(req.body?.callbackBase || req.get("origin") || req.get("host"));
  if (!base) {
    return res.status(400).json({ message: "callbackBase is required" });
  }

  if (order.payment?.pidx && order.payment?.paymentUrl) {
    return res.json({
      paymentUrl: order.payment.paymentUrl,
      pidx: order.payment.pidx,
      order: orderResponse(order),
    });
  }

  const verifyToken = order.payment?.verifyToken || crypto.randomBytes(18).toString("hex");
  const returnUrl = `${base}/payment/result?provider=khalti&orderId=${order.id}&token=${verifyToken}`;
  const customer = db.users.find((u) => u.id === req.user.id);
  const init = await khaltiInitiate({
    returnUrl,
    websiteUrl: base,
    amountPaisa: Math.round(order.total * 100),
    purchaseOrderId: String(order.id),
    purchaseOrderName: `NovaNest order #${order.id}`,
    customerInfo: {
      name: customer?.name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
    },
  });
  if (!init.ok) {
    return res.status(502).json({ message: init.error });
  }

  order.payment = {
    provider: "khalti",
    status: "initiated",
    pidx: init.data.pidx,
    paymentUrl: init.data.payment_url,
    verifyToken,
    initiatedAt: new Date().toISOString(),
  };
  saveDb();

  res.json({
    paymentUrl: init.data.payment_url,
    pidx: init.data.pidx,
    order: orderResponse(order),
  });
});

router.post("/khalti/verify", authOptional, async (req, res) => {
  const db = getDb();
  const order = resolveVerifyOrder(req);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.paymentStatus === "paid") {
    return res.json({ success: true, alreadyPaid: true, order: orderResponse(order) });
  }
  if (order.paymentMethod !== "Khalti" || !order.payment?.pidx) {
    return res.status(400).json({ message: "No Khalti payment session for this order" });
  }

  const pidx = req.body?.pidx || order.payment.pidx;
  const lookup = await khaltiLookup(pidx);
  if (!lookup.ok) {
    return res.status(502).json({ message: lookup.error });
  }

  const status = String(lookup.data?.status || "");
  if (status !== "Completed") {
    return res.status(400).json({
      message: `Khalti payment not completed (${status}). Please try again or choose another method.`,
    });
  }
  if (Number(lookup.data.total_amount) !== Math.round(order.total * 100)) {
    return res.status(400).json({ message: "Khalti payment amount does not match this order" });
  }

  order.paymentStatus = "paid";
  order.payment = {
    ...(order.payment || {}),
    provider: "khalti",
    status: "paid",
    pidx,
    transactionId: lookup.data.transaction_id || "",
    paidAt: new Date().toISOString(),
  };
  clearVerifyToken(order);
  saveDb();

  res.json({ success: true, order: orderResponse(order) });
});

export default router;
