# db

## Overview

This folder gives the server one database object, `db`. `db` merges every repository in `./repositories/` into one flat API, such as `db.getMonitors(...)` and `db.insertMonitoringData(...)`. It also splits queries between two connection pools: the web pool serves page loads, and the worker pool serves background jobs. The folder also holds the default data that seeds a new install.

## Interface

- `db.ts` builds one `DbImpl` from `knexOb` and `workerKnexOb` in the repo root file `knexfile.ts` and default-exports it. Code imports it as `import db from "$lib/server/db/db"`.
- `dbimpl.ts` default-exports the class `DbImpl`. It creates the 12 repositories and binds each repository method onto itself as a public field. It re-exports the repository filter types and every type from `src/lib/server/types/db.ts`.
- `DbImpl` adds its own methods: `runInWorkerContext(fn)` runs `fn` on the worker pool, `ping()` runs `select 1` and returns a boolean without throwing, and `close()` destroys both pools.
- `poolContext.ts` exports `runWithWorkerKnex(knex, fn)` and `getWorkerKnex()`. They wrap one `AsyncLocalStorage`, a Node.js store that follows one async call chain, so each query can find the pool of the job it runs in.
- `seedMonitorData.ts` default-exports two sample monitors: `earth` (type `NONE`) and `kener` (type `API`, which calls `https://kener.ing/healthcheck`). `seedPagesData.ts` default-exports the home page (`page_path` `""`, title `Home`). `seedSiteData.ts` default-exports the default site settings, such as `title`, `colors`, `eventDisplaySettings`, `dataRetentionPolicy`, and `subscriptionsSettings`.
- `repositories/` holds one Knex class per group of tables. See [repositories](./repositories/EGM.md).

## Invariants

- Import the `db` singleton. Do not construct a second `DbImpl`, because each instance opens its own pools.
- A new repository method appears on `db` only after two edits in `dbimpl.ts`: a typed field such as `name!: Repo["name"]`, and a `this.name = this.repo.name.bind(this.repo)` line in that repository's `bind*Methods()` function. The `!` marker hides a missing bind line from TypeScript, so a missing line leaves the field `undefined` at runtime.
- A new repository class also needs an import, a private field, a `new XRepository(this.knex)` line in the constructor, and a `bind*Methods()` call.
- A query uses the worker pool only inside `db.runInWorkerContext(fn)`. `createWorker` in `src/lib/server/queues/q.ts` wraps every job in it. Requests, startup, and migrations use the web pool.
- On SQLite, `workerKnexOb` is not set, so both pools are the same Knex instance.
- `knexfile.ts` reads the database type from the scheme of `DATABASE_URL` (default `sqlite://./database/kener.sqlite.db`). It sizes the pools from `DATABASE_POOL_MAX` (default 10) and `DATABASE_WORKER_POOL_MAX` (default 5).
- `seedMonitorData.ts` and `seedPagesData.ts` serve only the first seed, through `seeds/monitors.ts` and `seeds/pages.ts`.
- `seedSiteData.ts` also serves as the runtime default when a site setting is missing. `src/lib/server/controllers/layoutController.ts`, `maintenanceController.ts`, and `src/lib/server/api-server/notifications/get.ts` read it. `src/routes/(manage)/+layout.server.ts` sends it to the site configuration page as the default values. A change to its values therefore changes live defaults, not only new installs.

## Side Effects

- Importing `db.ts` creates the web pool. On PostgreSQL and MySQL it also creates the worker pool.
- Importing `db.ts` loads `knexfile.ts`, which reads the `DATABASE_*` env vars and logs `Configuring database with type ...`. When the `DATABASE_URL` scheme is not `sqlite`, `postgresql`, or `mysql`, it logs `Invalid database type` and calls `process.exit(1)`.
- `poolContext.ts` creates one `AsyncLocalStorage` when it loads and opens no connection.
- The seed files export constant data and do no I/O.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server/db"`. No test file sits directly in this folder, so this command runs the tests in `./repositories/`.
- Every change here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
- A change to the seed data must also pass `npm run seed` on all three databases.
