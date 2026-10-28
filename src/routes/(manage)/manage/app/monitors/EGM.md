# Monitors List Page

## Overview

This route serves `/manage/app/monitors`. It lists the monitors, turns a monitor on or off, hides or shows it, and links to the monitor editor. A monitor is a scheduled check in the `monitors` table, keyed by its unique `tag`. The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getMonitors` (permission `monitors.read`) with an optional `status` and a trimmed `search`.
- The two switches on each row send `storeMonitorData` (permission `monitors.write`) with the full monitor and one changed field: `status` or `is_hidden`.
- The table shows the monitor, the tag, the type, the status, the visibility, and the cron.
- The page links to `/manage/app/monitors/new` and `/manage/app/monitors/{tag}`.
- [[tag]](<./[tag]/EGM.md>): the monitor editor. The value `new` opens create mode.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `monitors.read` open this route.
- `canWrite` is true only when `page.data.userPermissions` includes `monitors.write`. Without it, the switches are disabled. The manage API enforces the permission in any case.
- The status switch writes `ACTIVE` or `INACTIVE`. This page treats a missing status as `INACTIVE`.
- The Visible switch is inverted: on writes `is_hidden` `NO`, and off writes `YES`.
- The page loads every matching monitor and pages them in the browser, 10 per page.
- Each switch allows one save at a time.

## Side Effects

- A switch writes the whole `monitors` row with one changed field. The page changes the row first and rolls it back on an error.
- The row comes from `getMonitors` with its `type_data` secrets masked, and the switch sends it back as is. `CreateUpdateMonitor` in `src/lib/server/controllers/monitorsController.ts` restores the stored secrets before the write.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
