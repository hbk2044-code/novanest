import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

function publicProduct(p, db) {
  const category = db.categories.find((c) => c.id === p.categoryId);
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
    rating: p.rating,
    sold: p.sold,
    featured: p.featured,
    image: p.image || "",
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
  else if (sort === "rating") products.sort((a, b) => b.rating - a.rating);
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

export default router;
