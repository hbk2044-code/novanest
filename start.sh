#!/bin/bash
# NovaNest startup script - starts both backend and frontend
# Backend API: http://localhost:3001
# Frontend (preview): http://localhost:5173 (proxies /api to backend)

echo "Starting NovaNest..."

# Start backend server in background
cd "$(dirname "$0")/backend" || exit 1
node server.js &
BACKEND_PID=$!
echo "Backend started (PID $BACKEND_PID) on http://localhost:3001"

# Start frontend dev server (the exposed port)
cd "$(dirname "$0")/frontend" || exit 1
npx vite --port 5173 &
FRONTEND_PID=$!
echo "Frontend started (PID $FRONTEND_PID) on http://localhost:5173"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

wait
