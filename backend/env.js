import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Loads backend/.env into process.env when the app is started as a plain
// `node server.js` (e.g. Hostinger hPanel Node.js apps), where you cannot pass
// the `--env-file` flag. Already-set environment variables always win.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(__dirname, ".env");

if (fs.existsSync(ENV_FILE)) {
  const content = fs.readFileSync(ENV_FILE, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
