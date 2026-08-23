import { Router } from "express";
import { getDb, saveDb, nextId } from "../db.js";
import { authOptional, customerKey } from "../middleware.js";

const router = Router();

function cartResponse(owner) {
  const db = getDb();
  const items = db.cartItems
    .filter((ci) => ci.owner === owner)
    .map((ci) => {
      const product = db.products.find((p) => p.id === ci.productId);
      const cat = product ? db.categories.find((c) => c.id === product.categoryId) : null;
      return {
        id: ci.id,
        productId: ci.productId,
        quantity: ci.quantity,
        product: product
          ? {
              id: product.id,
              name: product.name,
              price: product.price,
              oldPrice: product.oldPrice,
              stock: product.stock,
              categorySlug: cat ? cat.slug : "",
              image: product.image || "",
            }
          : null,
      };
    })
    .filter((i) => i.product);
  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0);
  return { items, subtotal, count: items.reduce((s, i) => s + i.quantity, 0) };
}

// Support both logged-in users and guests (guest session via X-Guest-Id).
router.use(authOptional);

function requireOwner(req, res) {
  const owner = customerKey(req);
  if (!owner) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  return owner;
}

router.get("/", (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  res.json(cartResponse(owner));
});

router.post("/add", (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const { productId, quantity = 1 } = req.body || {};
  const db = getDb();
  const product = db.products.find((p) => String(p.id) === String(productId));
  if (!product) return res.status(404).json({ message: "Product not found" });
  const qty = Math.max(1, Number(quantity) || 1);
  if (qty > product.stock) {
    return res.status(400).json({ message: "Not enough stock available" });
  }
  let item = db.cartItems.find(
    (ci) => ci.owner === owner && ci.productId === product.id
  );
  if (item) {
    item.quantity = Math.min(item.quantity + qty, product.stock);
  } else {
    db.cartItems.push({
      id: nextId("cart"),
      owner,
      productId: product.id,
      quantity: qty,
      addedAt: new Date().toISOString(),
    });
  }
  saveDb();
  res.status(201).json(cartResponse(owner));
});

router.put("/:itemId", (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const { quantity } = req.body || {};
  const db = getDb();
  const item = db.cartItems.find(
    (ci) => ci.id === Number(req.params.itemId) && ci.owner === owner
  );
  if (!item) return res.status(404).json({ message: "Cart item not found" });
  const product = db.products.find((p) => p.id === item.productId);
  const qty = Math.max(1, Number(quantity) || 1);
  item.quantity = product ? Math.min(qty, product.stock) : qty;
  saveDb();
  res.json(cartResponse(owner));
});

router.delete("/:itemId", (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const db = getDb();
  const idx = db.cartItems.findIndex(
    (ci) => ci.id === Number(req.params.itemId) && ci.owner === owner
  );
  if (idx === -1) return res.status(404).json({ message: "Cart item not found" });
  db.cartItems.splice(idx, 1);
  saveDb();
  res.json(cartResponse(owner));
});

router.delete("/", (req, res) => {
  const owner = requireOwner(req, res);
  if (!owner) return;
  const db = getDb();
  db.cartItems = db.cartItems.filter((ci) => ci.owner !== owner);
  saveDb();
  res.json(cartResponse(owner));
});

export default router;
