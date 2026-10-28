# events-by-month

## Overview

This folder serves `POST /dashboard-apis/events-by-month`. The status page calls it to get the incidents and maintenance events in a time range, for example one month of the events calendar. The handler can limit the results to the monitors of one status page.

## Interface

- `post.ts` exports the default handler `post(req: APIServerRequest)`. The handler reads `start_ts` and `end_ts` (Unix seconds) from the JSON body and the optional `page_path` query parameter. It returns `{ incidents, maintenances }` with status 200.
- `post.ts` exports the type `EventsByMonthResponse`. Its `incidents` field holds `IncidentForMonitorListWithComments[]` and its `maintenances` field holds `MaintenanceEventsMonitorList[]`.

## Invariants

- The handler returns 400 when `start_ts` or `end_ts` is missing, is 0, or is not a JSON number (`post.ts:27-33`). It does not check that `start_ts` comes before `end_ts`.
- The handler treats an empty `page_path` and the strings `undefined` and `null` (any letter case) as "no page" (`post.ts:20-25`).
- When the site setting `globalPageVisibilitySettings.forceExclusivity` is on and the request has no page, the handler uses the home page (path `""`) (`post.ts:38-42`). Then the home page's monitors limit the results.
- With a page, the handler returns 404 `Page not found` when `db.getPageByPath` finds no page. It passes the page's active monitor tags to both queries (`post.ts:45-52`). Without a page, it passes `undefined`, and the queries return events for all monitors.
- With monitor tags, each query also returns every event whose `is_global` is `YES`, whatever the page's monitors are.
- Both queries match an event by its `start_date_time` only, so an event that started before `start_ts` is left out. The incident query also returns only incidents with `incident_type` = `INCIDENT` and `status` = `OPEN`.
- The handler does not read the session and does no permission check. The `/dashboard-apis/[action]` route adds no auth check either.

## Side Effects

- The handler reads site settings through `GetAllSiteData()` from `src/lib/server/controllers/siteDataController.ts`.
- The handler reads the database through `db.getPageByPath`, `db.getActivePageMonitors`, `db.getIncidentsForEventsByDateRange`, and `db.getMaintenanceEventsForEventsByDateRange`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this folder directly.
- The handler reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
