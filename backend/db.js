import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "novanest.json");

const EMPTY_DB = {
  users: [],
  categories: [],
  products: [],
  cartItems: [],
  orders: [],
  stockMovements: [],
  purchases: [],
  passwordResets: [],
  settings: {
    storeInfo: {
      companyName: "NovaNest",
      tagline: "Everything Nepal Needs, One Nest.",
      address: "Biratnagar, Morang, Nepal",
      phone: "+977-9800000000",
      email: "support@novanest.com",
      pan: "",
      bankName: "Nepal Rastra Bank",
      bankAccount: "",
    },
    branding: {
      appName: "NovaNest",
      tagline: "Everything Nepal Needs, One Nest.",
      logo: "",
      icon: "🛍️",
    },
    checkoutFields: [
      {
        id: 1,
        key: "fullName",
        label: "Full Name",
        type: "text",
        active: true,
        required: true,
        builtin: true,
        placeholder: "Your full name",
      },
      {
        id: 2,
        key: "email",
        label: "Email",
        type: "text",
        active: true,
        required: true,
        builtin: true,
        placeholder: "you@example.com",
      },
      {
        id: 3,
        key: "phone",
        label: "Phone Number",
        type: "tel",
        active: true,
        required: true,
        builtin: true,
        placeholder: "e.g. 98XXXXXXXX",
      },
      {
        id: 4,
        key: "shippingAddress",
        label: "Shipping Address",
        type: "textarea",
        active: true,
        required: true,
        builtin: true,
        placeholder: "House no, street, city, district",
      },
      {
        id: 5,
        key: "notes",
        label: "Delivery Notes (Optional)",
        type: "textarea",
        active: true,
        required: false,
        builtin: true,
        placeholder: "e.g. Landmark, preferred delivery time",
      },
      {
        id: 6,
        key: "province",
        label: "Province",
        type: "province",
        active: true,
        required: true,
        builtin: true,
        placeholder: "Select your province",
      },
      {
        id: 7,
        key: "district",
        label: "District",
        type: "district",
        active: true,
        required: true,
        builtin: true,
        placeholder: "Select your district",
      },
      {
        id: 8,
        key: "city",
        label: "City / Municipality",
        type: "city",
        active: true,
        required: true,
        builtin: true,
        placeholder: "Select your city",
      },
    ],
    heroBanners: [
      {
        id: 1,
        badge: "🚀 Marketplace",
        title: "Everything Nepal Needs,",
        titleHighlight: "One Nest.",
        subtitle:
          "Shop fresh food, groceries, cooked meals, fashion, cosmetics and quality used electronics — all in one marketplace.",
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
        sortOrder: 1,
      },
      {
        id: 2,
        badge: "🍛 Fresh Food",
        title: "Fresh Food Delivered",
        titleHighlight: "to Your Door.",
        subtitle:
          "Hot momos, thakali sets, curries and more — cooked fresh and delivered fast across Nepal.",
        buttonText: "Order Food",
        buttonLink: "/shop?category=cooked-food",
        buttonColor: "#ef4444",
        bgType: "gradient",
        bgColor1: "#b91c1c",
        bgColor2: "#f97316",
        textColor: "#ffffff",
        fontFamily: "Plus Jakarta Sans",
        fontSize: "large",
        align: "left",
        image: "",
        icon: "🍛",
        active: true,
        sortOrder: 2,
      },
      {
        id: 3,
        badge: "🛒 Groceries",
        title: "Daily Groceries at",
        titleHighlight: "Great Prices.",
        subtitle:
          "Rice, oil, fresh produce, eggs and everything for the kitchen — at prices that make sense.",
        buttonText: "Shop Groceries",
        buttonLink: "/shop?category=groceries",
        buttonColor: "#16a34a",
        bgType: "gradient",
        bgColor1: "#166534",
        bgColor2: "#22c55e",
        textColor: "#ffffff",
        fontFamily: "Plus Jakarta Sans",
        fontSize: "large",
        align: "left",
        image: "",
        icon: "🛒",
        active: true,
        sortOrder: 3,
      },
      {
        id: 4,
        badge: "👕 Fashion",
        title: "New Fashion.",
        titleHighlight: "New Style.",
        subtitle:
          "Kurtas, sneakers, sarees and winter wear — refresh your wardrobe with NovaNest fashion.",
        buttonText: "Explore Fashion",
        buttonLink: "/shop?category=clothes",
        buttonColor: "#3b82f6",
        bgType: "gradient",
        bgColor1: "#1d4ed8",
        bgColor2: "#7c3aed",
        textColor: "#ffffff",
        fontFamily: "Plus Jakarta Sans",
        fontSize: "large",
        align: "left",
        image: "",
        icon: "👕",
        active: true,
        sortOrder: 4,
      },
    ],
  },
  seq: {
    user: 0,
    category: 0,
    product: 0,
    cart: 0,
    order: 0,
    reset: 0,
    field: 8,
    banner: 4,
    movement: 0,
    purchase: 0,
    payment: 0,
  },
};

let db = null;

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(EMPTY_DB, null, 2));
  }
}

export function loadDb() {
  ensureFile();
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (e) {
    db = structuredClone(EMPTY_DB);
  }
  if (!db.seq) db.seq = EMPTY_DB.seq;
  if (!db.passwordResets) db.passwordResets = [];
  if (!db.seq.reset) db.seq.reset = 0;
  if (!db.settings) db.settings = structuredClone(EMPTY_DB.settings);
  if (!db.settings.checkoutFields || db.settings.checkoutFields.length === 0) {
    db.settings.checkoutFields = structuredClone(EMPTY_DB.settings.checkoutFields);
  } else {
    // Migration: add Nepal address fields (province/district/city) if missing
    const keys = db.settings.checkoutFields.map((f) => f.key);
    const nAddress = EMPTY_DB.settings.checkoutFields.filter((f) =>
      ["province", "district", "city"].includes(f.key)
    );
    for (const f of nAddress) {
      if (!keys.includes(f.key)) {
        f.id = db.seq.field + 1;
        db.seq.field += 1;
        db.settings.checkoutFields.push(f);
      }
    }
  }
  if (!db.settings.heroBanners || db.settings.heroBanners.length === 0) {
    db.settings.heroBanners = structuredClone(EMPTY_DB.settings.heroBanners);
  }
  if (!db.settings.storeInfo) {
    db.settings.storeInfo = structuredClone(EMPTY_DB.settings.storeInfo);
  } else {
    for (const k of Object.keys(EMPTY_DB.settings.storeInfo)) {
      if (db.settings.storeInfo[k] === undefined) {
        db.settings.storeInfo[k] = EMPTY_DB.settings.storeInfo[k];
      }
    }
  }
  if (!db.settings.branding) {
    db.settings.branding = structuredClone(EMPTY_DB.settings.branding);
  } else {
    for (const k of Object.keys(EMPTY_DB.settings.branding)) {
      if (db.settings.branding[k] === undefined) {
        db.settings.branding[k] = EMPTY_DB.settings.branding[k];
      }
    }
  }
  if (!db.seq.field) db.seq.field = 8;
  if (!db.seq.banner) db.seq.banner = 4;

  // ---- Inventory migration ----
  if (!db.stockMovements) db.stockMovements = [];
  if (!db.seq.movement) db.seq.movement = 0;
  if (!db.purchases) db.purchases = [];
  if (!db.seq.purchase) db.seq.purchase = 0;
  if (!db.seq.payment) db.seq.payment = 0;

  const catSlugById = Object.fromEntries((db.categories || []).map((c) => [c.id, c.slug]));
  for (const p of db.products) {
    const slug = (catSlugById[p.categoryId] || "gen")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!p.sku) p.sku = `NN-${slug || "GEN"}-${String(p.id).padStart(4, "0")}`;
    if (p.reorderLevel === undefined) p.reorderLevel = 10;
    if (p.location === undefined) p.location = "Main Store";
    if (p.stock === undefined) p.stock = 0;
    if (p.unit === undefined) p.unit = "Pcs";
    if (p.costPrice === undefined || (p.costPrice === 0 && (p.price || 0) > 0)) {
      p.costPrice = Math.round((p.price || 0) * 0.62);
    }
  }

  const hasInitial = db.stockMovements.some((m) => m.type === "initial");
  if (!hasInitial && db.products.length > 0) {
    for (const p of db.products) {
      db.seq.movement += 1;
      db.stockMovements.push({
        id: db.seq.movement,
        productId: p.id,
        productName: p.name,
        type: "initial",
        quantity: p.stock,
        note: "Opening stock",
        user: "system",
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Backfill unitCost snapshots on existing orders for profit calculation
  for (const o of db.orders || []) {
    for (const it of o.items || []) {
      if (it.unitCost === undefined) {
        const prod = db.products.find((p) => p.id === it.productId);
        it.unitCost = prod ? prod.costPrice || 0 : 0;
      }
    }
  }

  return db;
}

function persist() {
  ensureFile();
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function getDb() {
  if (!db) loadDb();
  return db;
}

export function saveDb() {
  persist();
}

export function nextId(collection) {
  db.seq[collection] = (db.seq[collection] || 0) + 1;
  return db.seq[collection];
}

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    address: u.address,
    createdAt: u.createdAt,
  };
}

export function signToken(payload, secret, expiresIn = "7d") {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}
