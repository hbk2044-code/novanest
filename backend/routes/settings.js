import { Router } from "express";
import { getDb } from "../db.js";
import { NEPAL_PROVINCES } from "../nepal.js";

const router = Router();

router.get("/branding", (req, res) => {
  const db = getDb();
  res.json({ branding: db.settings.branding });
});

router.get("/checkout-fields", (req, res) => {
  const db = getDb();
  const fields = db.settings.checkoutFields
    .filter((f) => f.active)
    .sort((a, b) => a.id - b.id)
    .map((f) => ({
      id: f.id,
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      placeholder: f.placeholder || "",
    }));
  res.json({ fields });
});

router.get("/nepal-address", (req, res) => {
  res.json({ provinces: NEPAL_PROVINCES });
});

router.get("/hero-banners", (req, res) => {
  const db = getDb();
  const banners = db.settings.heroBanners
    .filter((b) => b.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((b) => ({
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
    }));
  res.json({ banners });
});

export default router;
