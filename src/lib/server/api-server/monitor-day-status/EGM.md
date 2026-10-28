# monitor-day-status

## Overview

This folder serves `POST /dashboard-apis/monitor-day-status`. The status page calls it when a user opens one day of a monitor's status bar. The handler returns one status per minute for that day and the day's uptime.

## Interface

- `post.ts` exports the default handler `post(req: APIServerRequest)`. The handler reads `tag`, `startOfDayTodayAtTz`, and `nowAtTz` from the JSON body. It returns `{ minutes, uptime }` with status 200, 400 when `tag` is missing, or 404 when no monitor matches.
- Each `minutes` entry has a `timestamp` (Unix seconds) and a `status`. `uptime` is the string that `UptimeCalculator` returns.

## Invariants

- The JSDoc comment in `post.ts:26` names the URL `/dashboard-apis/monitor-uptime`. That name is wrong: the folder name sets the URL, so the real URL is `/dashboard-apis/monitor-day-status`.
- The handler returns 400 `tag is required` when `body.tag` is empty (`post.ts:32-34`).
- The handler parses `startOfDayTodayAtTz` with `parseInt` and does no NaN check. When the field is absent, it uses `BeginningOfDay()` with no time zone, so the default depends on the server's time zone.
- The handler rounds `nowAtTz` (or the current time) down to the start of its minute and adds 60 seconds to end the window. It emits one entry per 60 seconds from the start of the day, and a minute with no stored row gets `NO_DATA` (`post.ts:70-82`).
- The handler counts `UP`, `DOWN`, `DEGRADED`, and `MAINTENANCE` minutes and passes them to `UptimeCalculator` with the monitor's `uptime_formula_numerator` and `uptime_formula_denominator` settings.
- The handler shows a hidden monitor (`is_hidden` = `YES`) only when `CanSeeHiddenMonitors` returns true. That function needs a logged-in user who has the `monitors.read` permission. The handler always filters on `status: ACTIVE`.

## Side Effects

- The handler reads the session through `GetLoggedInSession` and `CanSeeHiddenMonitors` from `src/lib/server/controllers/userController.ts`.
- The handler reads monitors through `GetMonitorsParsed` and minute rows through `db.getMonitoringData(tag, start, end)`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test imports `post.ts`. No test file sits in this folder.
- The handler reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
