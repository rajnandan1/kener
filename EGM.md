# Kener Blueprint

## System Overview

Kener is a self-hosted status page. It checks monitors (the `MONITOR_TYPES` in `src/lib/types/monitor.ts`: HTTP APIs, ping, TCP, DNS, SSL, SQL, gRPC, Prometheus, Docker, game servers, heartbeats, groups, and `NONE`, which runs no checks), stores the results, opens incidents and sends alerts, and shows the status on public pages, badges, embeds, RSS feeds, and a REST API. Admins run it from the dashboard under `/manage`.

The app is one SvelteKit project in TypeScript and Svelte 5. It runs two kinds of work:

- The web server (`@sveltejs/adapter-node`) serves the status pages, the dashboard, and `/api/v4`.
- The scheduler runs in the same process in production (`scripts/main.ts`) and as `src/lib/server/startup.ts` next to `vite dev` in development. It puts monitor checks, alerting, and subscriber emails on BullMQ job queues in Redis.

Data lives in one database through Knex: SQLite by default, or PostgreSQL or MySQL. For setup and features, read `README.md` and the docs in `src/routes/(docs)/docs/content/v4/`. For agent rules, read `AGENTS.md` and `CODING_STANDARDS.md`.

## Local Interface & Invariants

- `knexfile.ts` default-exports `knexOb`, the Knex config (migrations in `./migrations`, seeds in `./seeds`). It also exports `workerKnexOb`, a copy with the worker pool for PostgreSQL and MySQL, which is `null` on SQLite.
- `knexfile.ts` reads `DATABASE_URL`, with the default `sqlite://./database/kener.sqlite.db`. The scheme `sqlite` selects `better-sqlite3`, `postgresql` selects `pg`, and `mysql` selects `mysql2`. Any other scheme, `postgres://` too, logs "Invalid database type" and calls `process.exit(1)`.
- `knexfile.ts` reads the pool settings `DATABASE_POOL_MIN` (default 0), `DATABASE_POOL_MAX` (default 10), `DATABASE_WORKER_POOL_MAX` (default 5), `DATABASE_IDLE_TIMEOUT_MS` (default 30000), `DATABASE_CREATE_TIMEOUT_MS` (default 15000), `DATABASE_ACQUIRE_TIMEOUT_MS` (default 15000), and `DATABASE_KEEPALIVE` (on unless the value is `false`). SQLite gets no pool and no worker pool, so web requests and background jobs share one connection.
- `vite.config.ts` sets the dev port from `PORT` (default 3000) and `server.allowedHosts` from the host of `ORIGIN`. It defines `__KENER_BUILD_ENV__` and `__KENER_IS_PROD__`.
- `vite.config.ts` declares two Vitest projects. `server` runs `src/**/*.{test,spec}.{js,ts}` in Node with `KENER_SECRET_KEY=kener-test-secret`. `client` runs `src/**/*.svelte.{test,spec}.{js,ts}` in headless Chromium in the UTC timezone with the setup file `vitest-setup-client.ts`.
- `vitest-setup-client.ts` mocks `$app/state` and `$app/paths` for every component test.
- `svelte.config.js` uses `@sveltejs/adapter-node`, sets `kit.paths.base` from `KENER_BASE_PATH`, and sets `kit.csrf.trustedOrigins` to `["*"]`. That setting turns off the SvelteKit CSRF check, so `csrfHandle` in `src/hooks.server.ts` is the only CSRF protection. It also sets `kit.output.bundleStrategy` to `'single'`, which puts the CSS of every route group into one file, so a route group stylesheet must scope its rules.
- `docker-entrypoint.sh` is the container entrypoint. It sets `BODY_SIZE_LIMIT` (default `3M`), indexes the docs into Redis with `scripts/index-docs.ts` when that file exists, and runs the container command with `exec "$@"`.
- `package.json` scripts: `npm run dev` migrates and seeds the database through its `predev` hook, which runs `npm run seed`. Then it runs the scheduler and `vite dev` in parallel. `npm run build` builds the app and the server, and `npm start` runs `node build/main.js`. `npm run migrate` runs `scripts/fix-migration-ext.ts` and the Knex migrations. `npm run seed` runs the same two steps in its `preseed` hook, then the Knex seeds.

## Subdirectories & System Boundaries

- [migrations](./migrations/EGM.md): 31 Knex migrations build the schema on SQLite, PostgreSQL, and MySQL. `npm run migrate` runs them in development, and `db.migrate.latest()` in `scripts/main.ts` runs them at every production start.
- [scripts](./scripts/EGM.md): The build steps (`build-sveltekit.js`, `build-server.js`), the production entry point `main.ts`, the `knex_migrations` file-extension fixer, the Redis docs search indexer, and the locale tools live here.
- [seeds](./seeds/EGM.md): Six Knex seeds insert the default email templates, monitors, pages, permissions, roles, and site data. `npm run seed` runs them, and `db.seed.run()` runs them at every production start.
- [src](./src/EGM.md): The SvelteKit app: the request hooks, the `$lib` code (with all server code in `src/lib/server/`), and the route tree.
- Folders with no code and no EGM contract: `static/` holds public files and API references, `docs/agents/` holds the agent guides, and `database/` holds the local SQLite file (ignored by git).

## Global Invariants

- Every database read, write, migration, and seed works on SQLite, PostgreSQL, and MySQL. `npm test` runs on in-memory SQLite only, so a database change must also pass on the other two engines, as the Database section of `CODING_STANDARDS.md` shows.
- A schema change needs a new migration. A shipped migration stays as it is. Each change is guarded with `hasTable` or `hasColumn` so the migration can run twice.
- A migration or seed imports only files that have no imports of their own, by a relative path that ends in `.ts`, because Knex runs them on plain Node.
- A new repository method needs a field and a `.bind` line in `src/lib/server/db/dbimpl.ts`. `npm run check` passes without the `.bind` line, and the call fails at run time.
- Browser code never imports `$lib/server`. Types that both sides use live in `src/lib/types/`.
- `src/lib/server/startup.ts` sets `process.env.TZ` to `UTC` when it loads. So `TZ` is `UTC` in the production process (`npm start`, which also serves the web pages) and in the development scheduler (`npm run devschedule`). The `vite dev` web server does not load `startup.ts` and keeps the machine time zone. The `Dockerfile` also sets `TZ=UTC`.
- `npm test`, `npm run test:server`, and `npm run test:watch` set `TZ=UTC` through `cross-env`. `npm run test:client` does not set `TZ`, and its component tests run in the UTC time zone through the Playwright `timezoneId` option in `vite.config.ts`.
- Event timestamps are Unix seconds.
- A monitor type with no branch in `src/lib/server/services/service.ts` falls through to `NoneCall`. It runs no checks and reports no error.
- Every route in the `(api)` route group needs a Bearer API key. `apiAuthHandle` in `src/hooks.server.ts` decides that from the matched route id.
- Ask the maintainer before you add a dependency, change the database schema or the `/api/v4` request and response shapes, or edit `.github/workflows/`, `Dockerfile`, or `docker-compose*.yml`.

## Global Side Effects

- The database: Knex opens a web pool and, on PostgreSQL and MySQL, a worker pool, from `DATABASE_URL`.
- Redis: the app connects through `REDIS_URL`. Redis holds the BullMQ queues, the monitor status cache (keys such as `kener:cache:<tag>:last_status`, built in `src/lib/server/cache/cache.ts` and `src/lib/server/cache/setGet.ts`), and the docs search index (`kener-docs:search:documents`, written by `scripts/index-docs.ts` and read by `src/lib/server/docs-search.ts`).
- Outbound network: monitor checks make HTTP, TCP, ICMP ping, DNS, SQL, gRPC, Prometheus, Docker daemon, and game server calls. Alerts and subscriber emails go out through Resend or SMTP, and through HTTP posts to Discord, Slack, and webhooks.
- Process environment: `src/lib/server/proxy.ts` changes the global `fetch` and the Node HTTP agents when `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`, or `https_proxy` is set. It throws at startup when one of them is set and Node has no `http.setGlobalProxyFromEnv` (Node older than 24.14.0). Several modules call `dotenv.config()` when they load, which reads `.env`. Examples are `knexfile.ts`, `scripts/main.ts`, and `src/lib/server/redisConnector.ts`.

## System Verification

- Run `npm run check` (svelte-kit sync and the svelte-check type check).
- Run `npm test` (both Vitest projects, with `TZ=UTC`).
- For a database change, also run the change on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
