# Incident Comments API (`/api/v4/incidents/{incident_id}/comments`)

## Overview

This route lists the comments of one incident and adds a new comment. A comment is one update on the incident timeline, with a text, a state, and a time. Adding a comment is the one write that emails incident subscribers, the people who signed up for email updates. Before a handler runs, `src/hooks.server.ts` checks the Bearer API key and loads the incident into `locals.incident`, or returns a JSON 404.

## Interface

- `GET` returns `{ comments }`, the `ACTIVE` comments of the incident from `db.getActiveIncidentComments`, newest first. Each comment has `id`, `incident_id`, `comment`, `timestamp`, `state`, `created_at`, and `updated_at`.
- `POST` takes a JSON body with `comment` (required), `state` (required), and `timestamp` (optional). It calls `AddIncidentComment` from `$lib/server/controllers/incidentController` and returns 201 with `{ comment }`.
- [[comment_id]](<./[comment_id]/EGM.md>): this child route reads, edits, and soft-deletes one comment.

## Invariants

- `comment` must be a non-empty string. The handler trims it before it saves it.
- `state` must be `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, or `RESOLVED`. Any other value returns 400.
- `timestamp` is in UTC seconds, and the handler rounds it down to the start of its minute. Without a `timestamp`, the handler uses the start of the current minute (`GetMinuteStartNowTimestampUTC`).
- `AddIncidentComment` throws when a `RESOLVED` comment is dated before the incident start. The handler returns that message as a 400, and nothing is saved.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `POST` inserts one row in `incident_comments`.
- When the incident `incident_type` is `INCIDENT`, `AddIncidentComment` also sets the incident `state` to the comment state. A `RESOLVED` comment sets the incident `end_date_time`, and another state on a resolved incident clears it.
- For the same incidents, `AddIncidentComment` pushes one email job to `subscriberQueue` with the deduplication id `subscriber-incidents-<comment id>`. It skips the push when the incident `is_global` is not `YES` and `db.getMonitorsByIncidentId` returns no monitors.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(api)/api/v4/incidents/[incident_id]/comments"`.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
