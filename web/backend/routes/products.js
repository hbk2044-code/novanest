import { Router } from "express";
import { getDb, saveDb, nextId } from "../db.js";
import { authOptional, customerKey } from "../middleware.js";
import { reviewUpload, reviewImageUrl, removeReviewImage } from "../reviewUpload.js";

const router = Router();

// Only admin-approved reviews count toward the product rating. When a product
// has no approved reviews yet, we return rating 0 and ratingCount 0 so the
// frontend hides the stars (unless the admin has enabled the pre-set fallback
// via settings.showDefaultRating).
function productRating(p, db) {
  const revs = (db.reviews || []).filter(
    (r) => r.productId === p.id && r.status === "approved"
  );
  if (revs.length === 0) {
    const fallback = db.settings?.showDefaultRating ? p.rating || 0 : 0;
    return { rating: fallback, ratingCount: 0 };
  }
  const avg = revs.reduce((s, r) => s + r.rating, 0) / revs.length;
  return { rating: Math.round(avg * 10) / 10, ratingCount: revs.length };
}

function publicProduct(p, db) {
  const category = db.categories.find((c) => c.id === p.categoryId);
  const { rating, ratingCount } = productRating(p, db);
  const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : p.image ? [p.image] : [];
  return {
    id: p.id,
    categoryId: p.categoryId,
    categoryName: category ? category.name : "General",
    categorySlug: category ? category.slug : "general",
    name: p.name,
    description: p.description,
    price: p.price,
    oldPrice: p.oldPrice,
    stock: p.stock,
    rating,
    ratingCount,
    sold: p.sold,
    featured: p.featured,
    image: p.image || (images[0] || ""),
    images,
    createdAt: p.createdAt,
  };
}

router.get("/", (req, res) => {
  const db = getDb();
  const { category, search, featured, sort, limit } = req.query;
  let products = db.products.slice();

  if (category) {
    const cat = db.categories.find(
      (c) => c.slug === category || String(c.id) === String(category)
    );
    if (cat) products = products.filter((p) => p.categoryId === cat.id);
  }
  if (search) {
    const q = String(search).toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }
  if (featured === "true") {
    products = products.filter((p) => p.featured);
  }
  if (sort === "price_asc") products.sort((a, b) => a.price - b.price);
  else if (sort === "price_desc") products.sort((a, b) => b.price - a.price);
  else if (sort === "rating") products.sort((a, b) => productRating(b, db).rating - productRating(a, db).rating);
  else if (sort === "newest") products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const all = products.map((p) => publicProduct(p, db));
  const sliced = limit ? all.slice(0, Number(limit)) : all;
  res.json({ products: sliced, total: all.length });
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => String(p.id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });
  const related = db.products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4)
    .map((p) => publicProduct(p, db));
  res.json({ product: publicProduct(product, db), related });
});

// ---------- Reviews ----------

function purchasedProduct(db, owner, productId) {
  return db.orders.some(
    (o) =>
      o.owner === owner &&
      o.status !== "cancelled" &&
      o.status !== "refunded" &&
      (o.items || []).some((it) => String(it.productId) === String(productId))
  );
}

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

function publicReview(r, owner) {
  const isOwn = owner != null && r.owner === owner;
  return {
    id: r.id,
    name: r.name,
    rating: r.rating,
    comment: r.comment,
    images: r.images || [],
    verified: !!r.verified,
    featured: !!r.featured,
    status: r.status,
    pendingApproval: isOwn && r.status !== "approved",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    isOwn,
  };
}

router.get("/:id/reviews", authOptional, (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => String(p.id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });
  const owner = customerKey(req);
  const reviews = (db.reviews || [])
    .filter((r) => r.productId === product.id)
    .filter((r) => r.status === "approved" || (owner && r.owner === owner))
    .sort((a, b) => {
      if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .map((r) => publicReview(r, owner));
  res.json({
    reviews,
    summary: reviewSummary(db, product.id),
    canReview: owner ? purchasedProduct(db, owner, product.id) : false,
  });
});

function createOrUpdateReview(req, res) {
  const owner = customerKey(req);
  if (!owner) return res.status(401).json({ message: "Authentication required" });
  const db = getDb();
  const product = db.products.find((p) => String(p.id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });

  const rating = Number(req.body?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be between 1 and 5" });
  }
  const comment = String(req.body?.comment || "").trim();
  if (comment.length > 1000) {
    return res.status(400).json({ message: "Review is too long (max 1000 characters)" });
  }

  if (!purchasedProduct(db, owner, product.id)) {
    return res.status(403).json({
      message: "You can only review a product you have purchased",
    });
  }

  let name;
  if (req.user) {
    const u = db.users.find((x) => String(x.id) === String(req.user.id));
    name = u ? u.name : "Customer";
  } else {
    name = String(req.body?.name || "").trim() || "Guest";
  }

  const images = (req.files || []).map((f) => reviewImageUrl(f));

  const existing = db.reviews.find(
    (r) => r.productId === product.id && r.owner === owner
  );
  const now = new Date().toISOString();
  if (existing) {
    for (const img of existing.images || []) {
      if (!images.includes(img)) removeReviewImage(img);
    }
    existing.rating = rating;
    existing.comment = comment;
    existing.name = name;
    existing.images = images;
    existing.status = "pending"; // edits go back through moderation
    existing.verified = purchasedProduct(db, owner, product.id);
    existing.updatedAt = now;
  } else {
    db.reviews.push({
      id: nextId("review"),
      productId: product.id,
      owner,
      name,
      rating,
      comment,
      images,
      status: "pending", // requires admin approval before it is public
      featured: false,
      verified: purchasedProduct(db, owner, product.id),
      createdAt: now,
      updatedAt: now,
    });
  }
  saveDb();
  res.status(201).json({
    message: "Review submitted for approval",
    summary: reviewSummary(db, product.id),
    canReview: true,
  });
}

router.post("/:id/reviews", authOptional, (req, res) => {
  reviewUpload.array("images", 5)(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || "Upload failed" });
    createOrUpdateReview(req, res);
  });
});

export default router;
