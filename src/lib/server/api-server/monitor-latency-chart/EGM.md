# monitor-latency-chart

## Overview

This folder serves `GET /dashboard-apis/monitor-latency-chart`. The handler returns a monitor's latency for a fixed time range, averaged into time buckets for a chart. It keeps each range under about 60 points.

## Interface

- `get.ts` exports the default handler `get(req: APIServerRequest)`. The handler reads the query parameters `tag` and `range` (default `24h`). It also reads `localTz` (default `UTC`) but does not use it.
- The handler returns `{ data, range, rangeLabel, avgInterval, periodStart, periodEnd }` with status 200. Each `data` entry has `timestamp`, `avgLatency`, `minLatency`, and `maxLatency`. A bucket with no valid latency has `null` in all three latency fields.
- `get.ts` keeps the private list `TIME_RANGES`. It accepts the `range` values `1h`, `3h`, `6h`, `12h`, `24h`, `48h`, `7d`, `14d`, and `30d`, and each value sets the bucket size in minutes (`avgInterval`).

## Invariants

- The handler returns 400 when `tag` is missing, 404 when no monitor matches, and 400 `Invalid range parameter` when `range` is not in `TIME_RANGES` (`get.ts:40-55`). It checks the monitor before the range.
- The handler shows a hidden monitor (`is_hidden` = `YES`) only when `CanSeeHiddenMonitors` returns true. That function needs a logged-in user who has the `monitors.read` permission. The handler always filters on `status: ACTIVE` (`get.ts:44-45`).
- The window ends at the start of the current UTC minute and starts `minutes * 60` seconds earlier. All timestamps are Unix seconds.
- Each bucket's `timestamp` is the middle of the bucket, not its start (`get.ts:96`).
- The handler ignores rows whose latency is null, undefined, or 0, and it rounds `avgLatency` to a whole number.

## Side Effects

- The handler reads the session through `GetLoggedInSession` and `CanSeeHiddenMonitors` from `src/lib/server/controllers/userController.ts`.
- The handler reads `db.getMonitors` and `db.getMonitoringData(tag, start, now)`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test imports `get.ts`. No test file sits in this folder.
- The handler reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
