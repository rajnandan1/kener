---
title: Quick Start
description: Get Kener up and running in under 5 minutes
---

Get Kener up and running in under 5 minutes with this quick start guide.

## Docker Quick Start {#docker-quick-start}

The fastest way to get started is with Docker Compose.

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener

# Update KENER_SECRET_KEY in docker-compose.yml before first run
docker compose up -d
```

Kener will be available at `http://localhost:3000`.

> [!IMPORTANT]
> Set a strong value for `KENER_SECRET_KEY` in `docker-compose.yml` before starting.

### Run pre-built image {#run-pre-built-image-docker-hub-or-ghcr}

You can pull Kener from either registry:

- Docker Hub: `docker.io/rajnandan1/kener:latest`
- GHCR: `ghcr.io/rajnandan1/kener:latest`

Example with Docker Hub:

```bash
mkdir -p database
docker run -d \
	--name kener \
	-p 3000:3000 \
	-v "$(pwd)/database:/app/database" \
	--env-file .env \
	docker.io/rajnandan1/kener:latest
```

Same command with GHCR:

```bash
mkdir -p database
docker run -d \
	--name kener \
	-p 3000:3000 \
	-v "$(pwd)/database:/app/database" \
	--env-file .env \
	ghcr.io/rajnandan1/kener:latest
```

Minimum `.env` for Docker:

```dotenv
KENER_SECRET_KEY=replace_with_a_random_string
REDIS_URL=redis://host.docker.internal:6379
PORT=3000
```

Or pass required variables directly with `-e`:

```bash
mkdir -p database
docker run -d \
	--name kener \
	-p 3000:3000 \
	-v "$(pwd)/database:/app/database" \
	-e "KENER_SECRET_KEY=replace_with_a_random_string" \
	-e "REDIS_URL=redis://host.docker.internal:6379" \
	docker.io/rajnandan1/kener:latest
```

If you want to build locally from source:

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener
docker build -t kener:local .

mkdir -p database
docker run -d \
	--name kener-local \
	-p 3000:3000 \
	-v "$(pwd)/database:/app/database" \
	--env-file .env \
	kener:local
```

### Build from local source (optional) {#docker-build-from-local-source-optional}

Use this if you want to test your local changes in Docker:

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## Non-Docker Quick Start {#non-docker-quick-start}

Use this path if you want to run Kener directly with Node.js.

### Requirements {#non-docker-requirements}

- Node.js `>= 20`
- Redis

### Steps {#non-docker-steps}

```bash
git clone https://github.com/rajnandan1/kener.git
cd kener
npm install

# Start Redis (example)
docker run -d --name kener-redis -p 6379:6379 redis:7-alpine
```

Create or update your `.env`:

```dotenv
KENER_SECRET_KEY=replace_with_a_random_string
REDIS_URL=redis://localhost:6379
PORT=3000
# Optional (defaults to SQLite):
# DATABASE_URL=sqlite://./database/kener.sqlite.db
```

Then build and start:

```bash
npm run build
npm run start
```

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
