# Kener — Coding Standards

## Code Style

- Svelte components use runes (`$state`, `$derived`, `$effect`, `$props()`). Route files import their types from `./$types`.
- Put a type where its users are: `src/lib/types/` (shared), `src/lib/server/types/` (server only), `src/lib/client/types/` (client only). Import types with `import type { ... }`.
- Status constants are the default export of `src/lib/global-constants.ts`: `import GC from "$lib/global-constants"`, then `GC.UP`, `GC.DOWN`, `GC.DEGRADED`, `GC.MAINTENANCE`, `GC.NO_DATA`.
- Timestamps are UTC **seconds**. Use the helpers in `src/lib/server/tool.ts` (`GetNowTimestampUTC`, `GetMinuteStartTimestampUTC`, `GetDayStartTimestampUTC`).
- API auth uses `VerifyAPIKey` from `$lib/server/controllers/apiController`. API payloads are snake_case; their types live in `src/lib/types/api.ts`.
- UI uses shadcn-svelte (`import { Button } from "$lib/components/ui/button"`) and Tailwind CSS v4 with HSL CSS variables.

## Database

- In `src/`, Kener's own data goes through the db singleton: `import db from "$lib/server/db/db"`. The SQL monitor (`src/lib/server/services/sqlCall.ts`) opens its own Knex instance because it connects to the database it monitors.
- Every migration, query, and repository function works on **SQLite, PostgreSQL, and MySQL**. Switch engines with `DATABASE_URL`: `sqlite://./database/kener.sqlite.db` (the default), `postgresql://...`, or `mysql://...`.
- Write queries and schema changes with the Knex query builder and schema builder. When raw SQL is unavoidable, branch it on `GetDbType()` from `src/lib/server/tool.ts` or wrap it in `try/catch`.
- Check that `defaultTo()` and `notNullable()` behave the same on all three engines.

## Migrations and Seeds

- Name a migration `YYYYMMDDHHMMSS_snake_case.ts`. Guard each change with `hasTable` / `hasColumn` so the migration can run twice.
- Change the schema with a new migration. A migration that has shipped stays as it is.
- Knex runs migrations and seeds from source on plain Node: the Knex CLI in dev, and `db.migrate.latest()` / `db.seed.run()` in `scripts/main.ts` in production. Plain Node strips types but resolves neither `$lib` nor a `.js` path to a `.ts` file. So a migration or seed imports only files that have no imports of their own, by a relative path that ends in `.ts`: `import { permissions } from "../src/lib/allPerms.ts"`.
- The production image copies each file a seed imports by name (the "Seed data files" block in `Dockerfile`). A new seed import needs a new `COPY` line there.

From `migrations/20260613120000_add_confirmation_threshold_and_raw_status.ts`:

<!-- prettier-ignore -->
```ts
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn("monitors", "confirmation_threshold"))) {
    await knex.schema.alterTable("monitors", (table) => {
      table.integer("confirmation_threshold").unsigned().notNullable().defaultTo(1);
    });
  }
  if (!(await knex.schema.hasColumn("monitoring_data", "raw_status"))) {
    await knex.schema.alterTable("monitoring_data", (table) => {
      table.text("raw_status").nullable();
    });
  }
}
```
