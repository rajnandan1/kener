# Database & Migrations

## Overview

Kener uses **Knex.js** as a database abstraction layer supporting three engines: **SQLite** (default, via `better-sqlite3`), **PostgreSQL** (`pg`), and **MySQL** (`mysql2`). The engine is selected at runtime from the `DATABASE_URL` environment variable prefix (`sqlite://`, `postgresql://`, `mysql://`).

## Architecture

### Connection & Config

| File                              | Responsibility                                             |
| --------------------------------- | ---------------------------------------------------------- |
| `knexfile.ts`                     | Parses `DATABASE_URL`, selects client, exports Knex config |
| `src/lib/server/db/db.ts`         | Singleton Knex instance — all app code imports from here   |
| `src/lib/server/db/dbimpl.js`     | High-level DB methods (wraps repositories)                 |
| `src/lib/server/db/repositories/` | Per-domain query classes extending `BaseRepository`        |

### Repository Pattern

Each repository lives in `src/lib/server/db/repositories/<domain>.ts`, extends `BaseRepository` (which receives the Knex instance), and exposes typed async methods. Queries use Knex query builder — never raw SQL (except index creation wrapped in try/catch).

### Migrations

Migrations live in `migrations/` as TypeScript files with naming convention `YYYYMMDDHHMMSS_<description>.ts`.

Key patterns observed across all existing migrations:

- **Idempotency guards**: `knex.schema.hasTable` / `knex.schema.hasColumn` before `createTable` / `alterTable`.
- **Column types**: Knex abstractions only (`.string()`, `.integer()`, `.text()`, `.float()`). No raw DDL.
- **Defaults**: `.defaultTo()` + `.notNullable()` for YES/NO string flags (e.g., `is_hidden`, `is_owner`).
- **Data seeding in migrations**: Standard Knex query builder (`.orderBy().first()`, `.update()`) — works on all three engines.
- **Index creation**: Wrapped in `try/catch` because `CREATE INDEX IF NOT EXISTS` isn't portable.
- **PostgreSQL insert returning**: Some repos branch on `GetDbType() === "postgresql"` to use `.returning("*")`, with fallback to re-read by inserted ID for SQLite/MySQL.

## Edge Cases and Gotchas

- SQLite requires `useNullAsDefault: true` in Knex config.
- PostgreSQL `INSERT ... RETURNING *` is not supported by SQLite/MySQL — branch on `GetDbType()`.
- `knex.fn.now()` is the portable way to set timestamps; never use `NOW()` or `datetime('now')`.
- String-based YES/NO flags (not booleans) are the project convention for flag columns.

## Design Decisions

- **YES/NO strings over booleans**: Consistent with existing `is_hidden`, `include_degraded_in_downtime`, etc. Avoids SQLite boolean quirks.
- **hasColumn guard in migrations**: Allows re-running migrations safely without failure on already-applied columns.
- **Owner flag (`is_owner`)**: Set during migration on the first user by `id ASC`. Only one user should be owner; enforced at application level, not DB constraint.
