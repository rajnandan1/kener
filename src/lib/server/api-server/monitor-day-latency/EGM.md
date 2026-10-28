# monitor-day-latency

## Overview

This folder serves `POST /dashboard-apis/monitor-day-latency`. The status page calls it when a user opens one day of a monitor's status bar. The handler returns that day's latency points, reduced to about 100 points, and the day's average, maximum, and minimum latency.

## Interface

- `post.ts` exports the default handler `post(req: APIServerRequest)`. The handler reads `tag`, `startOfDayTodayAtTz`, and `nowAtTz` from the JSON body. It returns `{ minutes, avgLatency, maxLatency, minLatency }` with status 200, 400 when `tag` is missing, or 404 when no monitor matches.
- Each `minutes` entry has a `timestamp` (Unix seconds) and a raw `latency` number. The three stats are strings that `ParseLatency` from `src/lib/clientTools.ts` formats.
- `post.ts` keeps the private function `lttbDownsample(data, targetPoints)`. It implements LTTB (Largest-Triangle-Three-Buckets), a downsampling method that keeps the peaks and the first and last points.

## Invariants

- The handler returns 400 `tag is required` when `body.tag` is empty.
- The handler parses `startOfDayTodayAtTz` with `parseInt` and does no NaN check. When the field is absent, it uses `BeginningOfDay()` with no time zone, so the default depends on the server's time zone.
- The handler rounds `nowAtTz` (or the current time) down to the start of its minute and adds 60 seconds to end the window. All values are Unix seconds.
- The handler drops rows whose latency is null or 0 before it computes the points and the stats. With no valid row, `avgLatency`, `maxLatency`, and `minLatency` are `""`, because `ParseLatency` returns `""` for 0.
- The handler targets `min(100, validRows)` points. `lttbDownsample` returns the data unchanged when it has no more points than the target or when the target is below 3. LTTB needs ascending timestamps, and `db.getMonitoringData` orders by `timestamp asc`.
- The handler shows a hidden monitor (`is_hidden` = `YES`) only when `CanSeeHiddenMonitors` returns true. That function needs a logged-in user who has the `monitors.read` permission. The handler always filters on `status: ACTIVE`.

## Side Effects

- The handler reads the session through `GetLoggedInSession` and `CanSeeHiddenMonitors` from `src/lib/server/controllers/userController.ts`.
- The handler reads monitors through `GetMonitorsParsed` and rows through `db.getMonitoringData(tag, start, end)`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test imports `post.ts`. No test file sits in this folder.
- The handler reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
