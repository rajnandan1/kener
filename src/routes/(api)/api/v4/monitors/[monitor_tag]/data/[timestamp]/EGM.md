# Monitoring Data Point API (`/api/v4/monitors/{monitor_tag}/data/{timestamp}`)

## Overview

This route reads and sets one minute of monitoring data for one monitor. Monitoring data is the per-minute status and latency that a monitor check records in the `monitoring_data` table. Before a handler runs, `src/hooks.server.ts` checks the Bearer API key and loads the monitor into `locals.monitor`, or returns a JSON 404.

## Interface

- `GET` returns `{ data }` with `monitor_tag`, `timestamp`, `status`, `latency`, and `type`.
- `PATCH` takes a JSON body in which `status` and `latency` are both optional. It calls `UpdateMonitoringData` from `$lib/server/controllers/monitorsController` with `type` `MANUAL` and returns `{ data }`.

## Invariants

- `timestamp` is in UTC seconds. Each handler parses it with `parseInt`, rounds it down to the start of its minute, and returns 400 only when the result is `NaN`. `parseInt` reads the leading digits, so `1700000000abc` reads or writes minute 1699999980, and `1.7e9` reads or writes minute 0.
- `GET` returns 404 when no row exists for that minute.
- `status` must be `UP`, `DOWN`, or `DEGRADED`, and `latency` must be a non-negative number. Any other value returns 400.
- A `PATCH` body without `status` keeps the stored status. With no stored row, it uses the monitor `default_status`, and then `UP`.
- A `PATCH` body without `latency` keeps the stored latency, or saves 0.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `PATCH` writes the row for that minute in `monitoring_data` through `db.updateMonitoringData`.
- `UpdateMonitoringData` then writes the latest row to the cache key `<monitor_tag>:last_status` with a TTL (time to live) of one day, through `SetLastMonitoringValue`.
- `UpdateMonitoringData` also pushes the monitor tag, the minute, and the status to `alertingQueue`, so alert rules evaluate the manual data. A failed push is logged and does not fail the request.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
