# notifications

## Overview

This folder serves `GET /dashboard-apis/notifications`. The status page calls it to fill its event list: ongoing and resolved incidents, and ongoing, past, and upcoming maintenance events for a set of monitors.

## Interface

- `get.ts` exports the default handler `get(req: APIServerRequest)`. The handler reads the query parameter `tags` (comma-separated monitor tags). It returns a `NotificationPayload` (the type from `src/lib/server/controllers/dashboardController.ts`) with status 200.

## Invariants

- The repository queries return every global event (an event with `is_global` = `YES`) plus the events linked to a requested tag. With no `tags`, only global events come back.
- The handler reads the site setting `eventDisplaySettings`. When the setting is missing, it uses `seedSiteData.eventDisplaySettings` from `src/lib/server/db/seedSiteData.ts`.
- The handler skips each of the five lists when its `enabled` or `show` flag is off. It passes `maxCount`, `daysInPast`, and `daysInFuture` from the setting to the list functions.
- The handler does not read the session. The repository queries match a tag only when its monitor has `is_hidden` = `NO`, so an event that is linked only to a hidden monitor does not appear for any viewer. `src/routes/(kener)/hidden-monitors.test.ts` asserts this.
- The handler uses the start of the current UTC minute (Unix seconds) as "now" for `BuildNotificationPayload`.

## Side Effects

- The handler reads `GetSiteDataByKey("eventDisplaySettings")` from `src/lib/server/controllers/siteDataController.ts`.
- The handler reads events through `GetOngoingIncidentsForMonitorList`, `GetResolvedIncidentsForMonitorList`, `GetOngoingMaintenanceEventsForMonitorList`, `GetPastMaintenanceEventsForMonitorList`, and `GetUpcomingMaintenanceEventsForMonitorList` from `dashboardController.ts`. It runs them in parallel and writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test imports `get.ts`. No test file sits in this folder.
- The handler reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
