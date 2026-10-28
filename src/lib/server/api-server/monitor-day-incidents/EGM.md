# monitor-day-incidents

## Overview

This folder serves `POST /dashboard-apis/monitor-day-incidents`. The status page calls it when a user opens one day of a monitor's status bar. The handler returns the incidents of that monitor from the start of the day until the end of the current minute.

## Interface

- `post.ts` exports the default handler `post(req: APIServerRequest)`. The handler reads `tag`, `startOfDayTodayAtTz`, and `nowAtTz` from the JSON body. It returns `{ incidents }` with status 200, 400 when `tag` is missing, or 404 when no monitor matches.

## Invariants

- The handler returns 400 `tag is required` when `body.tag` is empty (`post.ts:22-24`).
- The handler parses `startOfDayTodayAtTz` with `parseInt` and does no NaN check. When the field is absent, it uses `BeginningOfDay()` with no time zone, so the default depends on the server's time zone (`post.ts:26-28`).
- The handler rounds `nowAtTz` (or the current time) down to the start of its minute and adds 60 seconds, so the window includes the current minute (`post.ts:30-33`). All values are Unix seconds.
- The handler shows a hidden monitor (`is_hidden` = `YES`) only when `CanSeeHiddenMonitors` returns true. That function needs a logged-in user who has the `monitors.read` permission. The handler always filters on `status: ACTIVE` (`post.ts:35-40`).
- The repository drops hidden monitors from each incident's `monitors` list. So for a hidden monitor, the handler returns its incidents with an empty `monitors` list.

## Side Effects

- The handler reads the session through `GetLoggedInSession` and `CanSeeHiddenMonitors` from `src/lib/server/controllers/userController.ts`.
- The handler reads monitors through `GetMonitorsParsed` and incidents through `db.getIncidentsForEventsByDateRangeMonitor(start, end, tag)`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test imports `post.ts`. No test file sits in this folder.
- The handler reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
