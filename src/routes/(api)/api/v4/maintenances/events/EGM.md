# Maintenance Events Search API (`/api/v4/maintenances/events`)

## Overview

This read-only route lists maintenance events across all maintenances. A maintenance event is one scheduled window of a maintenance. SvelteKit matches the static `events` segment before the dynamic `[maintenance_id]` segment, so this URL never reaches the single-maintenance route. `src/hooks.server.ts` checks the Bearer API key before the handler runs.

## Interface

- `GET` takes these optional query parameters:
    - `page` (default 1) and `limit` (default 20, from 1 to 100).
    - `monitors`, a comma-separated list of monitor tags.
    - `event_status`, one of `SCHEDULED`, `ONGOING`, `COMPLETED`, `CANCELLED`, or `READY`, in any letter case.
    - `event_start_date_time` (UTC seconds) and `maintenance_id`.
- `GET` calls `db.getMaintenanceEventsWithDetails` and then `db.getMaintenanceMonitors` once for each event. It returns `{ events, page, limit, total }`.
- Each event has `maintenance_id`, `event_id`, `event_start_date_time`, `event_end_date_time`, `event_status`, `maintenance_title`, `maintenance_description`, `maintenance_status`, `maintenance_rrule`, `maintenance_duration_seconds`, `monitors`, and `url`.

## Invariants

- The query returns only events whose start is at or after `event_start_date_time`. The handler rounds that value down to the start of its minute. Without the parameter, it uses the current time, so past events are left out by default.
- An invalid value for any parameter falls back to its default, or to no filter. The handler never returns 400.

## Side Effects

- `GET` reads `maintenances_events`, `maintenances`, and `maintenance_monitors`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- A change here reads the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
