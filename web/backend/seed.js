import { getDb, saveDb, nextId, hashPassword } from "./db.js";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORY_COLORS = {
  food: "#f97316",
  groceries: "#22c55e",
  clothes: "#3b82f6",
  "cooked-food": "#ef4444",
  cosmetics: "#ec4899",
  "used-electronics": "#8b5cf6",
};

// Generates a local SVG placeholder image for seeded demo products so the
// catalog looks populated out of the box (no external image service needed).
// Files are written to <UPLOAD_DIR>/placeholders and referenced via /uploads.
function placeholderImage(product, index, categorySlug) {
  const uploadsDir =
    process.env.UPLOAD_DIR ||
    path.join(path.dirname(fileURLToPath(import.meta.url)), "uploads");
  const dir = path.join(uploadsDir, "placeholders");
  fs.mkdirSync(dir, { recursive: true });
  const file = `${categorySlug || "gen"}-${String(index).padStart(3, "0")}.svg`;
  const url = `/uploads/placeholders/${file}`;
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    const name = String(product.name || "Product")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const color = CATEGORY_COLORS[categorySlug] || "#64748b";
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">` +
      `<rect width="600" height="600" fill="${color}"/>` +
      `<text x="50%" y="45%" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="#ffffff" text-anchor="middle">${name}</text>` +
      `<text x="50%" y="55%" font-family="Arial, sans-serif" font-size="26" fill="rgba(255,255,255,0.75)" text-anchor="middle">NovaNest</text>` +
      `</svg>`;
    fs.writeFileSync(filePath, svg);
  }
  return url;
}

export function seedDatabase() {
  const db = getDb();

  if (db.users.length === 0) {
    // Admin is provisioned from environment variables. If ADMIN_PASSWORD is not
    // set we generate a random one and print it ONCE to the console so there is
    // never a publicly-known default admin password committed to the repo.
    const adminEmail = process.env.ADMIN_EMAIL || "admin@novanest.com";
    const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString("hex");
    db.users.push({
      id: nextId("user"),
      name: "NovaNest Admin",
      email: adminEmail,
      password: hashPassword(adminPassword),
      role: "admin",
      phone: "9800000000",
      address: "Kathmandu, Nepal",
      createdAt: new Date().toISOString(),
    });
    if (!process.env.ADMIN_PASSWORD) {
      console.log(
        `[NovaNest] Seeded admin account: ${adminEmail} / ${adminPassword} ` +
          "(random, shown once). Set ADMIN_EMAIL/ADMIN_PASSWORD in backend/.env to control it."
      );
    }
    db.users.push({
      id: nextId("user"),
      name: "Demo Customer",
      email: "demo@novanest.com",
      password: hashPassword("demo123"),
      role: "customer",
      phone: "9811111111",
      address: "Pokhara, Nepal",
      createdAt: new Date().toISOString(),
    });
  }

  if (db.categories.length === 0) {
    const cats = [
      { name: "Food", slug: "food", icon: "🍜", color: "#f97316" },
      { name: "Groceries", slug: "groceries", icon: "🛒", color: "#22c55e" },
      { name: "Clothes", slug: "clothes", icon: "👕", color: "#3b82f6" },
      { name: "Cooked Food", slug: "cooked-food", icon: "🍛", color: "#ef4444" },
      { name: "Cosmetics", slug: "cosmetics", icon: "💄", color: "#ec4899" },
      { name: "Used Electronics", slug: "used-electronics", icon: "📱", color: "#8b5cf6" },
    ];
    for (const c of cats) {
      db.categories.push({
        id: nextId("category"),
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        color: c.color,
        description: `${c.name} collection at NovaNest`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (db.products.length === 0) {
    const catBySlug = Object.fromEntries(db.categories.map((c) => [c.slug, c.id]));
    const P = (catSlug, name, price, oldPrice, stock, rating, desc, featured) => ({
      id: nextId("product"),
      categoryId: catBySlug[catSlug],
      name,
      description: desc,
      price,
      oldPrice,
      costPrice: Math.round(price * 0.62),
      stock,
      rating,
      sold: Math.floor(Math.random() * 400) + 20,
      featured: featured !== false,
      createdAt: new Date().toISOString(),
    });

    const products = [
      // Food
      P("food", "Momo (Chicken)", 180, 220, 120, 4.8, "Juicy Nepali-style steamed chicken momos served with achar.", true),
      P("food", "Pizza Margherita", 550, 650, 45, 4.6, "Classic wood-fired margherita pizza with fresh basil.", true),
      P("food", "Burger Deluxe", 350, 400, 80, 4.5, "Beef burger with cheddar, lettuce, tomato and special sauce."),
      P("food", "Cold Coffee", 250, 300, 90, 4.4, "Refreshing iced coffee topped with whipped cream."),
      P("food", "French Fries", 150, 180, 150, 4.3, "Crispy golden french fries with dipping sauce."),
      P("food", "Chowmein", 200, 240, 110, 4.5, "Wok-tossed noodles with vegetables and choice of protein.", true),
      // Groceries
      P("groceries", "Basmati Rice (5kg)", 950, 1100, 60, 4.7, "Premium aged basmati rice, 5kg bag.", true),
      P("groceries", "Cooking Oil (1L)", 320, 380, 200, 4.5, "Refined sunflower cooking oil, 1 litre."),
      P("groceries", "Chicken (1kg)", 420, 480, 100, 4.6, "Fresh farm chicken, cleaned and cut."),
      P("groceries", "Eggs (12 pcs)", 200, 230, 150, 4.7, "Fresh farm eggs, dozen pack."),
      P("groceries", "Fresh Vegetables Box", 500, 580, 70, 4.4, "Daily assortment of fresh seasonal vegetables."),
      P("groceries", "Sugar (1kg)", 120, 140, 250, 4.5, "Fine white sugar, 1kg pack."),
      P("groceries", "Milk (1L)", 110, 130, 180, 4.6, "Fresh full-cream milk, 1 litre."),
      // Clothes
      P("clothes", "Cotton T-Shirt", 650, 800, 75, 4.5, "Soft cotton unisex t-shirt, multiple sizes.", true),
      P("clothes", "Denim Jeans", 1800, 2200, 40, 4.6, "Classic blue denim jeans for men."),
      P("clothes", "Kurta Set", 2500, 3000, 30, 4.7, "Traditional Nepali cotton kurta set.", true),
      P("clothes", "Sneakers", 3200, 3800, 25, 4.4, "Comfortable running sneakers, all sizes."),
      P("clothes", "Woolen Sweater", 1500, 1900, 50, 4.6, "Warm knitted woolen sweater for winter."),
      P("clothes", "Saree", 4500, 5500, 15, 4.8, "Elegant silk saree with embroidered border.", true),
      // Cooked Food
      P("cooked-food", "Dal Bhat Set", 350, 420, 60, 4.8, "Traditional Nepali dal bhat with curry, pickles and rice.", true),
      P("cooked-food", "Thakali Set", 500, 600, 40, 4.9, "Authentic Thakali thali with multiple curries.", true),
      P("cooked-food", "Chicken Curry", 450, 520, 55, 4.7, "Spicy home-style chicken curry with rice.", true),
      P("cooked-food", "Paneer Butter Masala", 420, 500, 45, 4.6, "Creamy paneer in rich tomato butter gravy."),
      P("cooked-food", "Veg Thali", 300, 360, 70, 4.5, "Wholesome vegetarian thali with dal, sabzi, roti and rice.", true),
      // Cosmetics
      P("cosmetics", "Rose Face Cream", 350, 420, 90, 4.5, "Moisturizing rose face cream for glowing skin.", true),
      P("cosmetics", "Herbal Face Pack", 250, 300, 110, 4.4, "Natural herbal face pack with neem and turmeric."),
      P("cosmetics", "Nail Polish Set", 450, 520, 65, 4.3, "Set of 6 vibrant nail polish shades."),
      P("cosmetics", "Shampoo (400ml)", 380, 450, 130, 4.5, "Nourishing herbal shampoo with amla."),
      P("cosmetics", "Body Lotion", 300, 360, 95, 4.4, "Deep-moisture body lotion with shea butter."),
      P("cosmetics", "Lipstick", 280, 340, 85, 4.6, "Long-lasting matte lipstick, multiple shades.", true),
      // Used Electronics
      P("used-electronics", "Smartphone (Used)", 12000, 15000, 12, 4.2, "Used smartphone, 128GB, good condition, 6 months warranty.", true),
      P("used-electronics", "Laptop (Used)", 35000, 42000, 8, 4.3, "Used business laptop, i5, 8GB RAM, 256GB SSD.", true),
      P("used-electronics", "Headphones (Used)", 1800, 2500, 20, 4.1, "Used over-ear headphones, fully functional."),
      P("used-electronics", "Smart Watch (Used)", 4500, 6000, 10, 4.0, "Used smart watch with fitness tracking."),
      P("used-electronics", "Bluetooth Speaker", 3200, 4000, 14, 4.2, "Portable bluetooth speaker, great sound quality.", true),
      P("used-electronics", "LED Monitor 22\"", 8000, 10000, 6, 4.3, "Used 22 inch LED monitor, no dead pixels."),
    ];
    const catSlugById = Object.fromEntries(db.categories.map((c) => [c.id, c.slug]));
    products.forEach((p, i) => {
      const slug = (catSlugById[p.categoryId] || "gen")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      p.sku = `NN-${slug || "GEN"}-${String(p.id).padStart(4, "0")}`;
      p.image = placeholderImage(p, p.id, catSlugById[p.categoryId]);
      db.products.push(p);
    });
  }

  if (db.coupons.length === 0) {
    const C = (code, description, type, value, minSubtotal, maxDiscount, totalLimit) => ({
      id: nextId("coupon"),
      code,
      description,
      type,
      value,
      minSubtotal,
      maxDiscount,
      perUserLimit: 1,
      totalLimit,
      usedCount: 0,
      redemptions: [],
      active: true,
      startDate: null,
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    db.coupons.push(
      C("WELCOME10", "10% off your first order", "percent", 10, 500, null, 1000),
      C("SAVE20", "20% off (max Rs. 300)", "percent", 20, 1000, 300, 500),
      C("FIXED100", "Rs. 100 off any order", "fixed", 100, 800, null, 1000)
    );
  }

  if (db.reviews.length === 0 && db.products.length > 0) {
    const demoOwner = "user:2";
    const guest = () => `guest:${crypto.randomUUID()}`;
    const R = (productId, owner, name, rating, comment) => ({
      id: nextId("review"),
      productId,
      owner,
      name,
      rating,
      comment,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000).toISOString(),
    });
    db.reviews.push(
      R(1, demoOwner, "Demo Customer", 5, "Fresh and juicy momos, delivered hot. Achar was perfect."),
      R(1, guest(), "Sujan K.", 5, "Best momos in the city so far."),
      R(1, guest(), "Pragya", 4, "Tasty but a little less spicy than I expected."),
      R(2, demoOwner, "Demo Customer", 4, "Cheesy and fresh, arrived warm."),
      R(2, guest(), "Ramesh", 5, "Wood-fired taste at home. Loved it."),
      R(3, guest(), "Anita", 4, "Juicy burger, decent portion size."),
      R(6, guest(), "Bibek", 5, "Great chowmein, generous veggies."),
      R(7, demoOwner, "Demo Customer", 5, "Premium rice, cooks perfectly."),
      R(15, guest(), "Sita", 4, "Soft cotton tee, fits well."),
      R(22, guest(), "Hari", 5, "Authentic dal bhat taste. Highly recommended."),
      R(26, guest(), "Meera", 4, "Nice cream, skin feels soft."),
      R(24, guest(), "Kabita", 5, "Saree is gorgeous, stitching is neat.")
    );
  }

  // Idempotent: fill in placeholder images for any product that lacks one
  // (e.g. a database carried over from before image seeding existed). Runs on
  // every start so images always appear even if the data directory persists.
  const catSlugByIdAll = Object.fromEntries(db.categories.map((c) => [c.id, c.slug]));
  const productsNeedingImage = db.products.filter(
    (p) => !p.image && !(Array.isArray(p.images) && p.images.length)
  );
  for (const p of productsNeedingImage) {
    p.image = placeholderImage(p, p.id, catSlugByIdAll[p.categoryId]);
  }

  saveDb();
  console.log("[NovaNest] Database seeded successfully.");
}
