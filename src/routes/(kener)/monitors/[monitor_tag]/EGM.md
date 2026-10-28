# Monitor Page

## Overview

This route serves `/monitors/{monitor_tag}`. It shows one monitor: its name, description, last status and latency, SSL certificate details for an SSL monitor, its status history, and its current events. The `(kener)` route group adds no URL segment.

## Interface

- `+page.server.ts` exports `load`. It calls `GetMonitorsParsed({ tag, status: "ACTIVE", is_hidden })` from `src/lib/server/controllers/monitorsController.ts`. `is_hidden` is `"NO"` unless `canSeeHiddenMonitors` from `parent()` is true.
- `load` throws 404 `Monitor not found` when no monitor matches. A hidden or inactive monitor gets the same 404.
- `load` returns the monitor fields (`monitorTag`, `monitorName`, `monitorDescription`, `monitorType`, and more), the last status from `db.getLatestMonitoringData(tag)`, the SSL fields from `AttachSslCacheFields` in `src/lib/server/controllers/monitorsController.ts` for an SSL monitor, `ongoingIncidents`, `ongoingMaintenances`, `upcomingMaintenances`, `extendedTags`, `monitorGroupMembersByTag`, `maxDays`, and `monitorSharingOptions`.
- `load` loads inline incidents and maintenance events only when `eventDisplaySettings.showInlineEvents` is true and the matching `enabled` and `show` flags are true. Upcoming maintenance events use `maxCount` and `daysInFuture` from the same settings.
- For a `GROUP` monitor, `extendedTags` holds the member tags. `monitorGroupMembersByTag` maps each member that is also a group to its own member tags.
- `maxDays` comes from `monitor_settings_json.monitor_status_history_days` (`mobile` or `desktop`, chosen by `isMobile`). The fallback is `GC.DEFAULT_STATUS_HISTORY_DAYS_MOBILE` or `GC.DEFAULT_STATUS_HISTORY_DAYS_DESKTOP`.
- The route has no form actions.
- `+page.svelte` renders `ThemePlus`, `MonitorOverview`, `IncidentItem`, and `MaintenanceItem`, which are the matching `.svelte` files in `src/lib/components/`. `MonitorOverview` loads the status bar in the browser through `requestMonitorBar` in `src/lib/client/monitor-bar-client.ts` (`GET /dashboard-apis/monitor-bars`).
- Child route: [rss.xml](./rss.xml/EGM.md) serves the RSS feed `/monitors/{monitor_tag}/rss.xml`.

## Invariants

- `canSeeHiddenMonitors` is true only for a signed-in user with the `monitors.read` permission. `load` must use it in every monitor lookup.
- A missing, hidden, or inactive monitor gets the same 404. `load` takes `monitors[0]`, so it depends on unique monitor tags.
- `extendedTags` holds every member tag from the group `type_data`, with no hidden or inactive filter. `GET /dashboard-apis/monitor-bars` removes inactive members, and it removes hidden members unless the user can see hidden monitors.
- The inline incident and maintenance queries always skip events whose only monitors are hidden, also for a user who can see hidden monitors. Events with `is_global = "YES"` always show.
- `monitorSharingOptions.showShareBadgeMonitor` and `showShareEmbedMonitor` default to `true` when the monitor settings do not set them.
- The page calls `trackEvent` from `src/lib/beacon.ts` for `monitor_description_toggled` and `monitor_external_link_clicked`. `trackEvent` only sends a DOM `analyticsEvent` with the name prefix `kener_`.

## Side Effects

- `load` reads the `monitors` and `monitoring_data` tables, and the incident and maintenance tables when inline events are on. It writes nothing.
- For an SSL monitor, `load` reads the Redis key `kener:cache:<tag>:last_status` and does not write it.
- The browser sends `GET /dashboard-apis/monitor-bars` and the day-detail requests of `MonitorOverview`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(kener)/hidden-monitors.test.ts"`. This test checks that `/monitors/{monitor_tag}` hides a hidden monitor. No test file is in this directory.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
