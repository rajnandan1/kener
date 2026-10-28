# Maintenance Events List API (`/api/v4/maintenances/{maintenance_id}/events`)

## Overview

This read-only route lists the events of one maintenance. A maintenance event is one scheduled window of a maintenance. Before the handler runs, `src/hooks.server.ts` checks the Bearer API key and loads the maintenance into `locals.maintenance`, or returns a JSON 404.

## Interface

- `GET` takes the optional query parameters `page` (default 1) and `limit` (default 20, from 1 to 100). It returns `{ events, page, limit }`.
- Each event has `id`, `maintenance_id`, `start_date_time`, `end_date_time`, `status`, `created_at`, `updated_at`, and `url`.
- [[event_id]](<./[event_id]/EGM.md>): this child route reads, edits, ends, and deletes one event.

## Invariants

- The handler reads every event of the maintenance with `db.getMaintenanceEventsByMaintenanceId`, oldest start first, and then cuts the page in memory.
- The response has no `total` field, unlike `/api/v4/maintenances/events`.

## Side Effects

- `GET` reads `maintenances_events`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- A change here reads the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
