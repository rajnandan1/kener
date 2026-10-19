# Kener — Coding Standards

Timestamps are UTC **seconds**. Use the helpers in `src/lib/server/tool.ts` (`GetNowTimestampUTC`, `GetMinuteStartTimestampUTC`, `GetDayStartTimestampUTC`).

## API Routes

- `src/hooks.server.ts` requires a Bearer API key on every `/api/` route except `/api/status`. It also loads the monitor, incident, maintenance, or page named in the path into `locals`.
- The status page fetches its own data from `/dashboard-apis/<action>`, with no API key. `src/routes/(kener)/dashboard-apis/[action]/+server.ts` serves it from `src/lib/server/api-server/<action>/<method>.ts`.

## Database

- Every read, write, update, migration, and seed works on **SQLite, PostgreSQL, and MySQL**. Switch engines with `DATABASE_URL`: `postgresql://...` or `mysql://...` (SQLite is the default). The tests use in-memory SQLite, so run a database change on the other two before you finish:
    1. Start throwaway servers: `docker run -d --rm --name kener-pg -e POSTGRES_USER=kener -e POSTGRES_PASSWORD=kener -e POSTGRES_DB=kener -p 127.0.0.1:55432:5432 postgres:16-alpine` and `docker run -d --rm --name kener-mysql -e MARIADB_USER=kener -e MARIADB_PASSWORD=kener -e MARIADB_DATABASE=kener -e MARIADB_ROOT_PASSWORD=root -p 127.0.0.1:53306:3306 mariadb:11`.
    2. For each URL, `postgresql://kener:kener@localhost:55432/kener` and `mysql://kener:kener@127.0.0.1:53306/kener`, run `DATABASE_URL=<url> npm run migrate` and `DATABASE_URL=<url> npm run seed`, then the test that covers the change with `TEST_DATABASE_URL=<url>`. `src/routes/(api)/api/v4/write-parity.test.ts` reads `TEST_DATABASE_URL` and runs every v4 and dashboard write; copy its database setup into a new database test. The test empties the tables of the database it runs on, so point it only at a throwaway server.
    3. Stop the servers: `docker stop kener-pg kener-mysql`.
- Write queries and schema changes with the Knex query builder and schema builder. When raw SQL is unavoidable, branch it on `GetDbType()` from `src/lib/server/tool.ts` or wrap it in `try/catch`. Check that `defaultTo()` and `notNullable()` behave the same on all three engines.
- A new repository method needs a field and a `.bind` line in `src/lib/server/db/dbimpl.ts`. `npm run check` passes without the `.bind` line, and the call fails at runtime.

## Migrations and Seeds

- Change the schema with a new migration. A migration that has shipped stays as it is. Guard each change with `hasTable` / `hasColumn` so the migration can run twice, as `migrations/20260613120000_add_confirmation_threshold_and_raw_status.ts` does.
- Knex runs migrations and seeds from source on plain Node: the Knex CLI in dev, and `db.migrate.latest()` / `db.seed.run()` in `scripts/main.ts` in production. Plain Node strips types but resolves neither `$lib` nor a `.js` path to a `.ts` file. So a migration or seed imports only files that have no imports of their own, by a relative path that ends in `.ts`: `import { permissions } from "../src/lib/allPerms.ts"`.
- The production image copies only the files that seeds import (the "Seed data files" block in `Dockerfile`). A seed that imports a file outside that block needs a new `COPY` line there.
