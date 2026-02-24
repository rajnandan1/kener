# syntax=docker/dockerfile:1

# =============================================================================
# Kener v4 — Status Page Application
# Multi-stage, multi-variant (Alpine / Debian) Dockerfile
#
# Build:
#   docker build -t kener .                          # Alpine (default)
#   docker build -t kener --build-arg VARIANT=debian . # Debian Slim
#   docker build -t kener --build-arg WITH_DOCS=true .  # Include docs
#
# Run:
#   docker run -d -p 3000:3000 \
#     -e KENER_SECRET_KEY=<secret> \
#     -e ORIGIN=http://localhost:3000 \
#     -e REDIS_URL=redis://<host>:6379 \
#     -v kener_db:/app/database \
#     kener
# =============================================================================

ARG NODE_VERSION=24
ARG VARIANT=alpine
ARG WITH_DOCS=false
ARG KENER_BASE_PATH=

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

ARG KENER_BASE_PATH
ENV KENER_BASE_PATH=${KENER_BASE_PATH}

# 1. Copy package manifests first (maximises layer cache hits)
COPY package*.json ./

# 2. Install ALL dependencies (devDependencies needed for the build step)
RUN npm ci --no-fund && \
    npm cache clean --force

# 3. Copy the rest of the source tree
COPY . .

# 4. Create directories that the app expects
RUN mkdir -p database

# 5. Conditionally remove docs routes before build
#    (avoids EXDEV rename error in overlayfs; clean .svelte-kit so stale
#    route types don't persist)
ARG WITH_DOCS
RUN if [ "$WITH_DOCS" != "true" ]; then \
      rm -rf src/routes/\(docs\) .svelte-kit; \
    fi

# 6. Build: SvelteKit (vite) + server bundle (esbuild)
#    Use build-with-docs when docs are enabled
RUN if [ "$WITH_DOCS" = "true" ]; then \
      npm run build-with-docs; \
    else \
      npm run build; \
    fi

# 7. Stage docs runtime files for index-docs (empty dir when docs disabled)
RUN mkdir -p /docs-runtime && \
    if [ "$WITH_DOCS" = "true" ]; then \
      mkdir -p /docs-runtime/scripts && \
      mkdir -p /docs-runtime/src/lib && \
      mkdir -p "/docs-runtime/src/routes/(docs)/docs" && \
      cp scripts/index-docs.ts /docs-runtime/scripts/ && \
      cp src/lib/marked.ts /docs-runtime/src/lib/ && \
      cp "src/routes/(docs)/docs.json" "/docs-runtime/src/routes/(docs)/" && \
      cp -r "src/routes/(docs)/docs/content" "/docs-runtime/src/routes/(docs)/docs/"; \
    fi

# 8. Remove devDependencies from node_modules
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
ARG KENER_BASE_PATH=

ENV NODE_ENV=production \
    PORT=${PORT} \
    KENER_BASE_PATH=${KENER_BASE_PATH} \
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

# Docs runtime files (index-docs script + markdown sources; empty when WITH_DOCS=false)
COPY --chown=node:node --from=builder /docs-runtime/ ./

# Entrypoint script (runs index-docs on startup when docs are bundled)
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

# ---- Runtime configuration ----

# Switch to non-root user
USER node

EXPOSE ${PORT}

# Healthcheck: hit the /healthcheck endpoint exposed by Express in main.ts
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD sh -c 'curl -sf http://localhost:${PORT}${KENER_BASE_PATH}/healthcheck || exit 1'

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "build/main.js"]
