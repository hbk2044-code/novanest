import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
const REVIEW_DIR = path.join(UPLOAD_ROOT, "reviews");

const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
    cb(null, REVIEW_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safeExt = ALLOWED_EXT.includes(ext) ? ext : ".jpg";
    cb(null, `rv-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

export const reviewUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return cb(new Error("Only jpg, jpeg, png, webp, gif images are allowed"));
    }
    cb(null, true);
  },
});

export function reviewImageUrl(file) {
  return `/uploads/reviews/${file.filename}`;
}

export function removeReviewImage(url) {
  if (!url || !url.startsWith("/uploads/reviews/")) return;
  const filePath = path.join(REVIEW_DIR, url.replace(/^\/uploads\/reviews\//, ""));
  fs.promises.unlink(filePath).catch(() => {});
}
