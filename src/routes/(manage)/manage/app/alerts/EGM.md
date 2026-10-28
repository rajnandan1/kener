# Alerts List Page

## Overview

This route serves `/manage/app/alerts`. It lists the alert configs and links to their editor and their logs. An alert config is a rule in `monitor_alerts_config` that says when its monitors raise an alert and which triggers send it. The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getAlertConfigsPaginated` (permission `alerts.read`) with `page`, `limit`, and `monitor_tag`.
- The page sends `getMonitors` (permission `monitors.read`) to fill the monitor filter and the link labels.
- The Active switch sends `toggleMonitorAlertConfigStatus` (permission `alerts.write`) with `id`.
- The table shows the monitors, the alert type, the severity, the description, the triggers, and the Active switch.
- The page links to `/manage/app/alerts/new`, `/manage/app/alerts/{id}`, `/manage/app/alerts/logs/{id}`, and `/manage/app/monitors/{tag}`.
- [[alert_config_id]](<./[alert_config_id]/EGM.md>): the alert config editor. The value `new` opens create mode.
- [logs](./logs/EGM.md): the alert log route of one alert config.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `alerts.read` open this route.
- The page size is 20, and the server does the paging.
- The default monitor filter is all monitors, which sends no `monitor_tag`. A change of filter goes back to page 1.
- The page dims a row whose `is_active` is `NO`.
- A failed load only logs to the console. The page shows no error.

## Side Effects

- `toggleMonitorAlertConfigStatus` switches the `is_active` value of one `monitor_alerts_config` row. The page then loads the list again.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
