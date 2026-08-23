import { Router } from "express";
import { getDb } from "../db.js";
import { authOptional, customerKey } from "../middleware.js";
import { resolveCoupon } from "../coupons.js";

const router = Router();

// Public: active coupons so shoppers can discover available deals.
router.get("/active", (req, res) => {
  const db = getDb();
  const now = Date.now();
  const active = db.coupons.filter((c) => {
    if (c.active === false) return false;
    if (c.startDate && new Date(c.startDate).getTime() > now) return false;
    if (c.endDate && new Date(c.endDate).getTime() < now) return false;
    if (c.totalLimit && (Number(c.usedCount) || 0) >= Number(c.totalLimit)) return false;
    return true;
  });
  res.json({
    coupons: active.map((c) => ({
      code: c.code,
      description: c.description,
      type: c.type,
      value: c.value,
      minSubtotal: c.minSubtotal,
      maxDiscount: c.maxDiscount,
      endDate: c.endDate,
    })),
  });
});

// Public: validate a coupon against a subtotal without consuming it.
router.post("/validate", authOptional, (req, res) => {
  const db = getDb();
  const { code, subtotal } = req.body || {};
  const owner = customerKey(req);
  const sub = Number(subtotal) || 0;
  const resolved = resolveCoupon(db, code, sub, owner);
  if (resolved.error) {
    return res.json({ valid: false, message: resolved.error });
  }
  res.json({
    valid: true,
    code: resolved.coupon.code,
    type: resolved.coupon.type,
    value: resolved.coupon.value,
    amount: resolved.amount,
  });
});

export default router;
