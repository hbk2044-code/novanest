// Coupon resolution shared by checkout and the validate endpoint.
export function resolveCoupon(db, code, subtotal, owner) {
  if (!code || !String(code).trim()) return { coupon: null, amount: 0 };
  const raw = String(code).trim();
  const coupon = db.coupons.find(
    (c) => String(c.code).toLowerCase() === raw.toLowerCase()
  );
  if (!coupon) return { error: "Invalid coupon code" };
  if (coupon.active === false) return { error: "This coupon is no longer active" };

  const now = Date.now();
  if (coupon.startDate && new Date(coupon.startDate).getTime() > now) {
    return { error: "This coupon is not active yet" };
  }
  if (coupon.endDate && new Date(coupon.endDate).getTime() < now) {
    return { error: "This coupon has expired" };
  }
  const minSubtotal = Number(coupon.minSubtotal) || 0;
  if (subtotal < minSubtotal) {
    return { error: `Minimum order amount for this coupon is Rs. ${minSubtotal}` };
  }
  if (coupon.totalLimit && (Number(coupon.usedCount) || 0) >= Number(coupon.totalLimit)) {
    return { error: "This coupon has reached its usage limit" };
  }
  if (
    owner &&
    coupon.perUserLimit &&
    (coupon.redemptions || []).filter((r) => r.owner === owner).length >= Number(coupon.perUserLimit)
  ) {
    return { error: "You have already used this coupon" };
  }

  let amount;
  if (coupon.type === "percent") {
    amount = Math.round((subtotal * (Number(coupon.value) || 0)) / 100);
    if (coupon.maxDiscount && amount > Number(coupon.maxDiscount)) {
      amount = Number(coupon.maxDiscount);
    }
  } else {
    amount = Number(coupon.value) || 0;
  }
  amount = Math.min(Math.max(0, amount), subtotal);
  return { coupon, amount };
}

export function applyCoupon(db, coupon, amount, owner, orderId) {
  coupon.usedCount = (Number(coupon.usedCount) || 0) + 1;
  coupon.redemptions = coupon.redemptions || [];
  coupon.redemptions.push({
    owner,
    orderId,
    amount,
    createdAt: new Date().toISOString(),
  });
}
