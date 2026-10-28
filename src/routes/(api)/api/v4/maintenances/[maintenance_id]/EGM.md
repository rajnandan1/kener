# Maintenance API (`/api/v4/maintenances/{maintenance_id}`)

## Overview

This route reads, edits, and deletes one maintenance. A maintenance is a planned work schedule: a start, an RRULE (an iCalendar recurrence rule such as `FREQ=WEEKLY;BYDAY=SU`), a duration, and the monitors it affects. Each window of that schedule is a maintenance event. Before a handler runs, `src/hooks.server.ts` checks the Bearer API key. The hook also loads the maintenance into `locals.maintenance`. It returns a JSON 404 when `maintenance_id` is not a whole number up to 2147483647 or when no maintenance has that id.

## Interface

- `GET` returns `{ maintenance }`. The object has `id`, `title`, `description`, `start_date_time`, `rrule`, `duration_seconds`, `status`, `monitors` (each with `monitor_tag` and `impact`), `created_at`, `updated_at`, and `url`.
- `PATCH` takes a JSON body in which `title`, `description`, `start_date_time`, `rrule`, `duration_seconds`, `status`, and `monitors` are all optional. It calls `UpdateMaintenance` from `$lib/server/controllers/maintenanceController` and returns `{ maintenance }`.
- `DELETE` calls `DeleteMaintenance` from the same controller and returns `{ message }`.
- `isValidRrule` and `buildMaintenanceResponse` are local helpers.
- [events](./events/EGM.md): this child route lists the events of the maintenance and holds the single-event route.

## Invariants

- `rrule` must be a non-empty string that `rrulestr` from the `rrule` package can parse. `isValidRrule` adds a placeholder `DTSTART` for that check. The same `isValidRrule` copy is in `../+server.ts`, so a change to one copy must go to the other.
- `duration_seconds` must be a positive number, and `status` must be `ACTIVE` or `INACTIVE`.
- `start_date_time` is in UTC seconds. The handler rounds it down to the start of its minute.
- `monitors` replaces the whole monitor list. Each `monitor_tag` must name an existing monitor. Each `impact` must be `UP`, `DOWN`, `DEGRADED`, or `MAINTENANCE`, and a missing impact saves `MAINTENANCE`.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `PATCH` updates the row in `maintenances`. When the body has `monitors`, `UpdateMaintenance` deletes every `maintenance_monitors` row of the maintenance and inserts the new list.
- A change to `start_date_time`, `rrule`, or `duration_seconds` rebuilds events in `maintenances_events`:
    1. For a one-time RRULE (`isOneTimeRrule`), it deletes every event that is not `COMPLETED` or `CANCELLED`.
    2. For a recurring RRULE, it deletes only the `SCHEDULED` events that start in the future.
    3. It then calls `GenerateMaintenanceEvents` to create the next event. That call pushes a "created" email job to `subscriberQueue` when `globalMaintenanceNotificationSettings.event_types.created` is on. It skips the push when the maintenance `is_global` is not `YES` and it has no visible monitors. `db.getMonitorsByMaintenanceId` reads only monitors with `is_hidden` `NO`.
- `DELETE` deletes only the `maintenances` row through `db.deleteMaintenance`. The `maintenance_monitors` and `maintenances_events` rows go away only through their foreign-key `ON DELETE CASCADE`. A comment in `src/lib/server/db/repositories/monitorAlertConfig.ts` says that SQLite does not enforce those cascades.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
