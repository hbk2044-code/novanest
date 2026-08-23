# Deploying NovaNest on Hostinger Shared Hosting

This guide is for **Hostinger shared (web) hosting** where you manage Node.js apps
from **hPanel → Advanced → Node.js**. Your server already has persistent disk,
so the JSON database and uploaded photos survive restarts — no extra work needed
for data.

> For a Hostinger **VPS / Cloud** instance, see `VPS.md` instead.

---

## 1. Important: application root must be outside `public_html`

Everything the app writes — `backend/data/novanest.json`, `backend/uploads/`, and
`backend/.env` — lives inside the app folder (i.e. under `novanest/web`). If that
folder is web-accessible, visitors could download your database and secrets.

In hPanel **Node.js**, set the **Application root** to a folder that is **not**
inside the web root, for example:

```
/home/<your-username>/novanest
```

The domain/subdomain you bind to the Node.js app is then proxied to your app by
Hostinger (static files in `public_html` are bypassed for that domain).

> Fallback: if your hosting plan forces the app under `public_html`, copy
> `deploy/htaccess-backend.txt` to `backend/.htaccess` inside the app as a
> second line of defense.

---

## 2. Get your code onto the server

In hPanel open **Advanced → Terminal** (or connect via SSH) and run:

```bash
cd ~
git clone <your-repo-url> novanest
cd novanest/web
cd backend && npm install
cd ../frontend && npm install
```

---

## 3. Create `backend/.env`

```bash
cd ~/novanest/web/backend
cp .env.example .env
nano .env
```

Set at minimum:

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | run `openssl rand -hex 32` and paste the result (**must not** stay as the placeholder `change-me-to-a-long-random-hex-string`; the server refuses to start with it) |
| `ADMIN_EMAIL` | your real admin email (used only on first run) |
| `ADMIN_PASSWORD` | a strong, unique password |
| `PORT` | the port you will set in the Node.js panel below |

Leave payment keys in sandbox mode until you have live merchant credentials.

> You can also set `DATA_DIR` / `UPLOAD_DIR` to absolute paths on another disk,
> but on shared hosting the defaults inside the app folder are fine.

> **Lost the admin password?** Stop the Node.js app in hPanel, then in
> `~/novanest/web/backend` run `ADMIN_PASSWORD='Strong-New-Pass!' node reset-admin.js`,
> and restart the app in hPanel. This rotates the existing admin account (or creates
> one if none exists). Never hand-edit `backend/data/novanest.json` to reset
> credentials — the running app holds the DB in memory and will overwrite the file
> on its next save.

---

## 4. Build the frontend (one-time and after every code update)

```bash
cd ~/novanest/web/frontend
npm run build
```

This creates `frontend/dist/`, which the Express server serves together with the
API — the frontend and backend are a single app on one port.

---

## 5. Register the Node.js app in hPanel

Go to **hPanel → Advanced → Node.js → Create Node.js app**:

1. **Node.js version**: select 22.x (or the newest available).
2. **Application root**: `novanest/web` (the folder you cloned into).
3. **Application startup file**: `backend/server.js`
   - The app loads `.env` itself and serves both the API and the built frontend,
     so no extra flags or a separate frontend process are needed.
4. **Port**: pick a free port (e.g. `3000`) and make sure `PORT=3000` matches in
   `backend/.env`.
5. Click **Create**.

Hostinger starts a persistent background process. If your panel exposes a
**domain/subdomain** field for the app, bind your real domain there.

---

## 6. Restart after changes

Any time you change `.env`, rebuild the frontend, or pull new code:

1. Rebuild the frontend (step 4).
2. In hPanel **Node.js**, click **Restart** on your app.

---

## 7. Going live

1. Change `ESEWA_TEST_MODE` / `KHALTI_TEST_MODE` to `false` and put your real
   merchant keys either in `backend/.env` or in the Admin → Payments panel.
2. Add an `APP_URL` in `backend/.env` equal to your domain (used in password
   reset emails).
3. Rebuild + restart (step 6).

---

## Troubleshooting

- **Blank page / 404**: the frontend was not rebuilt, or the startup file path is
  wrong. Run `cd frontend && npm run build` and check the app root/startup file.
- **`JWT_SECRET` error in logs**: `backend/.env` is missing or the secret is the
  placeholder. Fix it and restart.
- **Images not showing**: check that `backend/uploads/` exists and has the right
  permissions (the panel user must be able to read/write it).
- **Database errors**: the app folder must be writable by the Node.js process so
  it can write `backend/data/novanest.json`.
