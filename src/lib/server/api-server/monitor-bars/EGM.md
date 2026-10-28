# monitor-bars

## Overview

This folder serves `GET /dashboard-apis/monitor-bars`. The handler returns the status bar data of many monitors in one request, so a status page does not need one `monitor-bar` call per monitor. It builds each entry with the builders in `../monitor-bar/shared.ts`.

## Interface

- `get.ts` exports the default handler `get(req: APIServerRequest)`. The handler reads the query parameters `tags` (comma-separated monitor tags), `days`, and `endOfDayTodayAtTz`.
- The handler returns `{ data, missingTags }` with status 200. `data` maps each visible tag to a `MonitorBarResponse` (the type from `../monitor-bar/get.ts`). `missingTags` lists each requested tag that has no visible active monitor.

## Invariants

- The handler clamps `days` to 1 through 90 (default 90). When `endOfDayTodayAtTz` is missing or invalid, it uses the start of the current UTC minute. All timestamps are Unix seconds, with one bucket per 86400 seconds.
- The handler returns 400 when `tags` is missing, when no tag remains after it trims, drops empty tags, and removes duplicates, or when more than `MAX_TAGS` (100) tags remain (`get.ts:37-56`).
- The handler shows hidden monitors (`is_hidden` = `YES`) only when `CanSeeHiddenMonitors` returns true. That function needs a logged-in user who has the `monitors.read` permission (`src/lib/server/controllers/userController.ts:677`). It always filters on `status: ACTIVE`.
- A hidden monitor appears in `missingTags` for a viewer who cannot see it. That viewer cannot tell a hidden monitor from a tag that does not exist.
- This visibility rule differs from `monitor-bar`, which hides hidden monitors from every viewer.
- The handler passes the latest monitoring row to the builder only for SSL monitors, after `AttachSslCacheFields`. A tag with no latest row gets the status `NO_DATA`.

## Side Effects

- The handler reads the session and the user's permissions through `GetLoggedInSession` and `CanSeeHiddenMonitors`.
- The handler reads `db.getMonitors`, `GetLatestMonitoringDataAllActive(tags)`, and `GetStatusCountsByIntervalGroupedByMonitor(tags, startTime, 86400, days)` from `src/lib/server/controllers/monitorsController.ts`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server/api-server/monitor-bars"`.
- `src/routes/(kener)/hidden-monitors.test.ts` also imports this handler.
- The handler reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
