# Monitoring Data Page

## Overview

This route serves `/manage/app/monitoring-data`. It lists and deletes monitoring data: the check results in the `monitoring_data` table, one row per monitor per check time. The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getMonitors` (permission `monitors.read`) to fill the monitor filter.
- The page sends `getMonitoringDataPaginated` (permission `monitors.read`) with `page`, `limit` 50, `monitor_tag`, `status`, `start_time`, and `end_time`. It reads `data` and `total` from the result.
- Delete sends `deleteMonitorData` (permission `monitors.write`) with `tag`, `status`, `start`, and `end` from the current filter.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `monitors.read` open this route.
- Timestamps are Unix seconds. The default range is the last 24 hours.
- The range can be at most 30 days. When the start is after the end, the page sets the start to the end.
- The status filter is `ALL` or a value that `isMonitoringStatus` in `src/lib/global-constants.ts` accepts.
- The list request sends `ALL` as is. The delete request sends an empty `tag` and no `status` for `ALL`. The server handles both forms.
- Delete needs a confirmation in an alert dialog. The dialog names the monitors, the status, and the range.

## Side Effects

- `deleteMonitorData` permanently deletes the matching `monitoring_data` rows.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
