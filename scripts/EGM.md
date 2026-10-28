# scripts

## Overview

This folder holds the two build steps, the production server entry point, a fixer for old migration records, the docs search indexer, and two tools for the locale files. No Vitest test covers these files.

## Interface

- `main.ts` is the production server. `build-server.js` bundles it into `build/main.js`. It works in this order:
    1. It loads `.env` and reads `PORT` (default `3000`) and `KENER_BASE_PATH` (default empty).
    2. It imports the SvelteKit handler from `build/handler.js` and serves it with Express, next to `GET <KENER_BASE_PATH>/healthcheck`.
    3. It starts to listen on `PORT`.
    4. In the listen callback, it renames old `.js` names in `knex_migrations` to `.ts`, runs `db.migrate.latest()`, runs `db.seed.run()`, and closes that Knex instance.
    5. It calls `Startup()` from `src/lib/server/startup.ts`, which starts the schedulers.
    6. On `SIGTERM` or `SIGINT`, it calls `shutdownSchedulers()` and `shutdownQueues()`, closes the database, and exits.
- `GET <KENER_BASE_PATH>/healthcheck` checks the database and Redis, each with a 2000 ms timeout. It returns HTTP 200 with `{ status: "ok" | "degraded", db, redis }`. With `?strict=1`, it returns HTTP 503 when a check fails.
- `build-sveltekit.js` is the first step of `npm run build`. It runs `npx vite build`. Without `--with-docs`, it first moves `src/routes/(docs)` to `.docs-excluded` and deletes `.svelte-kit`, and it moves the folder back after the build. `npm run build-with-docs` passes `--with-docs` and keeps the docs site.
- `build-server.js` is the second step of `npm run build`, and it is also `npm run build:server`. It uses esbuild to bundle `scripts/main.ts` into `build/main.js` for Node 20. It keeps every package external except `rrule`, maps `$lib` to `./src/lib`, and sets `import.meta.env.PACKAGE_VERSION` from `package.json`.
- `fix-migration-ext.ts` runs first in `npm run migrate`, and in the `preseed` hook that npm runs before `npm run seed`. It renames each `knex_migrations` row whose name ends in `.js` so that the name ends in `.ts`, because the migration files were renamed from `.js` to `.ts`.
- `index-docs.ts` runs as `npm run index-docs`. It reads `src/routes/(docs)/docs.json` and the Markdown pages of the latest docs version under `src/routes/(docs)/docs/content/`. It writes the docs search index to the Redis key `kener-docs:search:documents`. It needs `REDIS_URL`.
- `check-translations.js` runs as `node scripts/check-translations.js [--format json|yaml]`. It finds each literal `$t("...")` key in `src` and compares the keys with the `mappings` of each `src/lib/locales/*.json` file. It writes the missing and unused keys of each locale to `translation-report.json` (or `translation-report.yaml`).
- `sort-translations.js` runs as `node scripts/sort-translations.js`. It sorts the `mappings` keys of each `src/lib/locales/*.json` file. It rewrites a file only when the order changes.

## Invariants

- `npm run build` must run `build-sveltekit.js` before `build-server.js`. `build-server.js` turns each `../build/X` import into `./X`, so `build/main.js` expects `build/handler.js` in the same folder.
- `build-sveltekit.js` moves `src/routes/(docs)` back in a `finally` block, so a failed build still restores it. A hard kill during the build leaves the folder at `.docs-excluded`. Then you must move it back by hand before the next build.
- `main.ts` starts to listen before the migrations and seeds finish. So the first requests can reach a database that is not migrated yet.
- `main.ts` only logs a migration error or a seed error. It still calls `Startup()`.
- `main.ts` does the same `.js` to `.ts` rename as `fix-migration-ext.ts`, so production does not need `fix-migration-ext.ts`.
- `main.ts` imports `build/handler.js` dynamically, so that `BODY_SIZE_LIMIT` from `.env` is set before the handler module reads it.
- `fix-migration-ext.ts`, `index-docs.ts`, `check-translations.js`, and `sort-translations.js` exit with code 1 on an error.
- A new environment variable needs an entry in `src/routes/(docs)/docs/content/v4/setup/environment-variables.md`.

## Side Effects

- `build-sveltekit.js` renames `src/routes/(docs)` and back, deletes `.svelte-kit`, and writes the SvelteKit build to `build/`.
- `build-server.js` writes `build/main.js`.
- `main.ts` listens on `PORT`. It writes `knex_migrations`, runs the migrations and seeds, and starts the schedulers through `Startup()`. The health check pings the database and Redis.
- `fix-migration-ext.ts` updates rows in `knex_migrations`, through the connection that `knexfile.ts` sets up.
- `index-docs.ts` replaces the whole value of the Redis key `kener-docs:search:documents`.
- `check-translations.js` writes `translation-report.json` or `translation-report.yaml` at the repo root.
- `sort-translations.js` rewrites `src/lib/locales/*.json` in place.

## Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check). Its include list in `.svelte-kit/tsconfig.json` covers only `src/**`, so it does not type check this folder.
- Run `npm test` (the full suite). Vitest includes only `src/**` tests, so no test covers this folder directly.
- Run `npm run build` to exercise `build-sveltekit.js` and `build-server.js`. Then run `node build/main.js` and request `/healthcheck`.
- Run `node scripts/check-translations.js` after a change to a translation script.
- A change to the database steps in `main.ts` or `fix-migration-ext.ts` must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
