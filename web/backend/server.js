import "./env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDb } from "./db.js";
import { seedDatabase } from "./seed.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import categoryRoutes from "./routes/categories.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import settingsRoutes from "./routes/settings.js";
import paymentRoutes from "./routes/payments.js";
import couponRoutes from "./routes/coupons.js";
import reviewRoutes from "./routes/reviews.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Override uploads location to a persistent volume in container deployments.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");

const SECRET = process.env.JWT_SECRET;
if (!SECRET || SECRET === "change-me-to-a-long-random-hex-string") {
  throw new Error(
    "JWT_SECRET is missing or still the placeholder. Create backend/.env from backend/.env.example and set JWT_SECRET to a random value (openssl rand -hex 32)."
  );
}

loadDb();
seedDatabase();

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(UPLOAD_DIR)));

const DIST_DIR = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "NovaNest API", time: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({
    name: "NovaNest API",
    endpoints: {
      auth: ["POST /api/auth/signup", "POST /api/auth/login", "GET /api/auth/me"],
      shop: ["GET /api/products", "GET /api/products/:id", "GET /api/categories"],
      customer: ["GET /api/cart", "POST /api/cart/add", "GET /api/orders", "POST /api/orders/checkout"],
      admin: ["GET /api/admin/stats", "GET/POST/PUT/DELETE /api/admin/*"],
    },
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewRoutes);

app.use((req, res) => {
  const distIndex = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(distIndex) && req.method === "GET" && !req.originalUrl.startsWith("/api")) {
    return res.sendFile(distIndex);
  }
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error("[NovaNest] Error:", err.message);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[NovaNest] API server running on http://localhost:${PORT}`);
});
