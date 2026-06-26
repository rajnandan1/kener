---
title: Database Setup
description: Configure SQLite, PostgreSQL, or MySQL database for Kener
---

Kener stores monitor data, incidents, and subscriptions in a relational database.

Supported databases:

- **SQLite** (default)
- **PostgreSQL** (recommended for production)
- **MySQL**

## Quick configuration {#quick-configuration}

Set `DATABASE_URL` in `.env`.

```env
# Default (if omitted)
DATABASE_URL=sqlite://./database/kener.sqlite.db

# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/kener

# MySQL
DATABASE_URL=mysql://user:password@host:3306/kener
```

Kener detects the database from the URL prefix:

- `sqlite://`
- `postgresql://`
- `mysql://`

## Minimum server sizing (CPU/RAM) {#minimum-server-sizing}

> [!NOTE]
> Based on practical Kener v4 deployment patterns (app + Redis + relational DB). If you scale monitor count or retention, scale resources accordingly.

### Kener app instance {#app-instance-sizing}

| Workload    | vCPU | RAM   | Typical use                            |
| ----------- | ---- | ----- | -------------------------------------- |
| Minimum     | 1    | 512MB | Testing, small personal setup          |
| Recommended | 1    | 1GB   | Small production (up to ~100 monitors) |
| Higher load | 2    | 2GB+  | 100+ monitors, higher request volume   |

### Database service {#database-service-sizing}

| Database   | Minimum           | Recommended                  |
| ---------- | ----------------- | ---------------------------- |
| SQLite     | Uses app disk/RAM | SSD storage, regular backups |
| PostgreSQL | 1 vCPU / 512MB    | 1 vCPU / 1-2GB               |
| MySQL      | 1 vCPU / 512MB    | 1 vCPU / 1-2GB               |

## SQLite {#sqlite}

Good for single-instance and simple deployments.

```env
DATABASE_URL=sqlite://./database/kener.sqlite.db
```

Custom path example:

```env
DATABASE_URL=sqlite:///var/lib/kener/kener.db
```

## PostgreSQL {#postgresql}

Recommended for production and multi-instance deployments.

```env
DATABASE_URL=postgresql://kener:password@localhost:5432/kener
```

With SSL:

```env
DATABASE_URL=postgresql://user:pass@host:5432/kener?sslmode=require
```

## MySQL {#mysql}

Use when MySQL/MariaDB is your standard stack.

```env
DATABASE_URL=mysql://kener:password@localhost:3306/kener
```

## Connection pool tuning {#connection-pool-tuning}

For PostgreSQL and MySQL, Kener ships fail-fast, self-healing pool defaults: no permanently-idle connections, TCP keepalive on, and 15-second connection timeouts. This protects deployments on cloud networks (Railway, Docker Swarm overlays, Kubernetes) that silently drop idle TCP connections, which otherwise causes 500s after idle periods and can require a restart after a database outage.

Kener uses **two separate pools** so background work cannot starve page loads: a **web pool** (`DATABASE_POOL_MAX`) for HTTP requests and a **worker pool** (`DATABASE_WORKER_POOL_MAX`) for background jobs (monitor checks, alerting, scheduled tasks). A burst of background jobs can only exhaust the worker pool, leaving the web pool free to serve requests.

Override only if your setup needs it:

| Variable                      | Description                                                     | Default |
| ----------------------------- | --------------------------------------------------------------- | ------- |
| `DATABASE_POOL_MIN`           | Minimum pool connections (0 lets idle connections be reclaimed) | `0`     |
| `DATABASE_POOL_MAX`           | Max connections for the **web** (HTTP request) pool             | `10`    |
| `DATABASE_WORKER_POOL_MAX`    | Max connections for the **worker** (background job) pool        | `5`     |
| `DATABASE_ACQUIRE_TIMEOUT_MS` | How long a query waits for a free connection before failing     | `15000` |
| `DATABASE_CREATE_TIMEOUT_MS`  | How long a new connection attempt waits before failing          | `15000` |
| `DATABASE_IDLE_TIMEOUT_MS`    | How long a connection may sit idle before being closed          | `30000` |
| `DATABASE_KEEPALIVE`          | TCP keepalive on connections (`true`/`false`)                   | `true`  |

> [!IMPORTANT]
> Budget your pools against the database's `max_connections`: `replicas × (DATABASE_POOL_MAX + DATABASE_WORKER_POOL_MAX)` must stay below it. On small managed Postgres tiers (often capped near 20–25 connections), keep the defaults or lower them. Each `GET /` fans out several queries, so a web pool that is too small causes `KnexTimeoutError` under concurrent traffic.

> [!TIP]
> If your database is slow to accept connections (cold starts, cross-region), raise `DATABASE_ACQUIRE_TIMEOUT_MS` and `DATABASE_CREATE_TIMEOUT_MS` instead of disabling keepalive or raising `DATABASE_POOL_MIN`.

These variables have no effect on SQLite, which uses a single shared connection.

## Switching databases {#switching-databases}

1. Backup/export data.
2. Update `DATABASE_URL`.
3. Restart Kener.

> [!WARNING]
> Switching databases does **not** migrate existing data automatically.

## Troubleshooting {#troubleshooting}

- Connection failed: verify host, port, credentials, firewall.
- Migration failed: ensure DB exists and user can `CREATE`/`ALTER`.
- SQLite write error: ensure directory exists and is writable.
- `KnexTimeoutError: Timeout acquiring a connection`: every pooled connection is busy, or the database is unreachable/too slow to accept new ones. If the database is healthy, the pool is too small for your concurrency — raise `DATABASE_POOL_MAX` (and `DATABASE_WORKER_POOL_MAX`) within your `max_connections` budget. See [Connection pool tuning](#connection-pool-tuning).
- `Connection terminated unexpectedly` after idle periods: the network dropped an idle connection; keepalive (on by default) prevents this — verify `DATABASE_KEEPALIVE` is not set to `false`.

## Environment variables {#environment-variables}

| Variable       | Description                | Default                               | Required |
| -------------- | -------------------------- | ------------------------------------- | -------- |
| `DATABASE_URL` | Database connection string | `sqlite://./database/kener.sqlite.db` | No       |

Pool tuning variables are listed in [Connection pool tuning](#connection-pool-tuning).
