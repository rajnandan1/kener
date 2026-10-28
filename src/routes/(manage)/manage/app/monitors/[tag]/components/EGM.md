# Monitor Editor Cards

## Overview

This folder holds the nine cards that the monitor editor page (`../+page.svelte`, served at `/manage/app/monitors/[tag]`) renders. Each card edits one part of a monitor and saves on its own. A card saves through the manage API: the `POST /manage/api` endpoint in `src/routes/(manage)/manage/api/+server.ts`. The request body names an action, and the endpoint checks the permission that `ACTION_PERMISSION_MAP` in `src/lib/allPerms.ts` gives that action.

## Interface

- `GeneralSettingsCard` takes the props `monitor` (bindable), `typeData`, and `isNew`. It edits the name, tag, description, external URL, image, cron, and grace period (`confirmation_threshold`). It sends `uploadImage` for the image and `storeMonitorData` to create or update the monitor.
- `MonitorTypeCard` takes the props `monitor` (bindable), `typeData` (bindable), `availableMonitors`, and `dockerDefaults`. It picks the monitor type from `MONITOR_TYPES` and renders the matching form from `../types/`. It sends `storeMonitorData` to save `type_data` and `testMonitor` to run one live check.
- `UptimeSettingsCard` takes the props `monitor`, `typeData`, and `uptimeSettings` (bindable). It edits the uptime formula numerator and denominator and sends `storeMonitorData`.
- `StatusHistoryDaysCard` takes the props `monitor` (bindable), `typeData`, and `statusHistoryDays` (bindable). It edits the desktop and mobile day counts and sends `storeMonitorData`.
- `MonitorSharingOptionsCard` takes the props `monitor` (bindable), `typeData`, and `subMenuOptions`. It turns the badge and embed sharing on or off and sends `storeMonitorData`.
- `PageVisibilityCard` takes the props `monitorTag`, `allPages`, and `onPagesUpdated`. It shows one checkbox per status page and sends `addMonitorToPage` or `removeMonitorFromPage`.
- `ModifyDataCard` takes the prop `monitorTag`. It sends `updateMonitoringData` to set the status and latency of each minute in a time range.
- `MonitorRecentLogs` takes the prop `monitor_tag`. It sends `getMonitoringDataPaginated` for the last 10 rows and links to `/manage/app/monitoring-data`.
- `DangerZoneCard` takes the props `monitor` and `status`. It sends `storeMonitorData` to set the status to `ACTIVE` or `INACTIVE`, `deleteMonitorData` to delete rows in a date range, and `deleteMonitor` to delete the monitor.

## Invariants

- Every `storeMonitorData` request sends the full monitor object, not a partial patch. Most cards send `type_data` as `JSON.stringify(typeData)`.
- `UptimeSettingsCard` writes `monitor_settings_json` as only the two formula keys. A save from this card drops `sharing_options` and `monitor_status_history_days` from the stored JSON. `StatusHistoryDaysCard` and `MonitorSharingOptionsCard` parse the stored JSON and merge their own key into it.
- The server does not merge `monitor_settings_json`, so the card that saves last decides the whole value.
- On create, `GeneralSettingsCard` sets the default formulas `up + maintenance` and `up + maintenance + down + degraded`.
- The tag input is disabled unless `isNew` is true. A saved monitor keeps its tag.
- `GeneralSettingsCard` clamps the grace period to 1 through 60. It accepts PNG, JPEG, SVG, and WebP images up to `GC.MAX_UPLOAD_BYTES`. It sends `uploadImage` with `maxWidth` 128 and `maxHeight` 128, which override the manage API default of 256.
- `MonitorTypeCard` checks the required fields of each type and disables Save when they fail. For example, a `GROUP` monitor needs at least 2 members. `saveTypeSettings` does not check them again.
- A change of monitor type resets `typeData` to `{}`, or to `createDefaultGroupTypeData()` for `GROUP`.
- `testMonitor` does nothing for an unsaved monitor (no `id`) or for the type `NONE`.
- `UptimeSettingsCard` accepts only formulas made of `up`, `down`, `degraded`, and `maintenance` joined by `+`, `-`, `*`, or `/`.
- `StatusHistoryDaysCard` accepts only whole numbers from `GC.STATUS_HISTORY_DAYS_MIN` to `GC.STATUS_HISTORY_DAYS_MAX`.
- `DangerZoneCard` deletes data only after the user types `delete {tag} data`. It deletes the monitor only after the user types `delete {tag}`.
- `ModifyDataCard` needs a start before the end, and a latency and deviation of 0 or more.
- No card checks the user's permissions in the browser. The manage API enforces them.

## Side Effects

- `storeMonitorData` writes the `monitors` row. `deleteMonitor` deletes the monitor, and the card then calls `goto("/manage/app/monitors")`.
- `deleteMonitorData` permanently deletes `monitoring_data` rows for the tag between two Unix-second timestamps.
- `updateMonitoringData` upserts one `monitoring_data` row for each minute from the start to the end, so it also creates rows where none existed. Each row gets a random latency from `latency - deviation` to `latency + deviation`, never below 0. The server does not store the deviation.
- After that write, `updateMonitoringData` rewrites the `{tag}:last_status` cache entry through `SetLastMonitoringValue` in `src/lib/server/cache/setGet.ts`. It also pushes an alert evaluation onto `alertingQueue` in `src/lib/server/queues/alertingQueue.ts`.
- After a create, `GeneralSettingsCard` calls `goto("/manage/app/monitors/{tag}")`.
- `uploadImage` sends the file as base64 and stores the returned URL in `monitor.image`.
- `testMonitor` makes the server run one real check against the monitor's target. The card sends only `monitor_id`, so the server tests the saved `type_data`, not unsaved edits in the form.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
