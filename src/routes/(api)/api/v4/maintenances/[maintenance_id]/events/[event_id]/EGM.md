# Maintenance Event API (`/api/v4/maintenances/{maintenance_id}/events/{event_id}`)

## Overview

This route reads, edits, ends, and deletes one maintenance event. A maintenance event is one scheduled window of a maintenance, stored in the `maintenances_events` table. Before a handler runs, `src/hooks.server.ts` checks the Bearer API key and loads the maintenance into `locals.maintenance`, or returns a JSON 404.

## Interface

- `GET` returns `{ event }`. The object has `id`, `maintenance_id`, `start_date_time`, `end_date_time`, `status`, `created_at`, `updated_at`, and `url`.
- `PATCH` takes a JSON body in one of two modes and returns `{ event }`:
    1. Status mode: the body has only `status`, set to `COMPLETED` or `CANCELLED`. The handler calls `UpdateMaintenanceEventStatus` from `$lib/server/controllers/maintenanceController`.
    2. Window mode: the body has both `start_date_time` and `end_date_time`. The handler calls `UpdateMaintenanceEvent` from the same controller.
- `DELETE` calls `DeleteMaintenanceEvent` from the same controller and returns `{ message }`.
- `buildEventResponse` is a local helper that maps a `maintenances_events` row to the response shape.

## Invariants

- Each handler parses `event_id` with `parseInt` and returns 404 when the result is `NaN` or when the event does not belong to `locals.maintenance`. `parseInt` reads the leading digits, so `7abc` and `7.5` read event 7. On PostgreSQL, an `event_id` above 2147483647 makes the query fail, and the request gets a 500 instead of a 404. This route never returns 400 for a bad `event_id`.
- A `PATCH` body with `status` and a start or end time returns 400.
- `UpdateMaintenanceEventStatus` allows only two transitions: `ONGOING` to `COMPLETED`, and `SCHEDULED`, `READY`, or `ONGOING` to `CANCELLED`. Any other transition throws, and the handler returns 400.
- When status mode completes or cancels an `ONGOING` event, its `end_date_time` moves to the start of the current minute. That end stays at least 60 seconds after the start and never passes the planned end.
- In window mode, both times are UTC seconds, and `end_date_time` must be after `start_date_time`. The handler rounds both down to the start of their minute. `UpdateMaintenanceEvent` throws when the rounded window is empty, so a window inside one minute returns 400. A short window that crosses a minute start becomes a full 60-second window and saves.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `PATCH` updates the row in `maintenances_events`.
- Status mode pushes one email job to `subscriberQueue` when the site setting `globalMaintenanceNotificationSettings.event_types.ended` is on. It skips the push when the maintenance `is_global` is not `YES` and it has no visible monitors. `db.getMonitorsByMaintenanceId` reads only monitors with `is_hidden` `NO`. A failed push is logged and does not fail the request.
- Window mode sends no email.
- `DELETE` deletes the row from `maintenances_events`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
