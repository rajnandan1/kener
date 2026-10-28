# Incident API (`/api/v4/incidents/{incident_id}`)

## Overview

This route reads, edits, and deletes one incident. Before a handler runs, `src/hooks.server.ts` checks the Bearer API key. The hook also loads the incident into `locals.incident`. It returns a JSON 404 when `incident_id` is not a whole number up to 2147483647 or when no incident has that id.

## Interface

- `GET` returns `{ incident }`. The object has `id`, `title`, `start_date_time`, `end_date_time`, `state`, `incident_type`, `incident_source`, `monitors` (each with `monitor_tag` and `impact`), `created_at`, `updated_at`, and `url` (the public incident page).
- `PATCH` takes a JSON body in which `title`, `start_date_time`, `end_date_time`, and `monitors` are all optional. It calls `ClearIncidentEndTime`, `UpdateIncident`, `RemoveIncidentMonitor`, and `AddIncidentMonitor` from `$lib/server/controllers/incidentController`. It returns `{ incident }`.
- `DELETE` calls `DeleteIncident` from the same controller and returns `{ message }`.
- `buildIncidentResponse` is a local helper that reads the incident and its monitors and builds the response object.
- [comments](./comments/EGM.md): this child route lists the comments of the incident and adds a comment.

## Invariants

- `end_date_time: null` in the `PATCH` body reopens the incident: the handler calls `ClearIncidentEndTime` before `UpdateIncident`. A body without `end_date_time` keeps the stored end.
- Times are UTC seconds. The handler rounds `start_date_time` and `end_date_time` down to the start of their minute.
- `UpdateIncident` throws when the end comes before the start. This also covers a new start after the stored end. The handler returns that message as a 400.
- The handler does not pass `state` to `UpdateIncident`. A comment changes the incident state, not this route.
- `monitors` replaces the whole monitor list. Each `monitor_tag` must name an existing monitor. Each `impact` must be `DOWN`, `DEGRADED`, or `MAINTENANCE`, and a missing impact saves `DOWN`. The handler checks every monitor before it writes anything.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `PATCH` updates the row in `incidents`. When the body has `monitors`, it deletes the `incident_monitors` rows whose tag is not in the list and upserts (inserts or updates) the rest.
- `DELETE` is a hard delete. `DeleteIncident` sets `incident_id` to null on the linked `monitor_alerts_v2` rows, deletes the `incident_monitors` rows, deletes every `incident_comments` row of the incident, and then deletes the `incidents` row.
- No handler here emails subscribers.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
