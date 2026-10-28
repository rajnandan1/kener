# Maintenance Page

## Overview

This route serves `/maintenances/{id}`. It shows one maintenance event: its time window, the maintenance description, the other scheduled events of the same maintenance, and the monitors it affects. The `(kener)` route group adds no URL segment. A maintenance is the plan, and a maintenance event is one scheduled time window of that plan.

## Interface

- `+page.server.ts` exports `load`. By default the path parameter is a `maintenances_events` id. With `?type=maintenance`, it is a `maintenances` id.
- `load` returns `{ maintenance, maintenanceEvent, affectedMonitors }`. `affectedMonitors` items have `monitor_tag`, `monitor_name`, `monitor_image`, and `monitor_impact`.
- `load` calls `GetMaintenanceEventById`, `GetMaintenanceWithEvents`, and `GetMaintenanceMonitors` from `src/lib/server/controllers/maintenanceController.ts`, and `db.getMonitorsByTags` from `src/lib/server/db/db.ts`.
- `GetMaintenanceWithEvents` returns up to 5 past events from the last 7 days, the events that are on now, and up to 10 events that start in the next 30 days.
- With `?type=maintenance`, `maintenanceEvent` is the first event in that list.
- `load` throws 400 `Invalid maintenance event ID` when the id is not a number. It throws 404 `Maintenance event not found` or `Maintenance not found` when a row is missing.
- The route has no form actions.
- `+page.svelte` shows the description as Markdown through `SveltePurify(mdToHTML(...))`. It marks the current event in the event list and scrolls to it on mount. It makes no fetch requests. `mdToHTML` is in `src/lib/marked.ts`.

## Invariants

- `load` removes hidden monitors with `canSeeHiddenMonitors || m.is_hidden !== "YES"`. `canSeeHiddenMonitors` comes from `parent()` (the layout data) and is true only for a signed-in user with the `monitors.read` permission.
- `load` must also cut `maintenance.monitors` down to the visible tags. Otherwise hidden monitor tags reach the browser in `data.maintenance`.
- The route checks visibility only on the monitor lists. It serves any maintenance or maintenance event by id, whatever its `status`.
- `monitor_impact` falls back to `""`, because the page calls `toLowerCase()` on it.
- The page treats a maintenance as one-time only when its `rrule` contains `COUNT=1`.

## Side Effects

- `load` reads the `maintenances_events`, `maintenances`, `maintenance_monitors`, and `monitors` tables. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test checks that this page hides hidden monitors. No test file is in this directory.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
