#!/bin/bash
# NovaNest development startup script (hot-reload, not for production).
#
# Starts the Express API on :3001 and the Vite dev server on :5173
# (which proxies /api and /uploads to the backend).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start backend server in background
cd "$SCRIPT_DIR/backend" || exit 1
node --env-file-if-exists=.env server.js &
BACKEND_PID=$!
echo "Backend started (PID $BACKEND_PID) on http://localhost:3001"

# Start frontend dev server (the preview port)
cd "$SCRIPT_DIR/frontend" || exit 1
npx vite --port 5173 &
FRONTEND_PID=$!
echo "Frontend started (PID $FRONTEND_PID) on http://localhost:5173"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
