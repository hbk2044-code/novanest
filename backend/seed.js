import { getDb, saveDb, nextId, hashPassword } from "./db.js";

export function seedDatabase() {
  const db = getDb();

  if (db.users.length === 0) {
    db.users.push({
      id: nextId("user"),
      name: "NovaNest Admin",
      email: "admin@novanest.com",
      password: hashPassword("admin123"),
      role: "admin",
      phone: "9800000000",
      address: "Kathmandu, Nepal",
      createdAt: new Date().toISOString(),
    });
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
    for (const p of products) {
      const slug = (catSlugById[p.categoryId] || "gen")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      p.sku = `NN-${slug || "GEN"}-${String(p.id).padStart(4, "0")}`;
      db.products.push(p);
    }
  }

  saveDb();
  console.log("[NovaNest] Database seeded successfully.");
}
