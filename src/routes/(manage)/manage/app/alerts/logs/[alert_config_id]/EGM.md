# Alert Log Page

## Overview

This route serves `/manage/app/alerts/logs/[alert_config_id]`. It lists the alerts that one alert config raised. An alert config is a rule in `monitor_alerts_config` that says when a monitor raises an alert. An alert is one raised event in `monitor_alerts_v2`, with the status `TRIGGERED` or `RESOLVED`. The page reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- `+page.server.ts` exports `load`, which returns `{ alert_config_id }` from the route param. It reads no data.
- The page sends `getMonitorAlertConfigById` (permission `alerts.read`) to show the alert config.
- The page sends `getAllAlertsPaginated` (permission `alerts.read`) with `page`, `limit`, `config_id`, and `status` to list the alerts. The status filter is `ALL`, `TRIGGERED`, or `RESOLVED`.
- The page sends `updateMonitorAlertV2Status` (permission `alerts.write`) with `id` and `status` to mark an alert as `TRIGGERED` or `RESOLVED`.
- The page sends `deleteMonitorAlertV2` (permission `alerts.write`) with `id`, `deleteIncident`, and `incident_id` to delete an alert.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `alerts.read` open this route.
- The page parses `alert_config_id` with `parseInt` before it sends it.
- A delete needs a confirmation in an alert dialog. When the alert has an `incident_id`, the dialog shows a "delete incident" checkbox, which is off by default.

## Side Effects

- `updateMonitorAlertV2Status` changes the status of one `monitor_alerts_v2` row.
- `deleteMonitorAlertV2` deletes one `monitor_alerts_v2` row. When `deleteIncident` is `true`, the server first deletes the linked incident.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
