#!/usr/bin/env node
// Reset (or create) the admin account password.
//
// Usage:
//   node reset-admin.js                          # random password, printed once
//   ADMIN_PASSWORD='Strong-New-Pass!' node reset-admin.js
//   ADMIN_EMAIL=owner@store.com node reset-admin.js
//
// IMPORTANT: Stop the NovaNest server BEFORE running this script. The running
// server keeps the database in memory and would overwrite this change on the
// next save. Do NOT hand-edit backend/data/novanest.json while the server is
// running for the same reason.
import { getDb, saveDb, nextId, hashPassword } from "./db.js";
import crypto from "node:crypto";

const db = getDb();
let admin = db.users.find((u) => u.role === "admin");
const email = (process.env.ADMIN_EMAIL || (admin && admin.email) || "admin@novanest.com").trim();
const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString("hex");

if (admin) {
  admin.email = email;
  admin.password = hashPassword(password);
} else {
  admin = {
    id: nextId("user"),
    name: "NovaNest Admin",
    email,
    password: hashPassword(password),
    role: "admin",
    phone: "9800000000",
    address: "Kathmandu, Nepal",
    createdAt: new Date().toISOString(),
  };
  db.users.push(admin);
}

saveDb();

const hint = process.env.ADMIN_PASSWORD
  ? "password set from ADMIN_PASSWORD"
  : `password (random, shown once): ${password}`;
console.log(`[NovaNest] Admin "${email}" ${hint}`);
if (!process.env.ADMIN_PASSWORD) {
  console.log("Store it in a password manager now. Re-run this script to rotate it.");
}
