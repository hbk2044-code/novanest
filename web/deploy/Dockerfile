# NovaNest - multi-stage production image (VPS / Hostinger Cloud / Docker)
#
# Build from inside the `web/` project folder (the build context is web/, which
# contains backend/ + frontend/ + deploy/):
#   cd web
#   docker build -f deploy/Dockerfile -t novanest .
# Run:
#   docker run -d -p 3001:3001 --env-file backend/.env \
#     -v novanest-data:/data -v novanest-uploads:/data/uploads novanest
# (or just use deploy/docker-compose.yml)

# --- Stage 1: build the frontend ---
FROM node:22-alpine AS build
WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
RUN cd frontend && npm run build

# --- Stage 2: runtime (backend only) ---
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV UPLOAD_DIR=/data/uploads
ENV PORT=3001

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist

# The JSON database and uploads live on a persistent volume mounted at /data.
VOLUME ["/data"]

EXPOSE 3001
WORKDIR /app/backend
CMD ["node", "server.js"]
