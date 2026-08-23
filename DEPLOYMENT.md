# NovaNest — Deployment Guide

This is the master guide for deploying NovaNest anywhere. Two projects:

- **`web/`** — the web app (backend + storefront + admin panel), served from one
  Node.js process on port `3001`.
- **`mobile/`** — the native Android/iOS app wrapping the web app.

Pick the option that matches where you want to go live. All configs are in the
repo and ready to use.

---

## Web app deployment options

| Target | How | Files |
|--------|-----|-------|
| **Hostinger VPS / any Linux server** | One-shot script (recommended) | `web/deploy/setup-vps.sh`, guide: `web/deploy/VPS.md` |
| **Docker / docker-compose** | Build + run the container | `web/deploy/Dockerfile`, `web/deploy/docker-compose.yml` |
| **Hostinger shared hosting** | hPanel Node.js app | guide: `web/deploy/HOSTINGER-SHARED.md` |
| **Any Node host (manual)** | pm2 or systemd | `web/deploy/ecosystem.config.js`, `web/deploy/novanest.service` |

### Universal requirements (all web deployments)

1. **Node.js 18+** (22 recommended).
2. **Persistent disk** — the database is `web/backend/data/novanest.json` and
   photos live in `web/backend/uploads/`. Use a VPS/VM or Docker volume; plain
   serverless/ephemeral filesystems won't survive restarts.
3. **`web/backend/.env`** — required. Create it from
   `web/backend/.env.example` and set a real `JWT_SECRET` (`openssl rand -hex
   32`). The server refuses to start if `JWT_SECRET` is missing or left as
   `change-me-to-a-long-random-hex-string`.
4. **Build the frontend once** — `cd web/frontend && npm run build`. The Express
   server then serves both the API and the built app from the same origin. Never
   serve production traffic through the Vite dev server.

### Option A — Hostinger VPS / Linux server (recommended)

```bash
# on a fresh Ubuntu/Debian VPS
bash web/deploy/setup-vps.sh <your-repo-git-url> your-domain.com
```

Installs Node 22 + nginx + pm2, clones the repo to `/opt/novanest`, installs
deps, creates `.env`, builds the frontend, configures nginx, starts the app.
Then:

```bash
nano /opt/novanest/web/backend/.env     # set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, payment keys
pm2 restart novanest
sudo certbot --nginx -d your-domain.com # HTTPS
```

### Option B — Docker

```bash
cd web
cp backend/.env.example backend/.env    # edit JWT_SECRET, ADMIN_*, payment keys
docker compose -f deploy/docker-compose.yml up -d --build
```

Data is kept in the named volume `novanest-data` and survives rebuilds.

### Option C — Hostinger shared hosting

Follow `web/deploy/HOSTINGER-SHARED.md`: clone the repo, install deps in
`~/novanest/web`, create `backend/.env`, build the frontend, then register the
Node.js app in hPanel with **Application root = `novanest/web`** and **startup
file = `backend/server.js`**.

---

## Mobile app deployment

| Target | How | Guide |
|--------|-----|-------|
| **Android test APK** | `cd mobile && npm run build:android` | `mobile/README.md` |
| **Google Play Store** | signed release bundle | `mobile/README.md` → Release |
| **App Store (iOS)** | Xcode archive (needs a Mac) | `mobile/README.md` → iOS |

Always build the web app first (`cd web/frontend && npm run build`), point it at
your production API (`VITE_API_URL=https://yourdomain.com/api`), then
`cd mobile && npx cap sync android` and build.

---

## Keeping everything in sync (your update routine)

After any code change:

```bash
# 1. Web
cd web && git pull
cd frontend && npm run build
# restart: pm2 reload novanest   (or systemctl restart novanest / rebuild Docker)

# 2. Mobile (optional)
cd mobile && npx cap sync android
cd android && ./gradlew assembleDebug
```

---

## Post-deploy checklist

- [ ] `JWT_SECRET` is a random value (not the placeholder).
- [ ] `APP_URL` is set to your real domain (password-reset emails).
- [ ] eSewa / Khalti switched from test to **live** with your merchant keys
      (Admin → Payments).
- [ ] Admin can log in at `/admin`; change the provisioned password.
- [ ] HTTPS is enabled (certbot for nginx / panel-managed SSL).
- [ ] Uploads folder is writable by the app process.
- [ ] Mobile app points at the production API, not the preview URL.
