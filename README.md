# NovaNest

Nepal's one-stop online marketplace — sell and buy **food, groceries, clothes,
cooked food, cosmetics, and used electronics**. All prices in **Rs. (Nepalese
Rupees)**, with a customer storefront, cart, checkout, payments (eSewa/Khalti),
reviews, coupons, and a full admin panel.

This repository contains **two separate, independently deployable projects**:

```
NovaNest/
├── web/        # Web app (backend API + React storefront + deployment configs)
└── mobile/     # Mobile app (Capacitor Android/iOS wrapper around the web app)
```

| Project | What it is | How to deploy |
|---------|-----------|---------------|
| `web/`  | Full-stack storefront + admin panel. Backend serves the built frontend on one port (`:3001`). | See `web/README.md` + `web/deploy/` (VPS, Docker, Hostinger shared hosting). |
| `mobile/` | Native Android app (and iOS-ready) that wraps the same web app in a WebView. | See `mobile/README.md` (build APK / release to Play Store). |

## Quick start

```bash
cd web
cp backend/.env.example backend/.env    # then set JWT_SECRET (openssl rand -hex 32)
./start.sh                              # builds frontend + runs app on http://localhost:3001
```

For local development with hot-reload: `cd web && ./start-dev.sh` (API on
`:3001`, Vite dev server on `:5173`).

## Deploying "wherever — whenever"

Everything is deploy-ready. Pick your target:

- **Hostinger VPS / any Linux server** → `web/deploy/VPS.md` (or one-shot `bash web/deploy/setup-vps.sh <git-url> <domain>`)
- **Docker / docker-compose** → `web/deploy/docker-compose.yml`
- **Hostinger shared hosting** (hPanel Node.js) → `web/deploy/HOSTINGER-SHARED.md`
- **Android app (APK / Play Store)** → `mobile/README.md`
- **iOS app** → `mobile/README.md` (requires a Mac with Xcode)

See `DEPLOYMENT.md` for the master deployment guide covering every option.

## Admin account

No admin password is committed. On a fresh database, the admin is provisioned
from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `web/backend/.env` (a random password
is printed to the console once if unset). Forgot it? Stop the server and run
`ADMIN_PASSWORD='New-Strong-Pass!' node reset-admin.js` inside `web/backend`.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Web frontend | React 18 + Vite 5 + React Router |
| Mobile | Capacitor 8 (Android/iOS WebView wrapper) |
| Backend | Node.js + Express |
| Database | JSON-file store (`web/backend/data/novanest.json`) |
| Auth | JWT + bcrypt password hashing |
