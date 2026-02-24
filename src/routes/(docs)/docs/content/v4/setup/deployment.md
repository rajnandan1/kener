---
title: Deployment
description: Deploy Kener with Docker or Node.js and verify service health with the healthcheck endpoint
---

Use this guide when you are moving from a quick local run to a stable deployment.

## Recommended deployment path {#recommended-deployment-path}

For most teams, Docker Compose is the fastest and safest way to run Kener in production.

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener

# Set secure values before first start
docker compose up -d
```

Before starting, update these values in `docker-compose.yml` (or your `.env`):

- `KENER_SECRET_KEY` (use a strong random value)
- `ORIGIN` (your public URL)
- `REDIS_URL` (reachable Redis instance)

## Pre-built image deployment {#pre-built-image-deployment}

You can run official images from either registry:

- Docker Hub: `docker.io/rajnandan1/kener:latest`
- GHCR: `ghcr.io/rajnandan1/kener:latest`

Example:

```bash
mkdir -p database

# create .env first (KENER_SECRET_KEY, ORIGIN, REDIS_URL)
docker run -d \
  --name kener \
  -p 3000:3000 \
  -v "$(pwd)/database:/app/database" \
  --env-file .env \
  docker.io/rajnandan1/kener:latest
```

## Node.js deployment (without Docker) {#nodejs-deployment-without-docker}

Use this when you prefer managing runtime directly on a VM/server.

Requirements:

- Node.js `>= 20`
- Redis

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener
npm install
npm run build
npm run start
```

Minimum `.env`:

```dotenv
KENER_SECRET_KEY=replace_with_a_random_string
ORIGIN=https://status.example.com
REDIS_URL=redis://localhost:6379
PORT=3000
# Optional (defaults to SQLite):
# DATABASE_URL=sqlite://./database/kener.sqlite.db
```

## Healthcheck URL {#healthcheck-url}

Kener exposes a healthcheck endpoint from the server entrypoint.

- Default path: `https://your-domain/healthcheck`
- With base path (`KENER_BASE_PATH=/status`): `https://your-domain/status/healthcheck`

Quick verification:

```bash
curl -fsS https://your-domain/healthcheck
```

Expected response body:

```text
ok
```

## Next steps {#next-steps}

- For reverse proxy and TLS setup, continue with [Reverse Proxy Setup](/docs/v4/guides/reverse-proxy).
- If you deploy under a subpath (`/status`), follow [Base Path Deployment](/docs/v4/guides/base-path).
- For initial local setup, see [Quick Start](/docs/v4/getting-started/quick-start).
