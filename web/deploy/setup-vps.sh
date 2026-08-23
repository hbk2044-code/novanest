#!/bin/bash
# NovaNest - one-shot setup for a fresh Ubuntu/Debian VPS (non-Docker).
#
# What it does:
#   1. Installs Node.js 22 + nginx + pm2 (if missing)
#   2. Clones the repo into /opt/novanest
#   3. Installs deps, creates backend/.env from the example, builds the frontend
#   4. Installs the nginx site (deploy/nginx.conf) and starts the app under pm2
#
# Usage:
#   bash web/deploy/setup-vps.sh <your-repo-git-url> [your-domain]
#
# After it finishes:
#   - Edit /opt/novanest/web/backend/.env  (JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, payment keys)
#   - sudo nano /etc/nginx/sites-available/novanest   # set your real domain
#   - sudo certbot --nginx -d your-domain             # enable HTTPS

set -euo pipefail

REPO_URL="${1:?Usage: bash deploy/setup-vps.sh <git-url> [domain]}"
DOMAIN="${2:-shop.example.com}"
APP_DIR="/opt/novanest"

# --- 1. System packages -------------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx curl

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

npm install -g pm2

# --- 2. Clone + install -------------------------------------------------------
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR/web"
git pull --rebase

cd backend
npm ci --omit=dev
if [ ! -f .env ]; then
  cp .env.example .env
  echo "NOTE: created web/backend/.env - you MUST edit it (JWT_SECRET, ADMIN_*) before going live."
fi
cd ../frontend
npm ci
npm run build

# --- 3. Reverse proxy ---------------------------------------------------------
sed "s/shop.example.com/$DOMAIN/g" "$APP_DIR/web/deploy/nginx.conf" \
  > /etc/nginx/sites-available/novanest
ln -sf /etc/nginx/sites-available/novanest /etc/nginx/sites-enabled/novanest
nginx -t && systemctl reload nginx

# --- 4. Start under pm2 -------------------------------------------------------
cd "$APP_DIR/web"
pm2 start deploy/ecosystem.config.js
pm2 save

echo
echo "Done. NovaNest is running on http://localhost:3001 (proxied via nginx)."
echo "Next steps:"
echo "  1. nano $APP_DIR/web/backend/.env   # set JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, payment keys"
echo "  2. pm2 restart novanest"
echo "  3. sudo certbot --nginx -d $DOMAIN   # enable HTTPS"
