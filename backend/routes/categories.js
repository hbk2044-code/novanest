import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const db = getDb();
  const categories = db.categories.map((c) => {
    const count = db.products.filter((p) => p.categoryId === c.id).length;
    return { ...c, productCount: count };
  });
  res.json({ categories });
});

export default router;
