import { verifyToken } from "./db.js";

const SECRET = process.env.JWT_SECRET;
const PLACEHOLDER_SECRETS = new Set([
  "change-me-to-a-long-random-hex-string",
  "changeme",
  "secret",
  "your-secret-key",
]);
if (!SECRET || PLACEHOLDER_SECRETS.has(SECRET.toLowerCase().trim())) {
  throw new Error(
    "JWT_SECRET must be set to a strong random value. " +
      "Generate one with `openssl rand -hex 32` and add it to backend/.env (see .env.example)."
  );
}

export function getSecret() {
  return SECRET;
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const payload = verifyToken(token, SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Sets req.user when a valid token is present, otherwise continues as guest.
export function authOptional(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.user = verifyToken(token, SECRET);
  } catch (e) {
    // Invalid token -> treat as anonymous guest
  }
  next();
}

// Returns a stable owner key for carts/orders: "user:<id>" or "guest:<uuid>".
export function customerKey(req) {
  if (req.user) return `user:${req.user.id}`;
  const g = req.headers["x-guest-id"];
  if (g && String(g).trim()) return `guest:${String(g).trim()}`;
  return null;
}

export function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
