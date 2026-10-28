# server

## Overview

This folder holds all of Kener's server-only code. SvelteKit keeps `$lib/server` out of the browser bundle, so only server files can import it. The child folders hold the main systems: the database layer, the business layer, the monitor checks, the BullMQ job pipeline, the schedulers, and the message senders. The files directly in this folder hold shared helpers: the scheduler start, the per-minute monitor job, the Redis clients, the network probes, and time and secret utilities.

## Interface

- `startup.ts` default-exports `Startup()`. It installs the env proxy, logs the secret key warning when there is one, and starts the app, maintenance, and daily cleanup schedulers. `scripts/main.ts` calls it.
- `cron-minute.ts` exports `Minuter(monitor)`. The monitor scheduler calls it on each cron tick. It pushes one job to `monitorExecuteQueue` for the start of the current minute.
- `redisConnector.ts` exports `redisIOConnection()` and `redisConnection()`. Each returns its own ioredis client, created on first use.
- `tool.ts` exports the shared helpers. Time helpers include `GetNowTimestampUTC`, `GetMinuteStartNowTimestampUTC`, `GetMinuteStartTimestampUTC`, `GetDayStartTimestampUTC`, `BeginningOfDay`, and `GetNowTimestampUTCInMs`. Secret helpers include `GetRequiredSecrets`, `ReplaceAllOccurrences`, and `ApplySecretsToHeaders`. The secret masking in `controllers/` uses `MaskString`, `IsMaskedString`, `MASKED_SECRET` (the string `"********"`), and `MatchStoredHeaders`. It also exports `UptimeCalculator`, `ParseUptime`, `HashString`, `GetDbType`, `parseDbTimestamp`, and validators such as `IsValidURL` and `ValidateEmail`.
- `ping.ts` exports `TCP(type, host, port, timeout)`, `Ping(type, host, timeout, count)`, and `ExtractIPv6HostAndPort`. `dns.ts` default-exports the class `DNSResolver` for UDP and DNS-over-TLS queries. `docker.ts` is a small Docker Engine API client: `resolveConnection`, `pingDaemon`, `inspectContainer`, `listContainers`, `containerDisplayName`, and `DockerError`. Its `getDockerDefaults()` reads the `DOCKER_HOST` defaults once per process.
- `proxy.ts` exports `InstallEnvProxy()`, which routes global `fetch` and the Node agents through `HTTP_PROXY` or `HTTPS_PROXY`, and `AxiosProxyConfig(proxy, agent, tls)` for one axios request.
- `resolver.ts` default-exports `serverResolve(path, params?)`, which fills `[param]` route segments and adds `KENER_BASE_PATH` to a route path.
- `rss.ts` exports `buildRssFeed` and `renderRssFeedResponse`, which build the RSS 2.0 feed of incidents and maintenances.
- `pageSettings.ts` exports `getDefaultPageSettings`, `mergePageSettings`, `toApiPageSettings`, `applyPageSettingsPatch`, and `validatePageSettings`, which convert a page's stored settings to and from the API shape.
- `i18n.ts` exports `translate(locale, key, defaultLocale?)` and `isLocaleAvailable(locale)` for server-side strings. `docs-search.ts` exports `searchDocs`, `loadSearchIndex`, `ensureSearchIndex`, and `getIndexedDocuments` for the docs site search.
- Child folders:
    - [api-server](./api-server/EGM.md) serves the `/dashboard-apis/<action>` JSON handlers for the status page.
    - [cache](./cache/EGM.md) keeps each monitor's last value and last heartbeat in Redis.
    - [controllers](./controllers/EGM.md) is the business layer between routes and `db`: checks, auth, secret masking, and site settings.
    - [db](./db/EGM.md) gives the `db` object over the Knex repositories, the web and worker pools, and the seed data.
    - [notification](./notification/EGM.md) sends email (Resend or SMTP) and Discord, Slack, and webhook posts.
    - [queues](./queues/EGM.md) runs the BullMQ pipeline from check to saved row to alert, and the subscriber emails.
    - [schedulers](./schedulers/EGM.md) runs the recurring BullMQ job schedulers.
    - [services](./services/EGM.md) runs one check class per monitor type.
    - [templates](./templates/EGM.md) holds the default alert templates and the general email templates.
    - [types](./types/EGM.md) holds the server-only TypeScript types.

## Invariants

- Client code must never import from this folder. Shared client and server types live in `src/lib/types/`.
- `startup.ts` sets `process.env.TZ = "UTC"` when it loads. The minute and day helpers in `tool.ts` use local time getters, so they return true UTC boundaries only while `TZ` is `UTC`. `npm run test:server` also sets `TZ=UTC`.
- Event timestamps are Unix seconds. `GetNowTimestampUTCInMs` is the only helper in `tool.ts` that returns milliseconds.
- `Startup` must call `InstallEnvProxy` inside its body, not at module top level, so that `dotenv` has loaded the env first. `InstallEnvProxy` runs at most once per process. It throws when a proxy env var is set and Node is older than 24.14.0.
- `Minuter` throws for a monitor type that is not in `MONITOR_TYPES` (`src/lib/types/monitor.ts`). For a `GROUP` monitor, it delays the job by `executionDelay` milliseconds (default 1000), so the members finish their checks first.
- `GetRequiredSecrets` replaces `$NAME` with the value of the env var `NAME`, and it leaves unknown names unchanged. `ReplaceAllOccurrences` has no word boundary, so replacing `$API` also changes the start of `$API_KEY`.
- `ApplySecretsToHeaders` applies secrets to each header key and value, never to a JSON string of all headers. A secret that holds a quote would otherwise break the JSON.
- `serverResolve` leaves `http://` and `https://` URLs unchanged. It adds `KENER_BASE_PATH` and collapses repeated slashes for every other path.
- `redisIOConnection` and `redisConnection` throw when `REDIS_URL` is not set. They reconnect and resend the command only on `READONLY`, `LOADING`, and `MASTERDOWN` errors.
- `Ping` counts a host as up when the ping process cannot start (for example `EPERM` in a locked-down container) and the host name resolves through DNS.
- `i18n.ts` reads the locale files from `<cwd>/src/lib/locales`, so the process must start in the repo root or an image with the same layout.
- `renderRssFeedResponse` returns 404 when `siteURL` is not set, when the requested monitor is unknown, hidden, or inactive, or when the requested page path does not exist. It lists at most 50 items from the last 90 days, plus maintenances up to 90 days ahead.

## Side Effects

- `Startup` creates the BullMQ schedulers in Redis and logs a banner. `Minuter` adds one Redis job per call.
- `redisConnector.ts` opens up to two Redis connections. `docs-search.ts` reads its index from the Redis key `kener-docs:search:documents`.
- `ping.ts`, `dns.ts`, and `docker.ts` make network calls: TCP connects, ICMP ping through a child process, DNS queries (default nameserver `8.8.8.8`), and HTTP calls to the Docker daemon over a socket, TCP, or TLS.
- `proxy.ts` changes the global `fetch` and Node HTTP agents when a proxy env var is set.
- `rss.ts` reads site settings and the database.
- Env vars read here: `REDIS_URL`, `KENER_BASE_PATH`, `HTTP_PROXY`, `HTTPS_PROXY` (and their lowercase forms), `DOCKER_HOST`, `DOCKER_TLS_VERIFY`, `DOCKER_TLS`, and every `$NAME` that a template or monitor config uses. `cron-minute.ts`, `redisConnector.ts`, and `tool.ts` call `dotenv.config()` when they load.
- `i18n.ts` reads every locale JSON file from disk when it loads.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server"`. This runs the tests for this folder and all child folders.
- Code here that reads or writes the database must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
