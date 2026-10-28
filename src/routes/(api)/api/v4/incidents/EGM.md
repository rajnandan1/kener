# Incidents API (`/api/v4/incidents`)

## Overview

This route lists incidents and creates a new incident. An incident records an outage or a degradation, with the monitors it affects. `src/hooks.server.ts` checks the Bearer API key before a handler runs.

## Interface

- `GET` takes the optional query parameters `start_ts` and `end_ts` (UTC seconds) and `monitor_tags` (comma-separated). It returns `{ incidents }`. Each incident has `id`, `title`, `start_date_time`, `end_date_time`, `state`, `incident_source`, `monitors` (each with `monitor_tag` and `impact`), `created_at`, `updated_at`, and `url`.
- `POST` takes a JSON body with `title` (required), `start_date_time` (required), `end_date_time` (optional), and `monitors` (optional, each with `monitor_tag` and `impact`). It calls `CreateIncident` and `AddIncidentMonitor` from `$lib/server/controllers/incidentController` and returns 201 with `{ incident }`.
- [[incident_id]](<./[incident_id]/EGM.md>): this child route reads, edits, and deletes one incident, and holds the comment routes.

## Invariants

- `GET` reads one page of at most 1000 incidents with `db.getIncidentsPaginated(1, 1000, filter)`. The route has no page parameter, so incidents past the first 1000 are not returned.
- `GET` filters by `monitor_tags` in memory, after the database read.
- `title` must be a non-empty string, and `start_date_time` must be a number in UTC seconds. The handler rounds both times down to the start of their minute.
- Each `monitor_tag` must name an existing monitor, or the handler returns 400. Each `impact` must be `DOWN`, `DEGRADED`, or `MAINTENANCE`, and a missing impact saves `DOWN`.
- `POST` always creates the incident with `status` `OPEN`, `state` `INVESTIGATING`, `incident_type` `INCIDENT`, and `incident_source` `API`.
- `CreateIncident` throws when `end_date_time` comes before `start_date_time`. The handler returns that message as a 400, and nothing is saved.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `POST` inserts one row in `incidents` and one row in `incident_monitors` for each monitor.
- `POST` adds no comment and emails no subscriber. Subscribers hear of an incident only when a comment is posted.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
