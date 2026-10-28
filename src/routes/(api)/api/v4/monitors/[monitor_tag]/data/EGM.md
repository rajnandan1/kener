# Monitoring Data Range API (`/api/v4/monitors/{monitor_tag}/data`)

## Overview

This route reads and overwrites a time range of monitoring data for one monitor. Monitoring data is the per-minute status and latency that a monitor check records in the `monitoring_data` table. Before a handler runs, `src/hooks.server.ts` checks the Bearer API key and loads the monitor into `locals.monitor`, or returns a JSON 404.

## Interface

- `GET` takes the required query parameters `start_ts` and `end_ts` (UTC seconds). It calls `db.getMonitoringData` and returns `{ data }`, a list of points with `monitor_tag`, `timestamp`, `status`, `latency`, and `type`.
- `PATCH` takes a JSON body with `start_ts`, `end_ts`, `status`, and `latency` (all required), and `deviation` (optional, default 0). It calls `UpdateMonitoringData` from `$lib/server/controllers/monitorsController` with `type` `MANUAL`. It returns `{ message, updated_count }`.
- [[timestamp]](<./[timestamp]/EGM.md>): this child route reads and sets one minute of data.

## Invariants

- `start_ts` must be less than `end_ts`, or the handler returns 400. `GET` rounds both down to the start of their minute before it checks them.
- `status` must be `UP`, `DOWN`, or `DEGRADED`. `latency` and `deviation` must be non-negative numbers.
- The handler computes `updated_count` from the time range: it counts the whole minutes from `start_ts` up to, but not including, `end_ts`. It does not count the rows that the database changed.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `PATCH` writes one `monitoring_data` row for each minute from the start minute through the end minute, both included, through `db.updateMonitoringData` in one transaction. So the write covers one more minute than `updated_count` reports when `end_ts` falls on a minute start. It also covers one more minute when `start_ts` does not fall on a minute start, because the count rounds `start_ts` up and the write rounds it down. The two cases can add up to two extra minutes.
- `UpdateMonitoringData` then writes the latest row to the cache key `<monitor_tag>:last_status` with a TTL (time to live) of one day, through `SetLastMonitoringValue`.
- `UpdateMonitoringData` also pushes the monitor tag, the end minute, and the status to `alertingQueue`, so alert rules evaluate the manual data. A failed push is logged and does not fail the request.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
