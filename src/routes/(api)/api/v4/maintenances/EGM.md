# Maintenances API (`/api/v4/maintenances`)

## Overview

This route lists maintenances and creates a new maintenance. A maintenance is a planned work schedule: a start, an RRULE (an iCalendar recurrence rule such as `FREQ=WEEKLY;BYDAY=SU`), a duration, and the monitors it affects. Each window of that schedule is a maintenance event, stored in `maintenances_events`. `src/hooks.server.ts` checks the Bearer API key before a handler runs.

## Interface

- `GET` takes the optional query parameters `status` (`ACTIVE` or `INACTIVE`) and `monitor_tag`. It returns `{ maintenances }`. Each maintenance has `id`, `title`, `description`, `start_date_time`, `rrule`, `duration_seconds`, `status`, `monitors`, `created_at`, `updated_at`, and `url`.
- `POST` takes a JSON body with `title`, `start_date_time`, `rrule`, and `duration_seconds` (all required), and `description` and `monitors` (optional). It calls `CreateMaintenance` from `$lib/server/controllers/maintenanceController` and returns 201 with `{ maintenance }`.
- `isValidRrule` is a local helper.
- [[maintenance_id]](<./[maintenance_id]/EGM.md>): this child route reads, edits, and deletes one maintenance, and holds its event routes.
- [events](./events/EGM.md): this child route searches maintenance events across all maintenances.

## Invariants

- `GET` ignores a `status` value other than `ACTIVE` or `INACTIVE`. It filters by `monitor_tag` in memory, after the database read.
- `title` must be a non-empty string, and `start_date_time` must be a number in UTC seconds. The handler rounds `start_date_time` down to the start of its minute.
- `rrule` must be a non-empty string that `rrulestr` from the `rrule` package can parse. The same `isValidRrule` copy is in `./[maintenance_id]/+server.ts`, so a change to one copy must go to the other.
- `duration_seconds` must be a positive number.
- Each `monitor_tag` must name an existing monitor. Each `impact` must be `UP`, `DOWN`, `DEGRADED`, or `MAINTENANCE`, and a missing impact saves `MAINTENANCE`.
- This route always saves `status` `ACTIVE` and `is_global` `YES`, because it passes no `is_global` and `CreateMaintenance` saves `data.is_global || "YES"`.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `POST` inserts one row in `maintenances` and one row in `maintenance_monitors` for each monitor.
- `CreateMaintenance` then calls `GenerateMaintenanceEvents` to create the first event in `maintenances_events`:
    - A one-time RRULE (one that contains `COUNT=1`) gets an event only when its start is no more than one day in the past.
    - A recurring RRULE gets its next occurrence after the current time.
- Each new event pushes a "created" email job to `subscriberQueue` when `globalMaintenanceNotificationSettings.event_types.created` is on. A failed push is logged and does not fail the request.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
