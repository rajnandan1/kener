# repositories

## Overview

This folder is Kener's data access layer on Knex, a SQL query builder. Each file holds one repository class, and each class owns a group of related tables. The queries must run on SQLite, PostgreSQL, and MySQL. Code outside `src/lib/server/db/` does not use these classes directly: `DbImpl` in `../dbimpl.ts` binds their methods onto the `db` object.

## Interface

- `base.ts` exports the abstract class `BaseRepository` and the filter types `MonitorFilter`, `TriggerFilter`, `IncidentFilter`, and `CountResult`. Every repository extends `BaseRepository`. Its protected `knex` getter returns `getWorkerKnex() ?? fallbackKnex`.
- `index.ts` re-exports `BaseRepository`, the four filter types, and ten repositories. It does not re-export `MonitorAlertConfigRepository` or `SubscriptionSystemRepository`.
- `monitoring.ts` exports `MonitoringRepository`, which owns `monitoring_data`. Methods include `insertMonitoringData`, `getMonitoringData`, `getLatestMonitoringDataAllActive`, `getStatusCountsByInterval`, `background` (the retention delete), `consecutivelyStatusFor`, `getRecentSamplesForConfirmation`, and `backfillConfirmedStatus`.
- `monitors.ts` exports `MonitorsRepository`, which owns `monitors`: `getMonitors`, `getMonitorByTag`, `getMonitorsByTag`, `getMonitorsByTags`, `insertMonitor`, `updateMonitor`, `updateMonitorTrigger`, and `deleteMonitorsByTag`. `getMonitorsByTag(tag)` returns one monitor, the same as `getMonitorByTag`.
- `incidents.ts` exports `IncidentsRepository`, which owns `incidents`, `incident_monitors`, and `incident_comments`. Methods include `createIncident`, `updateIncident`, `getOngoingIncidentsForMonitorList`, `getIncidentsForEventsByDateRange`, `insertIncidentMonitorWithMerge`, and `insertIncidentComment`. One method name has a typo that callers use: `geAllGlobalOngoingIncidents`.
- `maintenances.ts` exports `MaintenancesRepository`, which owns `maintenances`, `maintenance_monitors`, and `maintenances_events`. Methods include `createMaintenance`, `addMonitorsToMaintenance`, `createMaintenanceEvent`, `getScheduledEventsStartingSoon`, and `getMaintenanceEventsForEventsByDateRange`.
- `monitorAlertConfig.ts` exports `MonitorAlertConfigRepository`, which owns `monitor_alerts_config`, `monitor_alerts_config_triggers`, `monitor_alerts_config_monitors`, and `monitor_alerts_v2`.
- `alerts.ts` exports `AlertsRepository`, which owns the older `monitor_alerts` table and the `triggers` table.
- `pages.ts` exports `PagesRepository`, which owns `pages` and `pages_monitors`: `createPage`, `getPageByPath`, `getActivePageMonitors`, `updatePageMonitorPositions`, and more.
- `users.ts` exports `UsersRepository`, which owns `users`, `users_roles`, `roles`, `roles_permissions`, `api_keys`, and `oidc_group_role_mappings`, and reads `permissions`.
- `subscriptionSystem.ts` exports `SubscriptionSystemRepository`, which owns `subscriber_users`, `subscriber_methods`, and `user_subscriptions_v2`.
- `site-data.ts` exports `SiteDataRepository` (`site_data`). `images.ts` exports `ImagesRepository` (`images`). `emailTemplateConfig.ts` exports `EmailTemplateConfigRepository` (`general_email_templates`).

## Invariants

- A repository must use `this.knex` on every query and never keep the constructor's Knex instance. The getter picks the worker pool inside a queue job and the web pool everywhere else (`base.ts:45-56`).
- Event times (`timestamp`, `start_date_time`, `end_date_time`) are Unix seconds stored as numbers. Audit columns (`created_at`, `updated_at`) use the database clock through `this.knex.fn.now()`.
- An insert that needs the new row uses `.returning()` only on PostgreSQL (`GetDbType() === "postgresql"`). On SQLite and MySQL it reads the row back by the inserted id.
- Upserts use `onConflict(...).merge(...)`. Do not use `.ignore()` where data could be long: MySQL compiles it to `INSERT IGNORE`, which stores cut-short data instead of failing (`images.ts:9-10`). `maintenance_monitors` attaches use `.ignore()` on purpose, so a second attach does nothing.
- `monitoring_data` has one row per `(monitor_tag, timestamp)`. Inserts merge on that key.
- The upsert keys need unique constraints: `site_data.key`, `general_email_templates.template_id`, `incident_monitors (monitor_tag, incident_id)`, and `maintenance_monitors (maintenance_id, monitor_tag)`.
- SQLite does not enforce foreign key cascades here. `deleteMonitorAlertConfig` and `deleteTrigger` delete child rows by hand before the parent. Some other deletes remove only the parent row, so the caller must delete the children.
- Only three methods use a transaction: `updatePageMonitorPositions`, `backfillConfirmedStatus`, and `updateMonitoringData`. Inside one, every query must go through `trx`, not `this.knex`. Other multi-step writes, such as `updateUserRoles`, can stop half done.
- `monitoring.ts` keeps three sample type lists: `ALERT_VISIBLE_TYPES`, `OBSERVED_CHECK_TYPES`, and `OVERLAY_TYPES`. Alert and confirmation queries filter on them, so a new sample type must go into the right list.
- `getMonitoringData` uses the half-open range `[start, end)` and orders by `timestamp asc`.
- Flag columns hold the strings `YES` and `NO`. No table uses soft deletes, so every delete is final.
- `CountResult.count` is `string | number` across drivers, so callers wrap it in `Number()`.
- Page numbers start at 1, and paged queries use `offset((page - 1) * limit)`.

## Side Effects

- Each repository reads and writes the tables listed for it above, with these exceptions. `AlertsRepository.deleteTrigger` also deletes the trigger's rows in `monitor_alerts_config_triggers`. `MonitorAlertConfigRepository` also reads `triggers` through joins. `incidents.ts`, `maintenances.ts`, and `pages.ts` also read `monitors` through joins, for example to filter out hidden monitors.
- `MonitoringRepository.background(days)` deletes `monitoring_data` rows older than `days` days.
- `base.ts` calls `getWorkerKnex()` from `../poolContext.ts` on every query to pick the connection pool.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server/db/repositories"`.
- Every change here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows. `npm test` runs on SQLite only.
