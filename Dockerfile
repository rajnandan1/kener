# syntax=docker/dockerfile:1

# =============================================================================
# Kener v4 — Status Page Application
# Multi-stage, multi-variant (Alpine / Debian) Dockerfile
#
# Build:
#   docker build -t kener .                          # Alpine (default)
#   docker build -t kener --build-arg VARIANT=debian . # Debian Slim
#
# Run:
#   docker run -d -p 3000:3000 \
#     -e KENER_SECRET_KEY=<secret> \
#     -e REDIS_URL=redis://<host>:6379 \
#     -v kener_db:/app/database \
#     kener
# =============================================================================

ARG NODE_VERSION=24
ARG VARIANT=alpine

# =============================================================================
#  STAGE 1 — BUILDER  (installs deps, compiles native modules, builds app)
# =============================================================================

# ---------- Alpine builder ----------
FROM node:${NODE_VERSION}-alpine AS builder-alpine
RUN apk add --no-cache \
    build-base \
    python3 \
    sqlite \
    sqlite-dev \
    tzdata

# ---------- Debian builder ----------
FROM node:${NODE_VERSION}-slim AS builder-debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    sqlite3 \
    libsqlite3-dev \
    tzdata && \
    rm -rf /var/lib/apt/lists/*

# ---------- Selected variant ----------
FROM builder-${VARIANT} AS builder

ENV NPM_CONFIG_LOGLEVEL=error

WORKDIR /app

# 1. Copy package manifests first (maximises layer cache hits)
COPY package*.json ./

# 2. Install ALL dependencies (devDependencies needed for the build step)
RUN npm ci --no-fund && \
    npm cache clean --force

# 3. Copy the rest of the source tree
COPY . .

# 4. Create directories that the app expects
RUN mkdir -p database

# 5. Remove docs routes before build (avoids EXDEV rename error in overlayfs)
#    and clean .svelte-kit so stale route types don't persist
RUN rm -rf src/routes/\(docs\) .svelte-kit

# 6. Build: SvelteKit (vite) + server bundle (esbuild)
RUN npm run build

# 7. Remove devDependencies from node_modules
RUN npm prune --omit=dev

# =============================================================================
#  STAGE 2 — PRODUCTION  (minimal runtime image)
# =============================================================================

# ---------- Alpine runtime ----------
FROM node:${NODE_VERSION}-alpine AS final-alpine
RUN apk add --no-cache \
    sqlite \
    tzdata \
    iputils \
    curl \
    libcap && \
    # Grant ping the NET_RAW capability so non-root users can send ICMP packets
    setcap cap_net_raw+ep /bin/ping || true

# ---------- Debian runtime ----------
FROM node:${NODE_VERSION}-slim AS final-debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    tzdata \
    iputils-ping \
    curl \
    libcap2-bin && \
    setcap cap_net_raw+ep /usr/bin/ping || true && \
    rm -rf /var/lib/apt/lists/*

# ---------- Selected variant ----------
FROM final-${VARIANT} AS final

ARG PORT=3000

ENV NODE_ENV=production \
    PORT=${PORT} \
    TZ=UTC \
    # Required so Node can import .ts migration/seed files at runtime
    NODE_OPTIONS="--experimental-strip-types"

WORKDIR /app

# Create writable directories owned by the non-root "node" user
# (node:node is provided by the official Node.js images)
RUN mkdir -p database && \
    chown -R node:node /app

# ---- Copy artifacts from builder (order: least → most likely to change) ----

# Production node_modules (largest layer, changes least often)
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Package manifest (needed for ESM "type":"module" resolution)
COPY --chown=node:node --from=builder /app/package.json ./package.json

# Knex migrations & seeds (run at startup by build/main.js)
COPY --chown=node:node --from=builder /app/migrations ./migrations
COPY --chown=node:node --from=builder /app/seeds ./seeds

# Seed data files imported by seeds at runtime (all are leaf modules)
COPY --chown=node:node --from=builder /app/src/lib/server/db/seedSiteData.ts      ./src/lib/server/db/seedSiteData.ts
COPY --chown=node:node --from=builder /app/src/lib/server/db/seedMonitorData.ts   ./src/lib/server/db/seedMonitorData.ts
COPY --chown=node:node --from=builder /app/src/lib/server/db/seedPagesData.ts     ./src/lib/server/db/seedPagesData.ts
COPY --chown=node:node --from=builder /app/src/lib/server/templates/general       ./src/lib/server/templates/general

# Build output (SvelteKit client/server + esbuild main.js) — changes most often
COPY --chown=node:node --from=builder /app/build ./build

# ---- Runtime configuration ----

# Switch to non-root user
USER node

EXPOSE ${PORT}

# Healthcheck: hit the /healthcheck endpoint exposed by Express in main.ts
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD sh -c 'curl -sf http://localhost:${PORT}${KENER_BASE_PATH}/healthcheck || exit 1'

ENTRYPOINT ["node"]
CMD ["build/main.js"]
