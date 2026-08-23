import crypto from "node:crypto";
import { getDb } from "./db.js";

const ESEWA_SANDBOX_SECRET = "8gBm/:&EnhH.1/q(";
const ESEWA_SANDBOX_PRODUCT_CODE = "EPAYTEST";

export function esewaConfig() {
  const stored = getDb().settings?.payments?.esewa || {};
  const testMode =
    stored.testMode ?? ((process.env.ESEWA_TEST_MODE ?? "true") !== "false");
  // Sandbox credentials are only safe defaults while in test mode. In live
  // mode an unset/placeholder value is a misconfiguration, never a fallback.
  const secretKey =
    stored.secretKey || process.env.ESEWA_SECRET_KEY || (testMode ? ESEWA_SANDBOX_SECRET : "");
  const productCode =
    stored.productCode || process.env.ESEWA_PRODUCT_CODE || (testMode ? ESEWA_SANDBOX_PRODUCT_CODE : "");
  const misconfigured =
    !testMode &&
    (!secretKey ||
      !productCode ||
      secretKey === ESEWA_SANDBOX_SECRET ||
      productCode === ESEWA_SANDBOX_PRODUCT_CODE);
  return {
    testMode,
    configured: Boolean(secretKey) && Boolean(productCode),
    misconfigured,
    productCode,
    secretKey,
    formUrl: testMode
      ? "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
      : "https://epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl: testMode
      ? "https://rc.esewa.com.np/api/epay/transaction/status/"
      : "https://esewa.com.np/api/epay/transaction/status/",
  };
}

export function khaltiConfig() {
  const stored = getDb().settings?.payments?.khalti || {};
  const testMode =
    stored.testMode ?? ((process.env.KHALTI_TEST_MODE ?? "true") !== "false");
  const secretKey = stored.secretKey || process.env.KHALTI_SECRET_KEY || "";
  // A live session must never silently use a sandbox secret.
  const misconfigured = !testMode && (!secretKey || secretKey.startsWith("test_secret_key_"));
  return {
    testMode,
    configured: Boolean(secretKey),
    misconfigured,
    secretKey,
    initiateUrl: testMode
      ? "https://dev.khalti.com/api/v2/epayment/initiate/"
      : "https://khalti.com/api/v2/epayment/initiate/",
    lookupUrl: testMode
      ? "https://dev.khalti.com/api/v2/epayment/lookup/"
      : "https://khalti.com/api/v2/epayment/lookup/",
  };
}

export function paymentConfig() {
  const esewa = esewaConfig();
  const khalti = khaltiConfig();
  const stored = getDb().settings?.payments || {};
  return {
    esewa: {
      enabled: stored.esewa?.enabled !== false && !esewa.misconfigured,
      testMode: esewa.testMode,
      formUrl: esewa.formUrl,
    },
    khalti: {
      enabled: stored.khalti?.enabled !== false && khalti.configured && !khalti.misconfigured,
      testMode: khalti.testMode,
    },
  };
}

export function paymentSettings() {
  return getDb().settings?.payments || {};
}

export function hmacSha256Base64(secret, message) {
  return crypto.createHmac("sha256", secret).update(message, "utf8").digest("base64");
}

// eSewa signature: HMAC-SHA256 over "field=value" pairs (in signedFieldNames
// order) joined with commas, e.g. "total_amount=410,transaction_uuid=NN-1,s..."
export function esewaSign(values, signedFieldNames) {
  const message = signedFieldNames.map((f) => `${f}=${String(values[f] ?? "")}`).join(",");
  return hmacSha256Base64(esewaConfig().secretKey, message);
}

export function generateTransactionUuid(orderId) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\..*/, "")
    .replace("T", "-");
  return `NN-${orderId}-${stamp}`;
}

export function validateEsewaCallback(data, signature) {
  // `data` is a base64-encoded JSON payload returned by eSewa on success.
  let json;
  let payload;
  try {
    json = Buffer.from(data, "base64").toString("utf8");
    payload = JSON.parse(json);
  } catch (e) {
    return { ok: false, error: "Invalid eSewa response payload" };
  }
  const signedNames = String(payload.signed_field_names || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (signedNames.length === 0) {
    return { ok: false, error: "Missing signed_field_names in eSewa response" };
  }
  // Build the message from the raw JSON text so numbers keep their exact
  // representation (e.g. "410.0" stays "410.0", not the parsed "410").
  const message = signedNames
    .map((f) => `${f}=${String(rawEsewaField(json, f) ?? "")}`)
    .join(",");
  const expected = hmacSha256Base64(esewaConfig().secretKey, message);
  if (expected !== signature) {
    return { ok: false, error: "eSewa signature mismatch" };
  }
  return { ok: true, payload };
}

function rawEsewaField(json, key) {
  const re = new RegExp(
    `"${key}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?|true|false|null)`
  );
  const m = json.match(re);
  if (!m) return undefined;
  const raw = m[1];
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return raw;
    }
  }
  return raw;
}

export async function esewaStatusCheck({ productCode, transactionUuid, totalAmount }) {
  const cfg = esewaConfig();
  const url = `${cfg.statusUrl}?product_code=${encodeURIComponent(productCode)}&transaction_uuid=${encodeURIComponent(transactionUuid)}&total_amount=${encodeURIComponent(totalAmount)}`;
  const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    return { ok: false, error: `eSewa status check failed (HTTP ${res.status})` };
  }
  const data = await res.json();
  return { ok: true, data };
}

function khaltiErrorMessage(data) {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map((d) => (d && d.message) || JSON.stringify(d)).join("; ");
  if (data && data.detail) return typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
  if (data && data.message) return data.message;
  if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v) && v.length && typeof v[0] === "string") {
        return `${k}: ${v.join(", ")}`;
      }
    }
  }
  return JSON.stringify(data);
}

export async function khaltiInitiate({
  returnUrl,
  websiteUrl,
  amountPaisa,
  purchaseOrderId,
  purchaseOrderName,
  customerInfo,
}) {
  const cfg = khaltiConfig();
  const res = await fetch(cfg.initiateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${cfg.secretKey}`,
    },
    body: JSON.stringify({
      return_url: returnUrl,
      website_url: websiteUrl,
      amount: amountPaisa,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
      customer_info: customerInfo,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: `Khalti: ${khaltiErrorMessage(data)}` };
  }
  if (!data.pidx || !data.payment_url) {
    return { ok: false, error: "Khalti: invalid initiate response" };
  }
  return { ok: true, data };
}

export async function khaltiLookup(pidx) {
  const cfg = khaltiConfig();
  const res = await fetch(cfg.lookupUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${cfg.secretKey}`,
    },
    body: JSON.stringify({ pidx }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: `Khalti lookup failed: ${khaltiErrorMessage(data)}` };
  }
  return { ok: true, data };
}
