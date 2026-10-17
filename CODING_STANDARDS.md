# Kener — Coding Standards

## Code Style

- Svelte components use runes (`$state`, `$derived`, `$effect`, `$props()`). Route files import their types from `./$types`.
- Format with `npm run prettify`.
- Server code imports relative paths with a `.js` suffix (`import GC from "../../global-constants.js"`). Routes and components import from `$lib/...`.
- Status constants are the default export of `src/lib/global-constants.ts`: `import GC from "$lib/global-constants"`, then `GC.UP`, `GC.DOWN`, `GC.DEGRADED`, `GC.MAINTENANCE`, `GC.NO_DATA`.
- Timestamps are UTC **seconds**, never milliseconds. Use the helpers in `src/lib/server/tool.ts` (`GetNowTimestampUTC`, `GetMinuteStartTimestampUTC`, `GetDayStartTimestampUTC`).
- API auth uses `VerifyAPIKey` from `$lib/server/controllers/apiController`. API payloads are snake_case; their types live in `src/lib/types/api.ts`.
- UI uses shadcn-svelte (`import { Button } from "$lib/components/ui/button"`) and Tailwind CSS v4 with HSL CSS variables.

## Database

Database access goes through `import db from "$lib/server/db/db"`. Never create a Knex instance.

Every migration, query, and repository function must work on **SQLite, PostgreSQL, and MySQL**. Use the Knex schema builder and query builder. Avoid raw SQL unless it branches on `GetDbType()` from `tool.ts` or is guarded with `try/catch`. Check that `defaultTo()` and `notNullable()` behave on all three engines.

Migrations are named `YYYYMMDDHHMMSS_snake_case.ts` and guard with `hasTable` / `hasColumn` so they can run twice. From `migrations/20260613120000_add_confirmation_threshold_and_raw_status.ts`:

```ts
export async function up(knex: Knex): Promise<void> {
    if (!(await knex.schema.hasColumn("monitors", "confirmation_threshold"))) {
        await knex.schema.alterTable("monitors", (table) => {
            table.integer("confirmation_threshold").unsigned().notNullable().defaultTo(1)
        })
    }
}
```
