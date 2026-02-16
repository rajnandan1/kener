---
title: Architecture
description: Technical architecture overview of Kener — how the server, schedulers, queues, database, and build system fit together
---

Kener is a SvelteKit application powered by an Express server, background schedulers, and BullMQ queues. In production, everything runs as a single Node.js process.

## High-Level Overview {#high-level-overview}

```
┌─────────────────────────────────────────────────────────┐
│                    Node.js Process                      │
│                                                         │
│  ┌───────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Express   │───▶│   SvelteKit  │    │  Schedulers  │  │
│  │  Server    │    │   Handler    │    │  (BullMQ)    │  │
│  └───────────┘    └──────────────┘    └──────┬───────┘  │
│                                              │          │
│                                       ┌──────▼───────┐  │
│                                       │    Queues    │  │
│                                       │   (BullMQ)   │  │
│                                       └──────┬───────┘  │
│                                              │          │
│  ┌──────────────────────────────────────────▼────────┐  │
│  │                  Database (Knex.js)                │  │
│  │          SQLite │ PostgreSQL │ MySQL               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Redis (BullMQ backend)               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

The Express server handles HTTP requests and delegates to SvelteKit for all page rendering and API routes. Background schedulers poll monitors on a cron schedule and push results through a pipeline of queues for processing, storage, and alerting.

## Production Entry Point {#production-entry-point}

The production server is defined in `scripts/main.ts` and bundled into `build/main.js` at build time. On startup it:

1. Creates an Express app
2. Mounts a `/healthcheck` endpoint
3. Mounts the SvelteKit handler for all other routes
4. Listens on `PORT` (default 3000)
5. Runs database migrations and seeds
6. Starts the background schedulers via `Startup()`
7. Registers graceful shutdown handlers for `SIGTERM` and `SIGINT`

## Development vs Production {#dev-vs-prod}

| Aspect          | Development                      | Production                                     |
| :-------------- | :------------------------------- | :--------------------------------------------- |
| SvelteKit       | `vite dev` with HMR              | Pre-built `build/handler.js` served by Express |
| Background jobs | Separate process via `vite-node` | Same process, bundled into `build/main.js`     |
| TypeScript      | JIT compiled                     | Pre-compiled to JavaScript by esbuild          |
| Start command   | `npm run dev`                    | `npm start` → `node build/main.js`             |

## Route Groups {#route-groups}

SvelteKit routes are organized into groups under `src/routes/`:

| Route Group  | Purpose                             | Example Routes                                     |
| :----------- | :---------------------------------- | :------------------------------------------------- |
| `(kener)/`   | Public status pages                 | `/`, `/[page_path]`, `/badge/`, `/incidents/`      |
| `(manage)/`  | Admin dashboard (authenticated)     | `/manage/app/monitors/`, `/manage/app/incidents/`  |
| `(api)/`     | REST API for external consumers     | `/api/monitors/`, `/api/incidents/`, `/api/pages/` |
| `(embed)/`   | Embeddable status widgets           | `/embed/monitor-[tag]/`, `/embed/latency-[tag]/`   |
| `(docs)/`    | Documentation site (Markdown-based) | `/docs/`, `/docs/monitors/api`                     |
| `(account)/` | Authentication pages                | `/account/signin/`, `/account/logout/`             |
| `(assets)/`  | Uploaded asset serving              | `/assets/images/`                                  |

## Server Architecture {#server-architecture}

### Services {#services}

Monitor execution logic lives in `src/lib/server/services/`. Each monitor type has a dedicated service class:

| Service            | Monitor Type | Description                         |
| :----------------- | :----------- | :---------------------------------- |
| `apiCall.ts`       | API          | HTTP/HTTPS endpoint monitoring      |
| `pingCall.ts`      | PING         | ICMP ping checks                    |
| `tcpCall.ts`       | TCP          | TCP port connectivity               |
| `dnsCall.ts`       | DNS          | DNS record resolution               |
| `sslCall.ts`       | SSL          | SSL certificate validity/expiry     |
| `sqlCall.ts`       | SQL          | Database query monitoring           |
| `heartbeatCall.ts` | HEARTBEAT    | Passive push-based monitoring       |
| `gamedigCall.ts`   | GAMEDIG      | Game server monitoring              |
| `groupCall.ts`     | GROUP        | Aggregates status of child monitors |

The `service.ts` factory dispatches to the correct implementation based on the monitor's `monitor_type` field.

### Schedulers {#schedulers}

Schedulers live in `src/lib/server/schedulers/` and use BullMQ repeatable jobs:

| Scheduler                 | Interval         | Responsibility                                                                                                |
| :------------------------ | :--------------- | :------------------------------------------------------------------------------------------------------------ |
| `appScheduler.ts`         | Every 10 seconds | Orchestrates per-monitor schedulers — adds, removes, or updates them based on active monitors in the database |
| `monitorSchedulers.ts`    | Per-monitor cron | Triggers monitor execution using each monitor's configured cron expression                                    |
| `maintenanceScheduler.ts` | Every 60 seconds | Generates upcoming maintenance events from RRULE patterns for the next 7 days                                 |

### Queues {#queues}

Queues live in `src/lib/server/queues/` and form a processing pipeline backed by Redis via BullMQ:

```
Scheduler (cron trigger)
    │
    ▼
monitorExecuteQueue ─── Runs the monitor service (API, Ping, etc.)
    │
    ▼
monitorResponseQueue ── Stores results in DB, updates cache
    │
    ▼
alertingQueue ────────── Evaluates alert rules, creates/resolves incidents
    │
    ▼
subscriberQueue ──────── Fans out notifications to subscribers
    │
    ▼
emailQueue ───────────── Sends individual emails
```

Each queue has configurable retries (3 attempts with exponential backoff) and deduplication to prevent duplicate processing.

### Middleware {#middleware}

The SvelteKit `handle` hook in `src/hooks.server.ts` runs on every request and provides:

1. **API authentication** — validates Bearer tokens on all `/api/*` routes (except public endpoints)
2. **Resource loading** — fetches monitors, incidents, maintenances, or pages from the database and attaches them to `event.locals` for downstream handlers
3. **Search index** — initializes the documentation full-text search index on startup

## Database Layer {#database-layer}

Kener uses **Knex.js** as a query builder with support for three database backends:

| Database   | Connection Prefix | Driver           |
| :--------- | :---------------- | :--------------- |
| SQLite     | `sqlite://`       | `better-sqlite3` |
| PostgreSQL | `postgresql://`   | `pg`             |
| MySQL      | `mysql://`        | `mysql2`         |

### Repository Pattern {#repository-pattern}

The database layer follows a repository pattern:

- **`src/lib/server/db/repositories/`** — domain-specific repository classes (monitors, incidents, alerts, users, etc.)
- **`src/lib/server/db/dbimpl.ts`** — facade that composes all repositories and exposes their methods through a single interface
- **`src/lib/server/db/db.ts`** — exports a singleton `DbImpl` instance used throughout the application

All database access goes through the singleton: `import db from "$lib/server/db/db"`.

### Migrations {#migrations}

Migrations are stored in `migrations/` and run automatically on startup via `db.migrate.latest()`. They cover schema changes for monitors, incidents, subscriptions, maintenances, alerting, and more.

## Build System {#build-system}

The build process has two stages:

### Stage 1: SvelteKit Build {#sveltekit-build}

`vite build` compiles the SvelteKit application into `build/`:

- `build/handler.js` — the SvelteKit request handler
- `build/server/` — SSR chunks
- `build/client/` — static assets

### Stage 2: Server Build {#server-build}

`node scripts/build-server.js` uses **esbuild** to bundle `main.ts` and all its server dependencies into `build/main.js`:

- Bundles all project TypeScript into a single ESM file
- Externalizes `node_modules` (resolved at runtime) except CJS packages that need ESM conversion
- Resolves the `$lib` path alias so SvelteKit imports work outside the Vite context
- Injects the package version at build time

### Build Commands {#build-commands}

| Command                   | What It Does                                 |
| :------------------------ | :------------------------------------------- |
| `npm run build`           | Full production build (SvelteKit + server)   |
| `npm run build:sveltekit` | SvelteKit build only                         |
| `npm run build:server`    | Server build only                            |
| `npm start`               | Run production server (`node build/main.js`) |

## Graceful Shutdown {#graceful-shutdown}

When the process receives `SIGTERM` or `SIGINT`, the shutdown handler:

1. Stops all schedulers (app, monitor, maintenance)
2. Drains and closes all queues (execute, response, alerting, subscriber, email)
3. Closes the database connection
4. Exits the process

This ensures in-flight jobs complete and no data is lost during deployments or restarts.

## Next Steps {#next-steps}

- [Environment Variables](/docs/setup/environment-variables) — required and optional configuration
- [Database Setup](/docs/setup/database-setup) — choosing and configuring your database
- [Redis Setup](/docs/setup/redis-setup) — configuring Redis for BullMQ queues
- [Monitors](/docs/monitors/overview) — understanding monitor types and configuration
