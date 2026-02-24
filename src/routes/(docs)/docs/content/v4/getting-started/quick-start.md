---
title: Quick Start
description: Get Kener up and running in under 5 minutes
---

Get Kener up and running in under 5 minutes with this quick start guide.

For production-focused deployment details (Docker image options, Node.js server setup, and healthcheck URL), use [Deployment](/docs/v4/setup/deployment).

## Docker Quick Start {#docker-quick-start}

The fastest way to get started is with Docker Compose.

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener

# Update KENER_SECRET_KEY and ORIGIN in docker-compose.yml before first run
docker compose up -d
```

Kener will be available at `http://localhost:3000`.

> [!IMPORTANT]
> Set a strong value for `KENER_SECRET_KEY` and set `ORIGIN` to your public URL in `docker-compose.yml` before starting.

### Build from local source (optional) {#docker-build-from-local-source-optional}

Use this if you want to test your local changes in Docker:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

Need full deployment options? See [Deployment](/docs/v4/setup/deployment).

## Development Setup {#development-setup}

For local development with hot reload:

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener
npm install

# Start Redis (if not already running)
docker run -d --name kener-redis -p 6379:6379 redis:7-alpine

npm run dev
```

Open `http://localhost:3000`.

> [!NOTE]
> `npm run dev` automatically runs migration and seed steps via npm pre-scripts.
