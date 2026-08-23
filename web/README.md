# NovaNest 🛍️

Nepal's one-stop online marketplace. Sell and buy **food, groceries, clothes, cooked food, cosmetics, and used electronics** — all prices in **Rs. (Nepalese Rupees)**.

A full-stack web application with a customer storefront, cart, checkout, and a complete admin panel.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5 + React Router |
| Backend | Node.js + Express |
| Database | JSON-file store (`backend/data/novanest.json`) |
| Auth | JWT + bcrypt password hashing |

## Features

### Customer
- Browse products by 6 categories: Food, Groceries, Clothes, Cooked Food, Cosmetics, Used Electronics
- Search, sort (price/rating/newest) and category filtering
- Product detail pages with related products
- Add to cart with quantity control and stock validation
- Free delivery over Rs. 2,000
- Dynamic checkout delivery form driven by admin configuration (which fields show, which are mandatory)
- **Guest checkout** — order without an account; guests pay via Cash on Delivery or Bank Transfer (eSewa/Khalti require login)
- **Coupon / discount codes** — apply a code at checkout for a percentage or fixed discount, validated server-side against minimums, limits and dates
- Checkout with delivery details + payment method (COD, eSewa, Khalti, Bank Transfer)
- Order history with order status tracking
- **Cancel orders yourself** (pending/confirmed) — stock is restored automatically and paid orders are marked refunded
- **Verified product reviews** — customers who purchased a product can rate it 1–5 stars, write a review, and upload up to 5 photos. Reviews show a **✓ Verified Purchase** badge (only when the buyer actually purchased it), and the author can edit or delete their own review. Reviews go through an **approval workflow** in the admin panel (approve / reject / hide / feature / delete), and only approved reviews count toward the product rating. Products with **no approved reviews show no rating at all** by default (no fake pre-set stars); admins can enable the pre-set rating fallback later from Admin → Reviews.
- **Multiple product images** with a thumbnail gallery on the product page
- Signup / login with email & password
- **Forgot password & reset** — visitors request a reset for their email; the reset link is **emailed** (SMTP, or logged to the server console in dev) and expires after 1 hour. The response never reveals whether an account exists.

### Admin (role-based)
- Dashboard with revenue, orders, customers, low-stock alerts
- 7-day revenue chart + revenue-by-category chart
- Top selling products & recent orders
- Full CRUD for products and categories
- **Product image upload** (JPG/PNG/WebP/GIF up to 5MB, stored under `backend/uploads/` and served at `/uploads/...`) — multiple images per product with a main thumbnail
- Order management (pending → confirmed → shipped → delivered / cancelled)
- **Coupon management**: create/edit/disable coupons with percentage or fixed discounts, minimum subtotal, max discount, per-user and total usage limits, and start/expiry dates
- **Stock intake (purchases)**: record incoming stock from suppliers with unit costs — stock is added automatically and product cost price updates
- **Supplier payment tracking**: every intake creates a payment obligation with a 35-day credit term. Statuses auto-classify as **Pending** (not yet due), **Due Soon** (≤5 days, with reminders), **Overdue** (past due) or **Paid**; record partial/full payments
- **Profit calculation**: gross profit from selling price − cost price, shown on the dashboard (revenue vs profit chart), a dedicated Profit page (by category, per product, margins) and inventory (potential profit)
- **User management**: add users, edit profile, change any user's password, delete users, and assign/demote admin roles (protected so you can't delete yourself, remove your own admin role, or delete the last admin)
- **Checkout delivery form settings**: add/remove custom fields, show/hide built-in fields, and mark any field mandatory or optional — the customer checkout form, backend validation, and order records all follow this configuration automatically
- **Hero banner slider management**: create unlimited banner slides with a live homepage slider. Per slide control text (badge, title, highlighted text, subtitle, button text/link), colors (gradient/solid/image background, text & button color), typography (font family, size, alignment), image upload, show/hide and drag-order reordering
- **Logo & name (branding)**: change the web app name, tagline, logo image (uploaded) or emoji icon from the admin panel. Updates the storefront header, footer, browser tab title, favicon and invoices instantly

## Getting Started

> All commands below are run from the `web/` folder (this project). If you
> cloned the repo, first `cd web`.

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the environment

Create `backend/.env` from the example (required — the server refuses to start without it):

```bash
cp backend/.env.example backend/.env
openssl rand -hex 32   # generate a secret
# then edit backend/.env and paste it into JWT_SECRET=
```

The `.env` file is gitignored, so it must be created on every fresh deploy/server.

### 3. Configure payment gateways

Payments start in **test mode** out of the box (sandbox credentials included). When you're ready to go live, open **Admin → Payments** in the app and enter your merchant keys / switch off test mode. No restart needed. See [Payment Gateways](#payment-gateways) for details.

### 4. Start the app

```bash
# Production (recommended): builds the frontend and serves it from the Express
# server on http://localhost:3001 — no dev server involved.
./start.sh

# Local development with hot-reload (NOT for production traffic):
./start-dev.sh     # API on :3001, Vite dev server on :5173

# Or run separately
cd backend && npm run dev        # API on http://localhost:3001
cd frontend && npm run dev       # App on http://localhost:5173
```

In development, the Vite server proxies `/api` and `/uploads` to the backend on port 3001. In production, everything is served from the single Express origin on port 3001.

### 5. Demo accounts

No admin password is committed to this repository. The admin account is provisioned on a fresh database from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env` (see [Deployment notes](#deployment-notes)); if unset, a random password is generated and printed to the server console once.

| Role | Email | Password |
|------|-------|----------|
| Customer | `demo@novanest.com` | `demo123` |

### Mobile app (Android / iOS) with Capacitor

The storefront is also shipped as a native app (Android/iOS) via Capacitor. The
mobile app is a **separate project** in the `mobile/` folder at the repo root —
see `mobile/README.md` for build and release instructions. The short version:

```bash
# from the repo root
cd mobile && npm install
cd ../web/frontend && npm run build    # build the web app first (feeds the app)
cd ../../mobile && npx cap sync android
cd android && ./gradlew assembleDebug  # APK: mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Before releasing the app, point it at your real domain (see `mobile/README.md`):
set `VITE_API_URL=https://yourdomain.com/api` when building the web app, or edit
`NATIVE_API_BASE` in `web/frontend/src/api.js`.

Notes:

- The admin panel is browser-only (log in from a desktop web browser at `/admin`).
- All payments happen through the backend; no payment SDK is bundled into the app.

## Deployment

Ready-to-use deployment files are in the `deploy/` folder:

| File | Purpose |
|------|---------|
| `deploy/HOSTINGER-SHARED.md` | Step-by-step guide for Hostinger **shared hosting** (hPanel Node.js) |
| `deploy/VPS.md` | Guide for Hostinger **VPS/Cloud** or any Linux server |
| `deploy/setup-vps.sh` | One-shot auto-setup on a fresh Ubuntu/Debian VPS |
| `deploy/Dockerfile` | Multi-stage production image |
| `deploy/docker-compose.yml` | Compose setup with a persistent data volume |
| `deploy/nginx.conf` | Reverse proxy + SSL-ready site config |
| `deploy/novanest.service` | systemd unit |
| `deploy/ecosystem.config.js` | PM2 process config |
| `deploy/htaccess-backend.txt` | `.htaccess` fallback if the app must sit under `public_html` |

### Core requirements for any host

- **Node.js 18+** (22 recommended).
- **Persistent disk** — the database is a single JSON file at `backend/data/novanest.json` and product photos live under `backend/uploads/`. A VPS, Docker volume, or shared hosting all qualify; ephemeral/serverless filesystems (Vercel functions, Heroku default) do **not**.
 - **`backend/.env`** — required; the server refuses to start if `JWT_SECRET` is missing **or left at the placeholder value** (`change-me-to-a-long-random-hex-string`). Create it with `cp backend/.env.example backend/.env` and set `JWT_SECRET` from `openssl rand -hex 32`. The server loads it automatically, so hosts like Hostinger that run `node server.js` with no flags work out of the box.
 - **First-run admin** — provisioned from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; if unset, a random password is generated and printed to the console once. No default admin password exists in the codebase.
 - **Production build** — `./start.sh` (or `cd frontend && npm run build`) then serve everything from the Express server on port 3001. Never serve via the Vite dev server.
 - **Forgot/rotate the admin password?** — stop the server, then run `ADMIN_PASSWORD='Strong-New-Pass!' node backend/reset-admin.js` (in `backend/`) and restart. It rotates the existing admin's password (or creates one if none exists) and never relies on a default. Do **not** hand-edit `backend/data/novanest.json` to reset credentials — the running server keeps the DB in memory and will overwrite such edits.

### Docker quick start

```bash
cp backend/.env.example backend/.env   # then edit JWT_SECRET, ADMIN_*, payment keys
docker compose -f deploy/docker-compose.yml up -d --build
```

### Bare-metal quick start

```bash
bash deploy/setup-vps.sh <your-repo-git-url> your-domain.com
```

For container deployments, mount a persistent volume and point the app at it via environment variables (see `backend/.env.example`):

```bash
# docker-compose / podman example
environment:
  DATA_DIR: /data
  UPLOAD_DIR: /data/uploads
  JWT_SECRET: "${JWT_SECRET}"   # required; also PORT (default 3001)
  ADMIN_EMAIL: "${ADMIN_EMAIL}"   # initial admin on empty DB
  ADMIN_PASSWORD: "${ADMIN_PASSWORD}"   # strong, unique; never a documented default
volumes:
  - novanest-data:/data
```

## Payment Gateways

NovaNest supports **eSewa** and **Khalti** for online payments, plus Cash on Delivery and Bank Transfer. Gateway settings are fully managed from the **admin control panel → Payments** (no code or restart required). There you can:

- Enable / disable each gateway
- Switch between **Test (sandbox)** and **Live** mode
- Enter your merchant **product code** (eSewa) and **secret keys**
- See the exact API endpoints that are currently active

Settings are stored in the database and take effect immediately. The `backend/.env` variables below act only as a fallback if the panel values are empty.

| Variable | Purpose |
|----------|---------|
| `ESEWA_TEST_MODE` | `true` for sandbox, `false` for live (fallback only) |
| `ESEWA_PRODUCT_CODE` | eSewa merchant product code (fallback only) |
| `ESEWA_SECRET_KEY` | eSewa merchant secret key (fallback only) |
| `KHALTI_TEST_MODE` | `true` for sandbox, `false` for live (fallback only) |
| `KHALTI_SECRET_KEY` | Khalti secret key (fallback only) |

### How it works

1. At checkout, the customer picks **eSewa** or **Khalti** and places the order. The order is created with `paymentStatus = pending`.
2. The frontend asks the backend to initiate payment:
   - **eSewa** returns the merchant-signed form parameters; the browser auto-submits the form to eSewa.
   - **Khalti** returns a `payment_url`; the browser redirects to the Khalti payment page.
3. After the customer pays, the gateway redirects back to `/payment/result?provider=...`.
4. The result page calls the backend verify endpoint, which **re-verifies with the gateway server-side** (eSewa transaction status API / Khalti lookup API) before marking the order `paid`.

> For eSewa sandbox payments use test IDs `9711111111`–`9711111114` (password `Nepal@123`, OTP `123456`). For Khalti sandbox use IDs `9800000000`–`9800000005` (MPIN `1111`, OTP `987654`). Khalti test keys come from https://test-admin.khalti.com.

### Security & configuration

Required environment variables (in `backend/.env`, see `backend/.env.example`):

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | **Required.** JWT signing secret (generate with `openssl rand -hex 32`). The server refuses to start without it. |
| `SMTP_HOST` | SMTP server for outbound email. When empty, password-reset links are logged to the server console (dev fallback) instead of being emailed. |
| `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | SMTP credentials (port `465` uses TLS, otherwise STARTTLS). |
| `MAIL_FROM` | From-address used on outgoing mail. |
| `APP_URL` | Public base URL used in emailed password-reset links. |

Security features built in:

- **Helmet** security headers (CSP, HSTS, X-Frame-Options, nosniff, etc.).
- **Rate limiting** on `/api/auth/signup`, `/api/auth/login`, and `/api/auth/forgot-password` (per IP, 15-minute window) to blunt brute-force attacks.
- **Password reset is emailed**, never returned in the API response. The reset link is delivered by SMTP (or logged to the server console in development).
- **No account enumeration**: `/api/auth/forgot-password` always returns the same generic message whether or not the email exists.
- **Server-authoritative checkout**: coupon discounts are recomputed on the server (never trusted from the client), and guests are blocked server-side from paying with eSewa/Khalti.
- Passwords are hashed with bcrypt (via `bcryptjs`).

### Backend API

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/payments/config` | public | Enabled providers + test mode (drives checkout options) |
| POST | `/api/payments/esewa/initiate` | customer | Sign eSewa form fields for an order |
| POST | `/api/payments/esewa/verify` | customer | Verify an eSewa transaction and mark order paid |
| POST | `/api/payments/khalti/initiate` | customer | Create a Khalti payment and get `payment_url` |
| POST | `/api/payments/khalti/verify` | customer | Lookup a Khalti payment and mark order paid |

## Project Structure

The **web app** lives in the `web/` folder of the repo (this README). The
**mobile app** is a separate project in the repo's `mobile/` folder.

```text
web/                       # the web app project
  start.sh                 production start: builds frontend + runs Express on :3001
  start-dev.sh             dev start: API on :3001 + Vite dev server on :5173
  .dockerignore            Docker build context exclusions
  deploy/                  deployment configs (Docker, nginx, systemd, pm2, guides)
  backend/
    server.js          Express app entry
    db.js              JSON-file database layer (atomic writes)
    seed.js            Seeds 2 users, 6 categories, 36 products
    middleware.js      JWT auth + admin guard
    coupons.js         Coupon resolution + application logic
    payments.js        eSewa/Khalti config + signature & API helpers
    mailer.js          SMTP emailer (dev console fallback)
    routes/
      auth.js          signup / login / me / password reset
      products.js      public catalog + reviews
      categories.js    public categories
      cart.js          customer cart
      orders.js        customer checkout + orders + cancellation
      coupons.js       active coupons + validation
      payments.js      eSewa/Khalti initiate + verify
      admin.js         admin stats + product/category/order/user/coupon management
  frontend/
    vite.config.js     dev server + /api reverse proxy + allowedHosts
    src/
      api.js           API client + Rs. price formatting
      context/         Auth & Cart state
      components/      Header, Footer, ProductCard, Toast, RequireAuth
      pages/           Home, Shop, ProductDetail, Cart, Checkout, Login, Signup, Orders,
                       PaymentResult
      admin/           AdminLayout, Dashboard, Products, Categories, Orders, Users,
                       Coupons, Inventory, Purchases (stock intake), SupplierPayments, Profit
```

The `mobile/` project at the repo root wraps this web app with Capacitor
(Android/iOS). It builds from `frontend/dist` and talks to the backend over
HTTPS — see `mobile/README.md`.

## API Overview

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/signup` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/forgot-password` | public |
| POST | `/api/auth/reset-password` | public |
| POST | `/api/auth/change-password` | any logged-in user (self-service, verifies current password) |
| GET | `/api/products` | public |
| GET | `/api/categories` | public |
| GET | `/api/cart` | customer or guest |
| POST | `/api/cart/add` | customer or guest |
| GET | `/api/settings/checkout-fields` | public (checkout form config) |
| GET | `/api/settings/hero-banners` | public (homepage slider) |
| GET | `/api/settings/branding` | public (app name, tagline, logo, icon) |
| POST | `/api/orders/checkout` | customer or guest (guests: COD / Bank Transfer only) |
| GET | `/api/orders` | customer or guest |
| POST | `/api/orders/:id/cancel` | customer or guest (self-service; restores stock) |
| GET | `/api/coupons/active` | public (active coupon codes) |
| POST | `/api/coupons/validate` | customer or guest (non-consuming check) |
| GET/POST | `/api/products/:id/reviews` | customer or guest (must have purchased the product; review starts as `pending`, supports up to 5 image uploads) |
| PUT/DELETE | `/api/reviews/:id` | review author (edit goes back to `pending`; delete removes the review + photos) |
| GET | `/api/payments/config` | public |
| POST | `/api/payments/esewa/initiate`, `/api/payments/esewa/verify` | customer |
| POST | `/api/payments/khalti/initiate`, `/api/payments/khalti/verify` | customer |
| GET | `/api/admin/stats` | admin |
| POST | `/api/admin/upload` | admin (multipart `image` + optional `folder=products|banners|logo`) |
| CRUD | `/api/admin/products`, `/api/admin/categories` | admin (products support multiple `images`) |
| CRUD | `/api/admin/coupons` | admin (create/edit/disable coupons) |
| GET/PATCH/DELETE | `/api/admin/reviews` | admin (approve / reject / hide / feature / delete reviews) |
| POST | `/api/admin/reviews/bulk` | admin (activate / hide / reject / delete many reviews at once: `{ ids, action }`) |
| GET/PUT | `/api/admin/settings/reviews` | admin (toggle pre-set rating fallback for products with no reviews) |
| GET/POST/PUT/DELETE | `/api/admin/users` | admin |
| PUT | `/api/admin/users/:id/password` | admin (change password) |
| CRUD | `/api/admin/settings/checkout-fields` | admin (+ `POST .../reset`) |
| CRUD | `/api/admin/settings/hero-banners` | admin (+ `POST .../reorder`) |
| GET/PUT | `/api/admin/settings/branding` | admin (logo & name) |
| GET/PUT | `/api/admin/settings/payments` | admin (eSewa/Khalti gateway config) |
| GET/PUT | `/api/admin/orders` | admin |
| GET/POST/PUT/DELETE | `/api/admin/purchases` | admin (stock intake) |
| POST | `/api/admin/purchases/:id/payments` | admin (record supplier payment) |
| GET | `/api/admin/purchases/summary` | admin (supplier payment tracking) |
