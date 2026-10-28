# Incident Comment API (`/api/v4/incidents/{incident_id}/comments/{comment_id}`)

## Overview

This route reads, edits, and deletes one comment of one incident. A comment is one update on the incident timeline, with a text, a state, and a time. Before a handler runs, `src/hooks.server.ts` checks the Bearer API key. The hook also loads the incident into `locals.incident`, or returns a JSON 404 when the incident does not exist.

## Interface

- `GET` returns `{ comment }`. The `comment` object has `id`, `incident_id`, `comment`, `timestamp`, `state`, `created_at`, and `updated_at`.
- `PATCH` takes a JSON body in which `comment`, `state`, and `timestamp` are all optional. It calls `UpdateCommentByID` from `$lib/server/controllers/incidentController` and returns `{ comment }` as saved.
- `DELETE` calls `UpdateCommentStatusByID(incident_id, comment_id, "INACTIVE")` from the same controller and returns `{ message }`.
- `formatCommentResponse` is a local helper. It maps an `incident_comments` row to the response shape and renames `commented_at` to `timestamp`.

## Invariants

- Each handler parses `comment_id` with `parseInt` and returns 400 only when the result is `NaN`. `parseInt` reads the leading digits, so `5abc` and `5.9` read comment 5.
- Each handler returns 404 when the comment does not belong to the incident or its `status` is not `ACTIVE`. So a deleted comment is not visible to any handler here.
- `state` must be `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, or `RESOLVED`. Any other value returns 400.
- A field that the `PATCH` body leaves out keeps its stored value.
- `timestamp` is in UTC seconds. The handler rounds it down to the start of its minute with `GetMinuteStartTimestampUTC`.
- `UpdateCommentByID` throws when a `RESOLVED` comment is dated before the incident start. The handler returns that message as a 400, and nothing is saved.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `PATCH` updates the row in `incident_comments`. `UpdateCommentByID` then sets the incident `state` to the comment state.
- A `RESOLVED` comment sets the incident `end_date_time` to the comment time. Any other state on a resolved incident clears `end_date_time`.
- `DELETE` is a soft delete: it sets the comment `status` to `INACTIVE` and keeps the row.
- No handler here emails subscribers. Only a new comment does that, in the parent `comments` route.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
