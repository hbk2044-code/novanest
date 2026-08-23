# Deploying NovaNest on a Hostinger VPS / Cloud (or any Linux server)

You have full root access, so you can pick any of the three options below.

> Using **Hostinger shared hosting** instead? See `HOSTINGER-SHARED.md`.

---

## Option A — one-shot setup script (recommended)

On a fresh Ubuntu/Debian VPS:

```bash
bash web/deploy/setup-vps.sh <your-repo-git-url> your-domain.com
```

This installs Node.js 22, nginx, and pm2; clones the repo to `/opt/novanest`;
installs dependencies (in `/opt/novanest/web`); creates `backend/.env`; builds the
frontend; installs the nginx site; and starts the app under pm2.

Then finish the config:

```bash
nano /opt/novanest/web/backend/.env     # JWT_SECRET (openssl rand -hex 32), ADMIN_EMAIL, ADMIN_PASSWORD, payment keys
pm2 restart novanest
sudo certbot --nginx -d your-domain.com   # HTTPS
```

> **JWT_SECRET** must be a real random value — the server refuses to start if it is
> missing **or still set to the placeholder** `change-me-to-a-long-random-hex-string`.

> **Lost the admin password?** Stop the server, then run
> `ADMIN_PASSWORD='Strong-New-Pass!' node backend/reset-admin.js` (inside
> `/opt/novanest/web/backend`) and restart. It rotates the existing admin account
> (or creates one). Never hand-edit `backend/data/novanest.json` to reset
> credentials while the server is running — the live server holds the DB in memory
> and will overwrite the file on next save.

---

## Option B — Docker

```bash
# run from inside the web/ project folder
cp backend/.env.example backend/.env   # edit JWT_SECRET, ADMIN_*, payment keys
docker compose -f deploy/docker-compose.yml up -d --build
```

Data (database + uploads) is kept in the named volume `novanest-data` and
survives container rebuilds. Then either expose 3001 directly or put nginx
(see `deploy/nginx.conf`) or the Hostinger firewall in front.

---

## Option C — manual (pm2 or systemd)

```bash
# 1. Install Node.js 22 + nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs nginx

# 2. Get the code
git clone <your-repo-url> /opt/novanest && cd /opt/novanest/web
cd backend && npm ci && cp .env.example .env && nano .env
cd ../frontend && npm ci && npm run build

# 3. Start (pick one)
sudo npm i -g pm2 && pm2 start deploy/ecosystem.config.js && pm2 save
# or
sudo cp deploy/novanest.service /etc/systemd/system/ && sudo systemctl enable --now novanest

# 4. Reverse proxy + HTTPS
sudo cp deploy/nginx.conf /etc/nginx/sites-available/novanest
sudo ln -s /etc/nginx/sites-available/novanest /etc/nginx/sites-enabled/
sudo nano /etc/nginx/sites-available/novanest   # set your domain
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com
```

---

## Before you go live

1. **`backend/.env`** — set a real `JWT_SECRET` (`openssl rand -hex 32`), your
   `ADMIN_EMAIL` / `ADMIN_PASSWORD`, and `APP_URL=https://your-domain.com`.
2. **Payment gateways** — flip `ESEWA_TEST_MODE` / `KHALTI_TEST_MODE` to `false`
   and add live merchant keys (or set them in Admin → Payments).
3. **Persistent storage** — the JSON database and uploads live on the server
   disk. They survive restarts and pm2/systemd restarts. If you want them on a
   separate data disk, set `DATA_DIR` and `UPLOAD_DIR` to absolute paths and
   restart the app.
4. **Updating** — `git pull` (inside `/opt/novanest/web`), `cd frontend && npm
   run build`, then `pm2 reload novanest` (or `sudo systemctl restart novanest`
   / rebuild Docker).
