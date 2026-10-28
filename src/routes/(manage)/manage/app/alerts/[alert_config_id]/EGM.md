# Alert Config Editor

## Overview

This route serves `/manage/app/alerts/[alert_config_id]`. It creates, edits, and deletes one alert config. An alert config is a rule in `monitor_alerts_config` that says when its monitors raise an alert and which triggers send it. A trigger is a saved notification destination (webhook, Discord, Slack, or email). The page reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- `+page.server.ts` exports `load`, which returns `{ alert_config_id }` from the route param. It reads no data.
- The param value `new` opens the editor in create mode.
- The page sends `getMonitors` (permission `monitors.read`) and `getTriggers` (permission `triggers.read`) to fill the pickers. The `getTriggers` request carries `status: GC.ACTIVE`, so the trigger picker lists only active triggers.
- In edit mode, the page sends `getMonitorAlertConfigById` (permission `alerts.read`) to load the alert config.
- Save sends `createMonitorAlertConfig` in create mode and `updateMonitorAlertConfig` in edit mode (permission `alerts.write`). The data has `monitor_tags`, `alert_for`, `alert_value`, `failure_threshold`, `success_threshold`, `alert_description`, `create_incident`, `severity`, and `trigger_ids`. Edit mode also sends `id` and `is_active`.
- Delete sends `deleteMonitorAlertConfig` (permission `alerts.write`) with `id`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `alerts.read` open this route.
- Save needs at least one monitor in `monitor_tags`. The server also rejects an empty list.
- `alert_for` is `STATUS`, `LATENCY`, or `UPTIME`. A change of `alert_for` resets `alert_value` to `DOWN`, `1000`, or `99`.
- For `STATUS`, `alert_value` is `DOWN` or `DEGRADED`. For `UPTIME`, the input allows 0 through 100.
- `severity` is `CRITICAL` or `WARNING`. `create_incident` and `is_active` are `YES` or `NO`.
- The create defaults are `alert_for` `STATUS`, `alert_value` `DOWN`, `failure_threshold` 3, `success_threshold` 1, `create_incident` `NO`, and `severity` `WARNING`.
- When the load fails, the page shows an error and goes back to `/manage/app/alerts`.

## Side Effects

- Create and update write `monitor_alerts_config` and its links to monitors and triggers.
- After a create, the page calls `goto("/manage/app/alerts/{id}")` with the new id.
- After a delete, the page calls `goto("/manage/app/alerts")`.
- Reads of an alert config return its triggers with their secrets masked (`MaskAlertConfigTriggerSecrets` in `src/lib/server/controllers/triggerController.ts`).

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
