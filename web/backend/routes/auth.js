import { Router } from "express";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
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
import { getSecret, authRequired } from "../middleware.js";
import { sendMail } from "../mailer.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validEmail(email) {
  return typeof email === "string" && EMAIL_RE.test(email);
}

// Brute-force protection for credential endpoints. Applied per IP.
function createLimiter(max) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." },
  });
}

const signupLimiter = createLimiter(10);
const loginLimiter = createLimiter(10);
const forgotLimiter = createLimiter(5);

router.post("/signup", signupLimiter, (req, res) => {
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

router.post("/login", loginLimiter, (req, res) => {
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
const RESET_BASE_URL =
  process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`;

router.post("/forgot-password", forgotLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!validEmail(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }
  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (user) {
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

    const resetUrl = `${RESET_BASE_URL}/reset-password?token=${token}`;
    const minutes = RESET_TTL_MS / 60000;
    try {
      await sendMail({
        to: user.email,
        subject: "NovaNest password reset",
        text:
          `Hello ${user.name},\n\n` +
          "A password reset was requested for your NovaNest account.\n\n" +
          `Reset your password here: ${resetUrl}\n\n` +
          `Or use this reset code: ${token}\n\n` +
          `This link expires in ${minutes} minutes.\n\n` +
          "If you didn't request this, you can ignore this email.",
        html:
          `<p>Hello <strong>${user.name}</strong>,</p>` +
          "<p>A password reset was requested for your NovaNest account.</p>" +
          `<p><a href="${resetUrl}">Reset your password</a></p>` +
          `<p>Or use this reset code: <code>${token}</code></p>` +
          `<p>This link expires in ${minutes} minutes.</p>` +
          "<p>If you didn't request this, you can ignore this email.</p>",
      });
    } catch (e) {
      // Never leak the token or reveal account existence via the response.
      console.error("[NovaNest] Failed to send reset email:", e.message);
    }
  }

  // Generic response - do not reveal whether the account exists (prevents
  // account enumeration).
  res.json({
    message: "If an account exists for this email, a password reset link has been sent.",
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

router.post("/change-password", authRequired, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const db = getDb();
  const user = db.users.find((u) => String(u.id) === String(req.user.id));
  if (!user) {
    return res.status(404).json({ message: "Account not found" });
  }
  if (!verifyPassword(String(currentPassword || ""), user.password)) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }
  user.password = hashPassword(String(newPassword));
  saveDb();
  res.json({ message: "Password changed successfully" });
});

export default router;
