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

## Environment variables {#environment-variables}

| Variable       | Description                | Default                               | Required |
| -------------- | -------------------------- | ------------------------------------- | -------- |
| `DATABASE_URL` | Database connection string | `sqlite://./database/kener.sqlite.db` | No       |
