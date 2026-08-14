import { Router } from "express";
import crypto from "node:crypto";
import {
  getDb,
  saveDb,
  nextId,
  hashPassword,
  verifyPassword,
  publicUser,
  signToken,
  verifyToken,
} from "../db.js";
import { getSecret } from "../middleware.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email);
}

router.post("/signup", (req, res) => {
  const { name, email, password, phone, address } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (!validEmail(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  const db = getDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }
  const user = {
    id: nextId("user"),
    name: String(name).trim(),
    email: email.toLowerCase(),
    password: hashPassword(password),
    role: "customer",
    phone: phone || "",
    address: address || "",
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb();
  const token = signToken({ id: user.id, role: user.role, email: user.email }, getSecret());
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!validEmail(email) || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = signToken({ id: user.id, role: user.role, email: user.email }, getSecret());
  res.json({ token, user: publicUser(user) });
});

router.get("/me", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    const payload = verifyToken(token, getSecret());
    const db = getDb();
    const user = db.users.find((u) => u.id === payload.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: publicUser(user) });
  } catch (e) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

router.post("/forgot-password", (req, res) => {
  const { email } = req.body || {};
  if (!validEmail(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ message: "No account found with this email address" });
  }

  // Invalidate any previously issued tokens for this user
  db.passwordResets = db.passwordResets.filter((r) => r.userId !== user.id);

  const token = crypto.randomBytes(24).toString("hex");
  db.passwordResets.push({
    id: nextId("reset"),
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + RESET_TTL_MS).toISOString(),
    used: false,
    createdAt: new Date().toISOString(),
  });
  saveDb();

  // NOTE: In production this token would be emailed to the user.
  // For this demo environment we return it in the response so the
  // reset link can be surfaced directly in the UI.
  res.json({
    message: "Password reset code generated",
    resetToken: token,
    expiresInMinutes: RESET_TTL_MS / 60000,
  });
});

router.post("/reset-password", (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ message: "Reset token is required" });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }
  const db = getDb();
  const reset = db.passwordResets.find(
    (r) => r.token === token && r.used === false
  );
  if (!reset) {
    return res.status(400).json({ message: "Invalid or already used reset token" });
  }
  if (new Date(reset.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
  }
  const user = db.users.find((u) => u.id === reset.userId);
  if (!user) {
    return res.status(404).json({ message: "Account no longer exists" });
  }

  user.password = hashPassword(String(newPassword));
  reset.used = true;
  db.passwordResets = db.passwordResets.filter((r) => r.id !== reset.id);
  saveDb();

  res.json({ message: "Password reset successful. You can now login." });
});

export default router;
