# monitor-bar

## Overview

This folder serves `GET /dashboard-apis/monitor-bar`. The handler returns the data for one monitor's status bar: one bucket of status counts per day, the uptime figure, latency stats, and the current status. `shared.ts` holds the response builders, which `monitor-bars` also uses, and `parseIntParam`, which the embed pages also use.

## Interface

- `get.ts` exports the default handler `get(req: APIServerRequest)`. The handler reads the query parameters `tag`, `days`, and `endOfDayTodayAtTz`. It returns a `MonitorBarResponse` with status 200, 400 when `tag` is missing, or 404 when no monitor matches.
- `get.ts` exports the types `BarData` (`status`, `timestamp`) and `MonitorBarResponse`. Client code and Svelte components import `MonitorBarResponse`, for example `src/lib/client/monitor-bar-client.ts`.
- `shared.ts` exports `parseIntParam(value, fallback)`. The function returns `fallback` unless the trimmed value is a whole integer (`^[+-]?\d+$`) that parses to a safe integer. The embed routes `src/routes/(embed)/embed/monitor-[tag]/+page.server.ts` and `latency-[tag]` also import it.
- `shared.ts` exports `buildMonitorBarResponse(monitor, days, endOfDayTodayAtTz, latestStatus?)`. The function reads the daily status counts and the latest monitoring data, then calls `buildMonitorBarResponseFromRawData`.
- `shared.ts` exports `buildMonitorBarResponseFromRawData(monitor, rawUptimeData, days, endOfDayTodayAtTz, latestStatus?, latestData?)`. The function runs `UptimeCalculator`, fills days that have no data with zero counts, and builds the `MonitorBarResponse`.

## Invariants

- The handler clamps `days` to 1 through 90 and uses 90 when the value is missing or invalid (`get.ts:46`).
- When `endOfDayTodayAtTz` is missing or invalid, the handler uses the start of the current UTC minute (`get.ts:48`). The client computes the end of its local day and sends it, so the server does no time zone math.
- The handler always queries with `status: ACTIVE` and `is_hidden: NO`, and it never reads the session (`get.ts:53`). A hidden monitor (one with `is_hidden` = `YES`) returns 404 for every viewer, also for a logged-in user. `src/routes/(kener)/hidden-monitors.test.ts` asserts this.
- All timestamps are Unix seconds. The builder computes `startTime = endOfDayTodayAtTz - days * 86400` and sets `toTimeStamp` to `endOfDayTodayAtTz - 1`.
- The builder matches each database bucket by the exact value `ts === startTime + i * 86400`. A bucket that does not line up with `startTime` gets replaced by a zero entry.
- `parseIntParam` rejects digit strings that are not safe integers, because `days` is a loop bound. It accepts negative values, so each caller must clamp the result.
- `shared.ts` imports `MonitorBarResponse` from `./get` as a type only. Keep it type-only: a value import would make a runtime import cycle with `get.ts`.
- The builder fills `sslExpiresAt`, `sslTrusted`, `issuerCn`, and `issuerO` only when `monitor_type` is `SSL`.

## Side Effects

- `get.ts` reads monitors through `db.getMonitors`.
- `shared.ts` reads `db.getStatusCountsByInterval(tag, startTime, 86400, days)` and `db.getLatestMonitoringData(tag)`. `buildMonitorBarResponse` skips `db.getLatestMonitoringData` when the caller passes `latestStatus` and the monitor is not `SSL`. For SSL monitors it calls `AttachSslCacheFields` from `src/lib/server/controllers/monitorsController.ts`.
- The folder writes nothing and makes no network calls.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test imports `get.ts`. No test file sits in this folder.
- The handler reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
