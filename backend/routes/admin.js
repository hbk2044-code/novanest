import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getDb, saveDb, nextId, hashPassword } from "../db.js";
import { authRequired, adminRequired } from "../middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "products");
const BANNER_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "banners");
const LOGO_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "logo");

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function uploadDirFor(folder) {
  if (folder === "banners") return BANNER_UPLOAD_DIR;
  if (folder === "logo") return LOGO_UPLOAD_DIR;
  return UPLOAD_DIR;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = uploadDirFor(req.body?.folder);
    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ALLOWED_EXT.includes(ext) ? ext : ".jpg";
    const prefix = req.body?.folder === "banners" ? "banner" : req.body?.folder === "logo" ? "logo" : "prod";
    const name = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error("Only jpg, jpeg, png, webp, gif images are allowed"));
    }
    cb(null, true);
  },
});

function removeImageFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) return;
  const filePath = path.join(__dirname, "..", imageUrl.replace(/^\/uploads\//, ""));
  fs.promises.unlink(filePath).catch(() => {});
}

const router = Router();
router.use(authRequired, adminRequired);

function actorName(db, req) {
  const u = db.users.find((x) => String(x.id) === String(req.user?.id));
  return u ? u.name : "Admin";
}

router.post("/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const folder = req.body?.folder === "banners" ? "banners" : req.body?.folder === "logo" ? "logo" : "products";
    const url = `/uploads/${folder}/${req.file.filename}`;
    res.status(201).json({ url, filename: req.file.filename, folder });
  });
});

router.get("/stats", (req, res) => {
  const db = getDb();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const activeOrders = db.orders.filter((o) => o.status !== "cancelled");
  const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);
  const totalCost = activeOrders.reduce(
    (s, o) => s + (o.items || []).reduce((si, it) => si + (it.unitCost || 0) * it.quantity, 0),
    0
  );
  const grossProfit = totalRevenue - totalCost;
  const totalOrders = db.orders.length;
  const pendingOrders = db.orders.filter((o) => o.status === "pending").length;
  const totalCustomers = db.users.filter((u) => u.role === "customer").length;
  const totalProducts = db.products.length;
  const totalCategories = db.categories.length;
  const lowStock = db.products.filter((p) => p.stock <= 10).length;

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date(now - (i + 1) * dayMs);
    const end = new Date(now - i * dayMs);
    const dayOrders = db.orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= start.getTime() && t < end.getTime() && o.status !== "cancelled";
    });
    const label = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const revenue = dayOrders.reduce((s, o) => s + o.total, 0);
    const cost = dayOrders.reduce(
      (s, o) => s + (o.items || []).reduce((si, it) => si + (it.unitCost || 0) * it.quantity, 0),
      0
    );
    last7.push({
      label,
      orders: dayOrders.length,
      revenue,
      profit: revenue - cost,
    });
  }

  const revenueByCategory = db.categories.map((c) => {
    const catProductIds = new Set(db.products.filter((p) => p.categoryId === c.id).map((p) => p.id));
    let revenue = 0;
    let cost = 0;
    let sales = 0;
    for (const o of activeOrders) {
      for (const item of o.items) {
        if (catProductIds.has(item.productId)) {
          revenue += item.price * item.quantity;
          cost += (item.unitCost || 0) * item.quantity;
          sales += item.quantity;
        }
      }
    }
    return { name: c.name, revenue, cost, profit: revenue - cost, sales };
  });

  const recentOrders = db.orders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
    .map((o) => {
      const user = db.users.find((u) => u.id === o.userId);
      return {
        id: o.id,
        customer: user ? user.name : "Unknown",
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
      };
    });

  const topProducts = db.products
    .slice()
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sold: p.sold,
      revenue: p.sold * p.price,
      cost: p.sold * (p.costPrice || 0),
      profit: p.sold * (p.price - (p.costPrice || 0)),
    }));

  res.json({
    totalRevenue,
    totalCost,
    grossProfit,
    profitMargin: totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0,
    totalOrders,
    pendingOrders,
    totalCustomers,
    totalProducts,
    totalCategories,
    lowStock,
    last7,
    revenueByCategory,
    recentOrders,
    topProducts,
  });
});

// ---------- Products ----------
router.get("/products", (req, res) => {
  const db = getDb();
  const products = db.products
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((p) => {
      const cat = db.categories.find((c) => c.id === p.categoryId);
      return { ...p, categoryName: cat ? cat.name : "General" };
    });
  res.json({ products });
});

router.post("/products", (req, res) => {
  const { name, categoryId, description, price, oldPrice, stock, rating, featured, image, reorderLevel, location, costPrice, unit } = req.body || {};
  const db = getDb();
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Product name is required" });
  }
  const category = db.categories.find((c) => c.id === Number(categoryId));
  if (!category) {
    return res.status(400).json({ message: "Valid category is required" });
  }
  const product = {
    id: nextId("product"),
    categoryId: Number(categoryId),
    sku: "",
    name: String(name).trim(),
    description: description || "",
    price: Number(price) || 0,
    oldPrice: oldPrice ? Number(oldPrice) : null,
    costPrice: Math.max(0, Number(costPrice) || 0),
    stock: Number(stock) || 0,
    reorderLevel: Number(reorderLevel) || 10,
    location: location || "Main Store",
    unit: unit || "Pcs",
    rating: Math.min(5, Math.max(1, Number(rating) || 4.5)),
    sold: 0,
    featured: featured !== false,
    image: typeof image === "string" ? image : "",
    createdAt: new Date().toISOString(),
  };
  const slug = category.slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  product.sku = `NN-${slug || "GEN"}-${String(product.id).padStart(4, "0")}`;
  db.products.push(product);
  db.seq.movement += 1;
  db.stockMovements.push({
    id: db.seq.movement,
    productId: product.id,
    productName: product.name,
    type: "initial",
    quantity: product.stock,
    note: "Opening stock on product creation",
    user: actorName(db, req),
    createdAt: new Date().toISOString(),
  });
  saveDb();
  res.status(201).json({ product });
});

router.put("/products/:id", (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => String(p.id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });
  const { name, categoryId, description, price, oldPrice, stock, rating, featured, image, reorderLevel, location, costPrice, unit } = req.body || {};
  if (name !== undefined && String(name).trim()) product.name = String(name).trim();
  if (categoryId !== undefined) product.categoryId = Number(categoryId);
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price) || 0;
  if (oldPrice !== undefined) product.oldPrice = oldPrice ? Number(oldPrice) : null;
  if (costPrice !== undefined) product.costPrice = Math.max(0, Number(costPrice) || 0);
  if (unit !== undefined) product.unit = String(unit) || "Pcs";
  if (stock !== undefined) {
    const newStock = Number(stock) || 0;
    const diff = newStock - product.stock;
    product.stock = newStock;
    if (diff !== 0) {
      db.seq.movement += 1;
      db.stockMovements.push({
        id: db.seq.movement,
        productId: product.id,
        productName: product.name,
        type: "adjustment",
        quantity: diff,
        note: "Stock updated from product edit",
        user: actorName(db, req),
        createdAt: new Date().toISOString(),
      });
    }
  }
  if (reorderLevel !== undefined) product.reorderLevel = Number(reorderLevel) || 10;
  if (location !== undefined) product.location = location || "Main Store";
  if (rating !== undefined) product.rating = Math.min(5, Math.max(1, Number(rating) || 4.5));
  if (featured !== undefined) product.featured = featured === true;
  if (image !== undefined && typeof image === "string") {
    if (image !== product.image) removeImageFile(product.image);
    product.image = image;
  }
  saveDb();
  res.json({ product });
});

router.delete("/products/:id", (req, res) => {
  const db = getDb();
  const idx = db.products.findIndex((p) => String(p.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Product not found" });
  removeImageFile(db.products[idx].image);
  db.products.splice(idx, 1);
  saveDb();
  res.json({ message: "Product deleted" });
});

// ---------- Inventory ----------
router.get("/inventory", (req, res) => {
  const db = getDb();
  const search = String(req.query.search || "").trim().toLowerCase();
  const statusFilter = String(req.query.status || "");

  let products = db.products.slice().sort((a, b) => String(a.sku || "").localeCompare(String(b.sku || "")));

  if (search) {
    products = products.filter((p) => {
      const cat = db.categories.find((c) => c.id === p.categoryId);
      return [
        p.sku,
        p.name,
        p.location,
        cat ? cat.name : "",
      ].join(" ").toLowerCase().includes(search);
    });
  }

  const stockStatus = (p) => {
    if (p.stock <= 0) return "out";
    if (p.stock <= (p.reorderLevel || 10)) return "low";
    return "in";
  };

  if (statusFilter && ["in", "low", "out"].includes(statusFilter)) {
    products = products.filter((p) => stockStatus(p) === statusFilter);
  }

  const items = products.map((p) => {
    const cat = db.categories.find((c) => c.id === p.categoryId);
    const cost = p.costPrice || 0;
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: cat ? cat.name : "General",
      categorySlug: cat ? cat.slug : "general",
      price: p.price,
      costPrice: cost,
      profitMargin: p.price > 0 ? Math.round(((p.price - cost) / p.price) * 1000) / 10 : 0,
      stock: p.stock,
      reorderLevel: p.reorderLevel || 10,
      location: p.location || "Main Store",
      status: stockStatus(p),
      sold: p.sold,
      stockValue: (p.stock || 0) * (p.price || 0),
      stockCost: (p.stock || 0) * cost,
      potentialProfit: (p.stock || 0) * (p.price - cost),
    };
  });

  const status = (p) => p.status;
  res.json({
    items,
    counts: {
      total: items.length,
      inStock: items.filter((i) => status(i) === "in").length,
      lowStock: items.filter((i) => status(i) === "low").length,
      outOfStock: items.filter((i) => status(i) === "out").length,
    },
  });
});

router.get("/inventory/stats", (req, res) => {
  const db = getDb();
  const stockStatus = (p) => {
    if (p.stock <= 0) return "out";
    if (p.stock <= (p.reorderLevel || 10)) return "low";
    return "in";
  };
  const products = db.products;
  const totalValue = products.reduce((s, p) => s + (p.stock || 0) * (p.price || 0), 0);
  const totalCost = products.reduce((s, p) => s + (p.stock || 0) * (p.costPrice || 0), 0);
  res.json({
    totalSkus: products.length,
    totalUnits: products.reduce((s, p) => s + (p.stock || 0), 0),
    totalValue,
    totalCost,
    potentialProfit: totalValue - totalCost,
    inStock: products.filter((p) => stockStatus(p) === "in").length,
    lowStock: products.filter((p) => stockStatus(p) === "low").length,
    outOfStock: products.filter((p) => stockStatus(p) === "out").length,
    recentMovements: db.stockMovements
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8),
  });
});

router.post("/inventory/:id/restock", (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => String(p.id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });
  const { quantity, note = "" } = req.body || {};
  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    return res.status(400).json({ message: "Restock quantity must be a positive number" });
  }
  product.stock += qty;
  db.seq.movement += 1;
  db.stockMovements.push({
    id: db.seq.movement,
    productId: product.id,
    productName: product.name,
    type: "restock",
    quantity: qty,
    note: note || "Restock",
    user: actorName(db, req),
    createdAt: new Date().toISOString(),
  });
  saveDb();
  res.json({ product, movement: db.stockMovements[db.stockMovements.length - 1] });
});

router.post("/inventory/:id/adjust", (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => String(p.id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });
  const { quantity, note = "" } = req.body || {};
  const qty = Number(quantity);
  if (!qty) return res.status(400).json({ message: "Adjustment quantity is required" });
  const newStock = Math.max(0, product.stock + qty);
  product.stock = newStock;
  db.seq.movement += 1;
  db.stockMovements.push({
    id: db.seq.movement,
    productId: product.id,
    productName: product.name,
    type: "adjustment",
    quantity: qty,
    note: note || "Manual adjustment",
    user: actorName(db, req),
    createdAt: new Date().toISOString(),
  });
  saveDb();
  res.json({ product, movement: db.stockMovements[db.stockMovements.length - 1] });
});

router.put("/inventory/:id", (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => String(p.id) === String(req.params.id));
  if (!product) return res.status(404).json({ message: "Product not found" });
  const { sku, reorderLevel, location } = req.body || {};
  if (sku !== undefined && String(sku).trim()) {
    const dup = db.products.find(
      (p) => String(p.id) !== String(product.id) && String(p.sku).toLowerCase() === String(sku).trim().toLowerCase()
    );
    if (dup) return res.status(409).json({ message: `SKU ${sku} is already in use by ${dup.name}` });
    product.sku = String(sku).trim().toUpperCase();
  }
  if (reorderLevel !== undefined) product.reorderLevel = Number(reorderLevel) || 10;
  if (location !== undefined) product.location = location || "Main Store";
  saveDb();
  res.json({ product });
});

router.get("/inventory/movements", (req, res) => {
  const db = getDb();
  const productId = req.query.productId;
  const limit = Number(req.query.limit) || 200;
  let moves = db.stockMovements.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (productId) moves = moves.filter((m) => String(m.productId) === String(productId));
  res.json({ movements: moves.slice(0, limit) });
});

// ---------- Purchases (Stock Intake) & Supplier Payments ----------
const CREDIT_TERMS_DAYS = 35;
const DUE_SOON_DAYS = 5;

function paymentStatusFor(purchase, now = Date.now()) {
  const total = purchase.total || 0;
  const paid = purchase.paidAmount || 0;
  if (paid >= total && total > 0) return "paid";
  const due = new Date(purchase.dueDate || purchase.createdAt).getTime();
  const daysLeft = Math.ceil((due - now) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= DUE_SOON_DAYS) return "due soon";
  return "pending";
}

function purchaseSummary(db, p) {
  const paid = p.paidAmount || 0;
  const due = new Date(p.dueDate || p.createdAt).getTime();
  const now = Date.now();
  const daysLeft = Math.ceil((due - now) / (24 * 60 * 60 * 1000));
  return {
    id: p.id,
    purchaseNo: p.purchaseNo,
    supplier: p.supplier,
    supplierPhone: p.supplierPhone || "",
    purchaseDate: p.purchaseDate,
    dueDate: p.dueDate,
    daysLeft,
    items: p.items || [],
    subtotal: p.subtotal || 0,
    total: p.total || 0,
    paidAmount: paid,
    balance: (p.total || 0) - paid,
    paymentStatus: paymentStatusFor(p),
    payments: p.payments || [],
    notes: p.notes || "",
    createdBy: p.createdBy,
    createdAt: p.createdAt,
  };
}

router.get("/purchases/summary", (req, res) => {
  const db = getDb();
  const now = Date.now();
  let totalOwed = 0;
  let dueSoon = 0;
  let overdue = 0;
  let paid = 0;
  let pending = 0;
  for (const p of db.purchases) {
    const s = purchaseSummary(db, p);
    if (s.paymentStatus === "paid") paid += s.paidAmount;
    else {
      totalOwed += s.balance;
      if (s.paymentStatus === "overdue") overdue += s.balance;
      else if (s.paymentStatus === "due soon") dueSoon += s.balance;
      else pending += s.balance;
    }
  }
  res.json({
    totalOwed,
    dueSoon,
    overdue,
    pending,
    paid,
    count: db.purchases.length,
    dueSoonCount: db.purchases.filter((p) => paymentStatusFor(p, now) === "due soon").length,
    overdueCount: db.purchases.filter((p) => paymentStatusFor(p, now) === "overdue").length,
  });
});

router.get("/purchases", (req, res) => {
  const db = getDb();
  const search = String(req.query.search || "").trim().toLowerCase();
  const statusFilter = String(req.query.status || "");
  let purchases = db.purchases.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (search) {
    purchases = purchases.filter((p) => {
      const itemNames = (p.items || []).map((i) => i.productName || "").join(" ");
      return [p.purchaseNo, p.supplier, p.supplierPhone, p.notes || "", itemNames]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }
  if (statusFilter) {
    purchases = purchases.filter((p) => paymentStatusFor(p) === statusFilter);
  }
  res.json({ purchases: purchases.map((p) => purchaseSummary(db, p)) });
});

router.get("/purchases/:id", (req, res) => {
  const db = getDb();
  const p = db.purchases.find((x) => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ message: "Purchase not found" });
  res.json({ purchase: purchaseSummary(db, p) });
});

function applyPurchaseStock(db, purchase, actor, sign) {
  for (const it of purchase.items || []) {
    const product = db.products.find((p) => String(p.id) === String(it.productId));
    if (!product) continue;
    const delta = sign * it.quantity;
    product.stock = Math.max(0, (product.stock || 0) + delta);
    if (sign > 0 && it.unitCost) product.costPrice = Math.round(it.unitCost);
    db.seq.movement += 1;
    db.stockMovements.push({
      id: db.seq.movement,
      productId: product.id,
      productName: product.name,
      type: sign > 0 ? "purchase" : "purchase-reversal",
      quantity: delta,
      note: `${purchase.purchaseNo} (${purchase.supplier})`,
      user: actor,
      createdAt: new Date().toISOString(),
    });
  }
}

router.post("/purchases", (req, res) => {
  const db = getDb();
  const {
    supplier,
    supplierPhone = "",
    purchaseDate,
    dueDate,
    items = [],
    notes = "",
  } = req.body || {};

  if (!supplier || !String(supplier).trim()) {
    return res.status(400).json({ message: "Supplier name is required" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Add at least one item to intake stock" });
  }
  const cleanItems = [];
  for (const it of items) {
    const product = db.products.find((p) => String(p.id) === String(it.productId));
    if (!product) continue;
    const qty = Math.max(0, Number(it.quantity) || 0);
    const unitCost = Math.max(0, Number(it.unitCost) || 0);
    if (qty <= 0) continue;
    cleanItems.push({
      productId: product.id,
      productName: product.name,
      quantity: qty,
      unit: it.unit || product.unit || "Pcs",
      unitCost,
      subtotal: qty * unitCost,
    });
  }
  if (cleanItems.length === 0) {
    return res.status(400).json({ message: "No valid items to intake" });
  }

  const id = nextId("purchase");
  const baseDate = dueDate ? new Date(dueDate) : new Date(purchaseDate || Date.now());
  if (Number.isNaN(baseDate.getTime())) return res.status(400).json({ message: "Invalid due date" });
  const subtotal = cleanItems.reduce((s, i) => s + i.subtotal, 0);
  const purchase = {
    id,
    purchaseNo: `PO-${String(id).padStart(4, "0")}`,
    supplier: String(supplier).trim(),
    supplierPhone: String(supplierPhone),
    purchaseDate: purchaseDate || new Date().toISOString(),
    dueDate: baseDate.toISOString(),
    items: cleanItems,
    subtotal,
    total: subtotal,
    paidAmount: 0,
    payments: [],
    notes: String(notes),
    createdBy: actorName(db, req),
    createdAt: new Date().toISOString(),
  };
  db.purchases.push(purchase);
  applyPurchaseStock(db, purchase, actorName(db, req), 1);
  saveDb();
  res.status(201).json({ purchase: purchaseSummary(db, purchase) });
});

router.put("/purchases/:id", (req, res) => {
  const db = getDb();
  const purchase = db.purchases.find((p) => String(p.id) === String(req.params.id));
  if (!purchase) return res.status(404).json({ message: "Purchase not found" });
  const { supplier, supplierPhone, dueDate, notes, items } = req.body || {};
  if (supplier !== undefined) {
    if (!String(supplier).trim()) return res.status(400).json({ message: "Supplier name is required" });
    purchase.supplier = String(supplier).trim();
  }
  if (supplierPhone !== undefined) purchase.supplierPhone = String(supplierPhone);
  if (dueDate !== undefined) {
    const d = new Date(dueDate);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ message: "Invalid due date" });
    purchase.dueDate = d.toISOString();
  }
  if (notes !== undefined) purchase.notes = String(notes);

  if (items !== undefined) {
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Add at least one item to intake stock" });
    }
    const cleanItems = [];
    for (const it of items) {
      const product = db.products.find((p) => String(p.id) === String(it.productId));
      if (!product) continue;
      const qty = Math.max(0, Number(it.quantity) || 0);
      const unitCost = Math.max(0, Number(it.unitCost) || 0);
      if (qty <= 0) continue;
      cleanItems.push({
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unit: it.unit || product.unit || "Pcs",
        unitCost,
        subtotal: qty * unitCost,
      });
    }
    if (cleanItems.length === 0) {
      return res.status(400).json({ message: "No valid items to intake" });
    }
    applyPurchaseStock(db, purchase, actorName(db, req), -1);
    purchase.items = cleanItems;
    purchase.subtotal = cleanItems.reduce((s, i) => s + i.subtotal, 0);
    purchase.total = purchase.subtotal;
    applyPurchaseStock(db, purchase, actorName(db, req), 1);
  }

  saveDb();
  res.json({ purchase: purchaseSummary(db, purchase) });
});

router.delete("/purchases/:id", (req, res) => {
  const db = getDb();
  const idx = db.purchases.findIndex((p) => String(p.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Purchase not found" });
  const purchase = db.purchases[idx];
  if ((purchase.paidAmount || 0) > 0 || (purchase.payments || []).length > 0) {
    return res.status(400).json({ message: "Cannot delete a purchase that has payments recorded" });
  }
  applyPurchaseStock(db, purchase, actorName(db, req), -1);
  db.purchases.splice(idx, 1);
  saveDb();
  res.json({ message: `Purchase ${purchase.purchaseNo} deleted and stock reversed` });
});

router.post("/purchases/:id/payments", (req, res) => {
  const db = getDb();
  const purchase = db.purchases.find((p) => String(p.id) === String(req.params.id));
  if (!purchase) return res.status(404).json({ message: "Purchase not found" });
  const { amount, method = "Bank Transfer", date, note = "" } = req.body || {};
  const amt = Math.max(0, Number(amount) || 0);
  if (amt <= 0) return res.status(400).json({ message: "Payment amount must be positive" });
  const summary = purchaseSummary(db, purchase);
  if (amt > summary.balance + 0.001) {
    return res.status(400).json({ message: `Amount exceeds the balance of ${summary.balance}` });
  }
  db.seq.payment += 1;
  purchase.payments.push({
    id: db.seq.payment,
    amount: amt,
    method: String(method),
    date: date || new Date().toISOString(),
    note: String(note),
    createdBy: actorName(db, req),
    createdAt: new Date().toISOString(),
  });
  purchase.paidAmount = (purchase.paidAmount || 0) + amt;
  saveDb();
  res.status(201).json({ purchase: purchaseSummary(db, purchase) });
});

// ---------- Categories ----------
router.get("/categories", (req, res) => {
  const db = getDb();
  const categories = db.categories.map((c) => ({
    ...c,
    productCount: db.products.filter((p) => p.categoryId === c.id).length,
  }));
  res.json({ categories });
});

router.post("/categories", (req, res) => {
  const { name, icon, color, description } = req.body || {};
  const db = getDb();
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Category name is required" });
  }
  const slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const category = {
    id: nextId("category"),
    name: String(name).trim(),
    slug: slug || "category",
    icon: icon || "🛍️",
    color: color || "#8b5cf6",
    description: description || "",
    createdAt: new Date().toISOString(),
  };
  db.categories.push(category);
  saveDb();
  res.status(201).json({ category });
});

router.put("/categories/:id", (req, res) => {
  const db = getDb();
  const category = db.categories.find((c) => String(c.id) === String(req.params.id));
  if (!category) return res.status(404).json({ message: "Category not found" });
  const { name, icon, color, description } = req.body || {};
  if (name !== undefined && String(name).trim()) category.name = String(name).trim();
  if (icon !== undefined) category.icon = icon;
  if (color !== undefined) category.color = color;
  if (description !== undefined) category.description = description;
  saveDb();
  res.json({ category });
});

router.delete("/categories/:id", (req, res) => {
  const db = getDb();
  const idx = db.categories.findIndex((c) => String(c.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Category not found" });
  const used = db.products.some((p) => p.categoryId === db.categories[idx].id);
  if (used) {
    return res.status(400).json({ message: "Cannot delete: category has products" });
  }
  db.categories.splice(idx, 1);
  saveDb();
  res.json({ message: "Category deleted" });
});

// ---------- Orders ----------
router.get("/orders", (req, res) => {
  const db = getDb();
  const search = String(req.query.search || "").trim().toLowerCase();
  let orders = db.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (search) {
    orders = orders.filter((o) => {
      const user = db.users.find((u) => u.id === o.userId);
      const fields = [
        String(o.id),
        user ? user.name : "",
        user ? user.email : "",
        o.paymentMethod,
        o.paymentStatus || "",
        o.shippingAddress || "",
        o.phone || "",
        o.status,
      ];
      for (const it of o.items || []) fields.push(it.productName);
      return fields.join(" ").toLowerCase().includes(search);
    });
  }

  const result = orders.map((o) => {
    const user = db.users.find((u) => u.id === o.userId);
    return {
      id: o.id,
      customer: user ? user.name : "Deleted User",
      email: user ? user.email : "",
      items: o.items,
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      total: o.total,
      status: o.status,
      paymentStatus: o.paymentStatus || "pending",
      deliveryDetails: o.deliveryDetails || {},
      shippingAddress: o.shippingAddress,
      phone: o.phone,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
    };
  });
  res.json({ orders: result });
});

router.get("/orders/:id", (req, res) => {
  const db = getDb();
  const order = db.orders.find((o) => String(o.id) === String(req.params.id));
  if (!order) return res.status(404).json({ message: "Order not found" });
  const user = db.users.find((u) => u.id === order.userId);
  res.json({
    order: {
      ...order,
      customer: user ? user.name : "Deleted User",
      email: user ? user.email : "",
      paymentStatus: order.paymentStatus || "pending",
    },
  });
});

router.put("/orders/:id", (req, res) => {
  const db = getDb();
  const order = db.orders.find((o) => String(o.id) === String(req.params.id));
  if (!order) return res.status(404).json({ message: "Order not found" });
  const { status, paymentStatus } = req.body || {};
  const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  const paymentAllowed = ["pending", "paid", "refunded", "failed"];
  if (status !== undefined) {
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }
    order.status = status;
  }
  if (paymentStatus !== undefined) {
    if (!paymentAllowed.includes(paymentStatus)) {
      return res.status(400).json({ message: "Invalid payment status" });
    }
    order.paymentStatus = paymentStatus;
  }
  saveDb();
  res.json({ order });
});

// ---------- Store Info (Invoice Settings) ----------
router.get("/settings/store-info", (req, res) => {
  const db = getDb();
  res.json({ storeInfo: db.settings.storeInfo });
});

router.put("/settings/store-info", (req, res) => {
  const db = getDb();
  const body = req.body || {};
  const str = (k) => (body[k] !== undefined ? String(body[k]) : db.settings.storeInfo[k]);
  db.settings.storeInfo = {
    companyName: str("companyName") || "NovaNest",
    tagline: str("tagline") || "",
    address: str("address") || "",
    phone: str("phone") || "",
    email: str("email") || "",
    pan: str("pan") || "",
    bankName: str("bankName") || "",
    bankAccount: str("bankAccount") || "",
  };
  saveDb();
  res.json({ storeInfo: db.settings.storeInfo });
});

// ---------- Branding (Logo & Name) ----------
router.get("/settings/branding", (req, res) => {
  const db = getDb();
  res.json({ branding: db.settings.branding });
});

router.put("/settings/branding", (req, res) => {
  const db = getDb();
  const body = req.body || {};
  const str = (k, dflt = "") => (body[k] !== undefined && body[k] !== null ? String(body[k]) : dflt);
  const current = db.settings.branding || {};
  if (body.logo !== undefined && typeof body.logo === "string" && body.logo !== current.logo) {
    removeImageFile(current.logo);
  }
  db.settings.branding = {
    appName: str("appName", current.appName || "NovaNest") || "NovaNest",
    tagline: str("tagline", current.tagline || ""),
    logo: typeof body.logo === "string" ? body.logo : current.logo || "",
    icon: str("icon", current.icon || "🛍️") || "🛍️",
  };
  saveDb();
  res.json({ branding: db.settings.branding });
});

// ---------- Users ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function userSummary(db, u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    address: u.address,
    createdAt: u.createdAt,
    orderCount: db.orders.filter((o) => o.userId === u.id).length,
  };
}

router.get("/users", (req, res) => {
  const db = getDb();
  res.json({ users: db.users.map((u) => userSummary(db, u)) });
});

function findUserOr404(db, req, res) {
  const user = db.users.find((u) => String(u.id) === String(req.params.id));
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return null;
  }
  return user;
}

router.post("/users", (req, res) => {
  const { name, email, password, role = "customer", phone = "", address = "" } = req.body || {};
  const db = getDb();
  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Name is required" });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "A valid email is required" });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  if (!["customer", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: "An account with this email already exists" });
  }
  const user = {
    id: nextId("user"),
    name: String(name).trim(),
    email: email.toLowerCase(),
    password: hashPassword(password),
    role,
    phone: String(phone),
    address: String(address),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb();
  res.status(201).json({ user: userSummary(db, user) });
});

router.put("/users/:id", (req, res) => {
  const db = getDb();
  const user = findUserOr404(db, req, res);
  if (!user) return;
  const { name, email, phone, address, role } = req.body || {};
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ message: "Name cannot be empty" });
    user.name = String(name).trim();
  }
  if (email !== undefined) {
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "A valid email is required" });
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== user.id)) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }
    user.email = email.toLowerCase();
  }
  if (phone !== undefined) user.phone = String(phone);
  if (address !== undefined) user.address = String(address);
  if (role !== undefined) {
    if (!["customer", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    if (String(user.id) === String(req.user.id) && role !== "admin") {
      return res.status(400).json({ message: "You cannot remove your own admin role" });
    }
    const adminCount = db.users.filter((u) => u.role === "admin").length;
    if (user.role === "admin" && role !== "admin" && adminCount <= 1) {
      return res.status(400).json({ message: "At least one admin must remain" });
    }
    user.role = role;
  }
  saveDb();
  res.json({ user: userSummary(db, user) });
});

router.put("/users/:id/password", (req, res) => {
  const db = getDb();
  const user = findUserOr404(db, req, res);
  if (!user) return;
  const { newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters" });
  }
  user.password = hashPassword(String(newPassword));
  saveDb();
  res.json({ message: "Password updated successfully" });
});

router.delete("/users/:id", (req, res) => {
  const db = getDb();
  const idx = db.users.findIndex((u) => String(u.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "User not found" });
  const user = db.users[idx];
  if (String(user.id) === String(req.user.id)) {
    return res.status(400).json({ message: "You cannot delete your own account" });
  }
  if (user.role === "admin") {
    const adminCount = db.users.filter((u) => u.role === "admin").length;
    if (adminCount <= 1) {
      return res.status(400).json({ message: "Cannot delete the last admin account" });
    }
  }
  db.cartItems = db.cartItems.filter((ci) => ci.userId !== user.id);
  db.users.splice(idx, 1);
  saveDb();
  res.json({ message: `User ${user.name} deleted`, id: user.id });
});

// ---------- Checkout Form Settings ----------
const FIELD_TYPES = ["text", "textarea", "select", "number", "email", "tel", "province", "district", "city"];

function publicField(f) {
  return {
    id: f.id,
    key: f.key,
    label: f.label,
    type: f.type,
    active: f.active,
    required: f.required,
    builtin: f.builtin,
    placeholder: f.placeholder || "",
    options: f.options || [],
  };
}

router.get("/settings/checkout-fields", (req, res) => {
  const db = getDb();
  const fields = db.settings.checkoutFields
    .slice()
    .sort((a, b) => a.id - b.id)
    .map(publicField);
  res.json({ fields });
});

router.post("/settings/checkout-fields", (req, res) => {
  const { label, type = "text", required = false, placeholder = "", options = [], active = true } = req.body || {};
  const db = getDb();
  if (!label || !String(label).trim()) {
    return res.status(400).json({ message: "Field label is required" });
  }
  if (!FIELD_TYPES.includes(type)) {
    return res.status(400).json({ message: "Invalid field type" });
  }
  const keyBase = String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  let key = keyBase || "field";
  let n = 2;
  const keys = new Set(db.settings.checkoutFields.map((f) => f.key));
  while (keys.has(key)) key = `${keyBase || "field"}_${n++}`;
  const field = {
    id: nextId("field"),
    key,
    label: String(label).trim(),
    type,
    active: active !== false,
    required: required === true,
    builtin: false,
    placeholder: placeholder || "",
    options: Array.isArray(options) ? options.filter(Boolean) : [],
  };
  db.settings.checkoutFields.push(field);
  saveDb();
  res.status(201).json({ field: publicField(field) });
});

router.put("/settings/checkout-fields/:id", (req, res) => {
  const db = getDb();
  const field = db.settings.checkoutFields.find((f) => String(f.id) === String(req.params.id));
  if (!field) return res.status(404).json({ message: "Field not found" });
  const { label, type, active, required, placeholder, options } = req.body || {};
  if (label !== undefined) {
    if (!String(label).trim()) return res.status(400).json({ message: "Label cannot be empty" });
    field.label = String(label).trim();
  }
  if (type !== undefined) {
    if (!FIELD_TYPES.includes(type)) return res.status(400).json({ message: "Invalid field type" });
    field.type = type;
  }
  if (active !== undefined) field.active = active === true;
  if (required !== undefined) field.required = required === true;
  if (placeholder !== undefined) field.placeholder = placeholder || "";
  if (options !== undefined) field.options = Array.isArray(options) ? options.filter(Boolean) : [];
  saveDb();
  res.json({ field: publicField(field) });
});

router.delete("/settings/checkout-fields/:id", (req, res) => {
  const db = getDb();
  const idx = db.settings.checkoutFields.findIndex((f) => String(f.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Field not found" });
  const field = db.settings.checkoutFields[idx];
  if (field.builtin) {
    return res.status(400).json({ message: "Built-in fields cannot be removed. You can deactivate them instead." });
  }
  db.settings.checkoutFields.splice(idx, 1);
  saveDb();
  res.json({ message: `Field "${field.label}" removed` });
});

router.post("/settings/checkout-fields/reset", (req, res) => {
  const db = getDb();
  db.settings.checkoutFields = [];
  let id = 0;
  for (const f of [
    { key: "fullName", label: "Full Name", type: "text", required: true, placeholder: "Your full name" },
    { key: "email", label: "Email", type: "email", required: true, placeholder: "you@example.com" },
    { key: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "e.g. 98XXXXXXXX" },
    { key: "shippingAddress", label: "Shipping Address", type: "textarea", required: true, placeholder: "House no, street, city, district" },
    { key: "province", label: "Province", type: "province", required: true, placeholder: "Select your province" },
    { key: "district", label: "District", type: "district", required: true, placeholder: "Select your district" },
    { key: "city", label: "City / Municipality", type: "city", required: true, placeholder: "Select your city" },
    { key: "notes", label: "Delivery Notes (Optional)", type: "textarea", required: false, placeholder: "e.g. Landmark, preferred delivery time" },
  ]) {
    id += 1;
    db.settings.checkoutFields.push({
      id,
      key: f.key,
      label: f.label,
      type: f.type,
      active: true,
      required: f.required,
      builtin: true,
      placeholder: f.placeholder || "",
      options: [],
    });
  }
  db.seq.field = id;
  saveDb();
  res.json({ message: "Checkout form reset to defaults", fields: db.settings.checkoutFields.map(publicField) });
});

// ---------- Hero Banner Settings ----------
const FONTS = [
  "Plus Jakarta Sans",
  "Georgia, serif",
  "Times New Roman, serif",
  "Courier New, monospace",
  "Arial, sans-serif",
  "Trebuchet MS, sans-serif",
  "Palatino Linotype, serif",
];
const FONT_SIZES = ["small", "medium", "large", "xlarge"];

function bannerField(b) {
  return {
    id: b.id,
    badge: b.badge || "",
    title: b.title || "",
    titleHighlight: b.titleHighlight || "",
    subtitle: b.subtitle || "",
    buttonText: b.buttonText || "",
    buttonLink: b.buttonLink || "/shop",
    buttonColor: b.buttonColor || "#f59e0b",
    bgType: b.bgType || "gradient",
    bgColor1: b.bgColor1 || "#5b21b6",
    bgColor2: b.bgColor2 || "#a855f7",
    textColor: b.textColor || "#ffffff",
    fontFamily: b.fontFamily || "Plus Jakarta Sans",
    fontSize: b.fontSize || "large",
    align: b.align || "left",
    image: b.image || "",
    icon: b.icon || "🛍️",
    active: b.active !== false,
    sortOrder: b.sortOrder || 0,
  };
}

function sanitizeBanner(body) {
  const s = {};
  const str = (k, dflt = "") => (body[k] !== undefined && body[k] !== null ? String(body[k]) : dflt);
  if (body.badge !== undefined) s.badge = str("badge");
  if (body.title !== undefined) s.title = str("title");
  if (body.titleHighlight !== undefined) s.titleHighlight = str("titleHighlight");
  if (body.subtitle !== undefined) s.subtitle = str("subtitle");
  if (body.buttonText !== undefined) s.buttonText = str("buttonText", "Shop Now");
  if (body.buttonLink !== undefined) s.buttonLink = str("buttonLink", "/shop");
  if (body.buttonColor !== undefined) s.buttonColor = str("buttonColor", "#f59e0b");
  if (body.bgType !== undefined) s.bgType = ["gradient", "solid", "image"].includes(body.bgType) ? body.bgType : "gradient";
  if (body.bgColor1 !== undefined) s.bgColor1 = str("bgColor1", "#5b21b6");
  if (body.bgColor2 !== undefined) s.bgColor2 = str("bgColor2", "#a855f7");
  if (body.textColor !== undefined) s.textColor = str("textColor", "#ffffff");
  if (body.fontFamily !== undefined) s.fontFamily = body.fontFamily || "Plus Jakarta Sans";
  if (body.fontSize !== undefined) s.fontSize = FONT_SIZES.includes(body.fontSize) ? body.fontSize : "large";
  if (body.align !== undefined) s.align = ["left", "center", "right"].includes(body.align) ? body.align : "left";
  if (body.image !== undefined) s.image = typeof body.image === "string" ? body.image : "";
  if (body.icon !== undefined) s.icon = typeof body.icon === "string" ? body.icon : "🛍️";
  if (body.active !== undefined) s.active = body.active === true;
  if (body.sortOrder !== undefined) s.sortOrder = Number(body.sortOrder) || 0;
  return s;
}

router.get("/settings/hero-banners", (req, res) => {
  const db = getDb();
  const banners = db.settings.heroBanners
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(bannerField);
  res.json({ banners });
});

router.post("/settings/hero-banners", (req, res) => {
  const db = getDb();
  const banner = {
    id: nextId("banner"),
    badge: "",
    title: "New Banner",
    titleHighlight: "",
    subtitle: "",
    buttonText: "Shop Now",
    buttonLink: "/shop",
    buttonColor: "#f59e0b",
    bgType: "gradient",
    bgColor1: "#5b21b6",
    bgColor2: "#a855f7",
    textColor: "#ffffff",
    fontFamily: "Plus Jakarta Sans",
    fontSize: "large",
    align: "left",
    image: "",
    icon: "🛍️",
    active: true,
    sortOrder: (db.settings.heroBanners.length || 0) + 1,
    ...sanitizeBanner(req.body || {}),
  };
  db.settings.heroBanners.push(banner);
  saveDb();
  res.status(201).json({ banner: bannerField(banner) });
});

router.put("/settings/hero-banners/:id", (req, res) => {
  const db = getDb();
  const banner = db.settings.heroBanners.find((b) => String(b.id) === String(req.params.id));
  if (!banner) return res.status(404).json({ message: "Banner not found" });
  Object.assign(banner, sanitizeBanner(req.body || {}));
  saveDb();
  res.json({ banner: bannerField(banner) });
});

router.delete("/settings/hero-banners/:id", (req, res) => {
  const db = getDb();
  const idx = db.settings.heroBanners.findIndex((b) => String(b.id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ message: "Banner not found" });
  db.settings.heroBanners.splice(idx, 1);
  saveDb();
  res.json({ message: "Banner deleted" });
});

router.post("/settings/hero-banners/reorder", (req, res) => {
  const { order } = req.body || {};
  if (!Array.isArray(order)) return res.status(400).json({ message: "order must be an array of banner ids" });
  const db = getDb();
  for (let i = 0; i < order.length; i++) {
    const banner = db.settings.heroBanners.find((b) => String(b.id) === String(order[i]));
    if (banner) banner.sortOrder = i + 1;
  }
  saveDb();
  res.json({ message: "Order updated", banners: db.settings.heroBanners.slice().sort((a, b) => a.sortOrder - b.sortOrder).map(bannerField) });
});

export default router;
