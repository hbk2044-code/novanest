import { Router } from "express";
import { getDb, saveDb } from "../db.js";
import { authOptional, customerKey } from "../middleware.js";
import { reviewUpload, reviewImageUrl, removeReviewImage } from "../reviewUpload.js";

const router = Router();

function reviewSummary(db, productId) {
  const revs = (db.reviews || []).filter(
    (r) => r.productId === productId && r.status === "approved"
  );
  const byStars = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of revs) byStars[Math.round(r.rating)] = (byStars[Math.round(r.rating)] || 0) + 1;
  const average = revs.length
    ? Math.round((revs.reduce((s, r) => s + r.rating, 0) / revs.length) * 10) / 10
    : 0;
  return { average, count: revs.length, byStars };
}

function purchasedProduct(db, owner, productId) {
  return db.orders.some(
    (o) =>
      o.owner === owner &&
      o.status !== "cancelled" &&
      o.status !== "refunded" &&
      (o.items || []).some((it) => String(it.productId) === String(productId))
  );
}

// Edit your own review. New images replace the old set; the review goes back
// to "pending" so an admin re-approves the updated content.
router.put("/:id", authOptional, (req, res) => {
  reviewUpload.array("images", 5)(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed" });
    const owner = customerKey(req);
    if (!owner) return res.status(401).json({ message: "Authentication required" });
    const db = getDb();
    const review = (db.reviews || []).find((r) => String(r.id) === String(req.params.id));
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.owner !== owner) return res.status(403).json({ message: "You can only edit your own review" });

    const rating = Number(req.body?.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    const comment = String(req.body?.comment || "").trim();
    if (comment.length > 1000) {
      return res.status(400).json({ message: "Review is too long (max 1000 characters)" });
    }

    const images = (req.files || []).map((f) => reviewImageUrl(f));
    for (const img of review.images || []) {
      if (!images.includes(img)) removeReviewImage(img);
    }

    review.rating = rating;
    review.comment = comment;
    review.images = images;
    review.status = "pending";
    review.verified = purchasedProduct(db, owner, review.productId);
    review.updatedAt = new Date().toISOString();
    saveDb();

    res.json({
      message: "Review updated and submitted for approval",
      summary: reviewSummary(db, review.productId),
    });
  });
});

// Delete your own review.
router.delete("/:id", authOptional, (req, res) => {
  const owner = customerKey(req);
  if (!owner) return res.status(401).json({ message: "Authentication required" });
  const db = getDb();
  const idx = (db.reviews || []).findIndex((r) => String(r.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Review not found" });
  if (db.reviews[idx].owner !== owner) {
    return res.status(403).json({ message: "You can only delete your own review" });
  }
  const [removed] = db.reviews.splice(idx, 1);
  for (const img of removed.images || []) removeReviewImage(img);
  saveDb();
  res.json({
    message: "Review deleted",
    summary: reviewSummary(db, removed.productId),
  });
});

export default router;
