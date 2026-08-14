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
- Checkout with delivery details + payment method (COD, eSewa, Khalti, Bank Transfer)
- Order history with order status tracking
- Signup / login with email & password
- **Forgot password & reset** — visitors request a reset code for their email, then reset the password (code expires after 1 hour and is single-use)

### Admin (role-based)
- Dashboard with revenue, orders, customers, low-stock alerts
- 7-day revenue chart + revenue-by-category chart
- Top selling products & recent orders
- Full CRUD for products and categories
- **Product image upload** (JPG/PNG/WebP/GIF up to 5MB, stored under `backend/uploads/` and served at `/uploads/...`)
- Order management (pending → confirmed → shipped → delivered / cancelled)
- **Stock intake (purchases)**: record incoming stock from suppliers with unit costs — stock is added automatically and product cost price updates
- **Supplier payment tracking**: every intake creates a payment obligation with a 35-day credit term. Statuses auto-classify as **Pending** (not yet due), **Due Soon** (≤5 days, with reminders), **Overdue** (past due) or **Paid**; record partial/full payments
- **Profit calculation**: gross profit from selling price − cost price, shown on the dashboard (revenue vs profit chart), a dedicated Profit page (by category, per product, margins) and inventory (potential profit)
- **User management**: add users, edit profile, change any user's password, delete users, and assign/demote admin roles (protected so you can't delete yourself, remove your own admin role, or delete the last admin)
- **Checkout delivery form settings**: add/remove custom fields, show/hide built-in fields, and mark any field mandatory or optional — the customer checkout form, backend validation, and order records all follow this configuration automatically
- **Hero banner slider management**: create unlimited banner slides with a live homepage slider. Per slide control text (badge, title, highlighted text, subtitle, button text/link), colors (gradient/solid/image background, text & button color), typography (font family, size, alignment), image upload, show/hide and drag-order reordering
- **Logo & name (branding)**: change the web app name, tagline, logo image (uploaded) or emoji icon from the admin panel. Updates the storefront header, footer, browser tab title, favicon and invoices instantly

## Getting Started

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start both services

```bash
# Option A: use the startup script (recommended)
./start.sh

# Option B: run separately
cd backend && npm run dev        # API on http://localhost:3001
cd frontend && npm run dev       # App on http://localhost:5173
```

The frontend dev server proxies `/api` requests to the backend on port 3001.

### 3. Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@novanest.com` | `admin123` |
| Customer | `demo@novanest.com` | `demo123` |

## Project Structure

```text
backend/
  server.js          Express app entry
  db.js              JSON-file database layer (atomic writes)
  seed.js            Seeds 2 users, 6 categories, 36 products
  middleware.js      JWT auth + admin guard
  routes/
    auth.js          signup / login / me
    products.js      public catalog
    categories.js    public categories
    cart.js          customer cart
    orders.js        customer checkout + orders
    admin.js         admin stats + product/category/order/user management
frontend/
  vite.config.js     dev server + /api reverse proxy + allowedHosts
  src/
    api.js           API client + Rs. price formatting
    context/         Auth & Cart state
    components/      Header, Footer, ProductCard, Toast, RequireAuth
    pages/           Home, Shop, ProductDetail, Cart, Checkout, Login, Signup, Orders
    admin/           AdminLayout, Dashboard, Products, Categories, Orders, Users,
                     Inventory, Purchases (stock intake), SupplierPayments, Profit
```

## API Overview

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/signup` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/forgot-password` | public |
| POST | `/api/auth/reset-password` | public |
| GET | `/api/products` | public |
| GET | `/api/categories` | public |
| GET | `/api/cart` | customer |
| POST | `/api/cart/add` | customer |
| GET | `/api/settings/checkout-fields` | public (checkout form config) |
| GET | `/api/settings/hero-banners` | public (homepage slider) |
| GET | `/api/settings/branding` | public (app name, tagline, logo, icon) |
| POST | `/api/orders/checkout` | customer |
| GET | `/api/orders` | customer |
| GET | `/api/admin/stats` | admin |
| POST | `/api/admin/upload` | admin (multipart `image` + optional `folder=products|banners|logo`) |
| CRUD | `/api/admin/products`, `/api/admin/categories` | admin |
| GET/POST/PUT/DELETE | `/api/admin/users` | admin |
| PUT | `/api/admin/users/:id/password` | admin (change password) |
| CRUD | `/api/admin/settings/checkout-fields` | admin (+ `POST .../reset`) |
| CRUD | `/api/admin/settings/hero-banners` | admin (+ `POST .../reorder`) |
| GET/PUT | `/api/admin/settings/branding` | admin (logo & name) |
| GET/PUT | `/api/admin/orders` | admin |
| GET/POST/PUT/DELETE | `/api/admin/purchases` | admin (stock intake) |
| POST | `/api/admin/purchases/:id/payments` | admin (record supplier payment) |
| GET | `/api/admin/purchases/summary` | admin (supplier payment tracking) |
