#!/bin/bash
# NovaNest production startup script.
#
# 1. Verifies backend/.env exists with a real JWT_SECRET.
# 2. Builds the frontend for production (frontend/dist).
# 3. Starts ONLY the Express server on port 3001, which serves both the
#    /api backend and the built frontend from the same origin (no dev server,
#    no Vite). Point a reverse proxy at port 3001.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PORT="${PORT:-3001}"

# --- 1. Validate configuration -------------------------------------------------
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "ERROR: backend/.env is missing." >&2
  echo "  Copy backend/.env.example to backend/.env and set a real JWT_SECRET:" >&2
  echo "    cp backend/.env.example backend/.env" >&2
  echo "    openssl rand -hex 32   # paste the output into JWT_SECRET= in backend/.env" >&2
  exit 1
fi
if grep -q "JWT_SECRET=change-me-to-a-long-random-hex-string" "$BACKEND_DIR/.env" 2>/dev/null; then
  echo "ERROR: JWT_SECRET in backend/.env is still the placeholder." >&2
  echo "  Generate one with 'openssl rand -hex 32' and edit backend/.env." >&2
  exit 1
fi

# --- 2. Build frontend ---------------------------------------------------------
echo "Building frontend..."
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi
(cd "$FRONTEND_DIR" && npm run build)

# --- 3. Start backend (serves API + static frontend) ---------------------------
echo "Starting NovaNest on http://localhost:$PORT ..."
cd "$BACKEND_DIR" || exit 1
PORT="$PORT" node --env-file-if-exists=.env server.js
