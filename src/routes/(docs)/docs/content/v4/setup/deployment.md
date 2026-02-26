---
title: Deployment
description: Deploy Kener with Docker or Node.js and verify service health with the healthcheck endpoint
---

Use this guide when moving from local testing to production. It includes `.env` examples for PostgreSQL, MySQL, subpath deployments, and both SMTP/Resend email providers.

## Quick start with Docker Compose {#quick-start-with-docker-compose}

For most teams, Docker Compose is the fastest path to production.

1. Clone the repo.
2. Create a `.env` file.
3. Start services with Docker Compose.

Minimum required values:

- `KENER_SECRET_KEY`
- `ORIGIN`
- `REDIS_URL`

## Required and common variables {#required-and-common-variables}

| Variable           | Required | Notes                         |
| :----------------- | :------- | :---------------------------- |
| `KENER_SECRET_KEY` | Yes      | Use a strong random secret    |
| `ORIGIN`           | Yes      | Public URL, no trailing slash |
| `REDIS_URL`        | Yes      | `redis://` or `rediss://`     |
| `DATABASE_URL`     | No       | Defaults to SQLite if omitted |
| `PORT`             | No       | Defaults to `3000`            |
| `KENER_BASE_PATH`  | No       | Example: `/status`            |

For full variable reference, see [Environment Variables](/docs/v4/setup/environment-variables).

## .env examples {#env-examples}

### PostgreSQL + external Redis {#postgresql-external-redis}

```dotenv
KENER_SECRET_KEY=replace_with_a_long_random_secret
ORIGIN=https://status.example.com
DATABASE_URL=postgresql://kener:strongpassword@postgres.example.com:5432/kener
REDIS_URL=redis://redis.example.com:6379
PORT=3000
```

### MySQL + external Redis {#mysql-external-redis}

```dotenv
KENER_SECRET_KEY=replace_with_a_long_random_secret
ORIGIN=https://status.example.com
DATABASE_URL=mysql://kener:strongpassword@mysql.example.com:3306/kener
REDIS_URL=redis://redis.example.com:6379
PORT=3000
```

### Subpath deployment (`/status`) + PostgreSQL {#subpath-postgresql}

```dotenv
KENER_SECRET_KEY=replace_with_a_long_random_secret
ORIGIN=https://example.com
KENER_BASE_PATH=/status
DATABASE_URL=postgresql://kener:strongpassword@postgres.example.com:5432/kener
REDIS_URL=redis://redis.example.com:6379
PORT=3000
```

> [!IMPORTANT]
> For subpath deployments, `ORIGIN` remains the domain root (for example `https://example.com`), and `KENER_BASE_PATH` carries the subpath (for example `/status`).

## Email examples in .env {#email-examples-in-env}

Add one of these blocks to any `.env` example above.

### SMTP enabled {#smtp-enabled}

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=mailer-user
SMTP_PASS=mailer-password
SMTP_FROM_EMAIL=status@example.com
SMTP_SECURE=0
```

### Resend enabled {#resend-enabled}

```dotenv
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_SENDER_EMAIL=status@example.com
```

> [!NOTE]
> If SMTP and Resend are both configured, SMTP is used first. See [Email Setup](/docs/v4/setup/email-setup).

## Using the current Docker Compose with your own DB/Redis {#using-current-docker-compose-with-your-own-db-redis}

If your team already runs managed PostgreSQL/MySQL/Redis, keep `docker-compose.yml` and set connection URLs in `.env`.

### Example: current Compose + managed PostgreSQL/Redis {#compose-managed-postgres-redis}

```dotenv
KENER_SECRET_KEY=replace_with_a_long_random_secret
ORIGIN=https://status.example.com
DATABASE_URL=postgresql://kener:strongpassword@pg-managed.example.com:5432/kener
REDIS_URL=rediss://redis-managed.example.com:6380
PORT=3000
```

### Example: current Compose + managed MySQL/Redis {#compose-managed-mysql-redis}

```dotenv
KENER_SECRET_KEY=replace_with_a_long_random_secret
ORIGIN=https://status.example.com
DATABASE_URL=mysql://kener:strongpassword@mysql-managed.example.com:3306/kener
REDIS_URL=redis://redis-managed.example.com:6379
PORT=3000
```

## Docker Compose override examples (self-host DB/Redis) {#docker-compose-override-examples}

If you want PostgreSQL/MySQL/Redis containers in the same Docker Compose stack, add an override file and keep app variables in `.env`.

### Option A: `docker-compose.pg.yml` {#option-a-docker-compose-pg}

```yaml
services:
    postgres:
        image: postgres:16
        environment:
            POSTGRES_DB: kener
            POSTGRES_USER: kener
            POSTGRES_PASSWORD: kener_password
        volumes:
            - pg_data:/var/lib/postgresql/data

    redis:
        image: redis:7-alpine
        command: ["redis-server", "--appendonly", "yes"]
        volumes:
            - redis_data:/data

volumes:
    pg_data:
    redis_data:
```

Use with this `.env`:

```dotenv
KENER_SECRET_KEY=replace_with_a_long_random_secret
ORIGIN=https://status.example.com
DATABASE_URL=postgresql://kener:kener_password@postgres:5432/kener
REDIS_URL=redis://redis:6379
PORT=3000
```

### Option B: `docker-compose.mysql.yml` {#option-b-docker-compose-mysql}

```yaml
services:
    mysql:
        image: mysql:8
        environment:
            MYSQL_DATABASE: kener
            MYSQL_USER: kener
            MYSQL_PASSWORD: kener_password
            MYSQL_ROOT_PASSWORD: root_password
        command: ["--default-authentication-plugin=mysql_native_password"]
        volumes:
            - mysql_data:/var/lib/mysql

    redis:
        image: redis:7-alpine
        command: ["redis-server", "--appendonly", "yes"]
        volumes:
            - redis_data:/data

volumes:
    mysql_data:
    redis_data:
```

Use with this `.env`:

```dotenv
KENER_SECRET_KEY=replace_with_a_long_random_secret
ORIGIN=https://status.example.com
DATABASE_URL=mysql://kener:kener_password@mysql:3306/kener
REDIS_URL=redis://redis:6379
PORT=3000
```

> [!TIP]
> Keep secrets in `.env` and avoid hardcoding credentials in Compose files.

## Pre-built image deployment {#pre-built-image-deployment}

You can run official images from either registry:

- Docker Hub: `docker.io/rajnandan1/kener:latest`
- GHCR: `ghcr.io/rajnandan1/kener:latest`

Example using `.env`:

```bash
mkdir -p database

# .env should contain at least KENER_SECRET_KEY, ORIGIN, REDIS_URL
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
mv .env-min.example .env
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
- For database-specific guidance, see [Database Setup](/docs/v4/setup/database-setup).
- For email configuration details, see [Email Setup](/docs/v4/setup/email-setup).
