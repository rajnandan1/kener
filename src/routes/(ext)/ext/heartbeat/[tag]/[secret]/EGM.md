# [secret]

## Overview

This route folder serves `GET` and `POST /ext/heartbeat/[tag]/[secret]`. An outside job calls this URL to report that it is alive. Kener records the call for the `HEARTBEAT` monitor whose tag is `[tag]`. `[tag]` and `[secret]` are SvelteKit route parameters.

## Interface

- `GET` and `POST` in `+server.ts` are the same function. They read the route parameters `tag` and `secret` and ignore the request body.
- The handler calls `RegisterHeartbeat(tag, secret)` from `src/lib/server/controllers/monitorsController.ts`.
- The handler returns 200 `{status: "OK"}` on success.
- The handler returns 400 `{error}` on every failure, with the message of the thrown error. The messages are "Tag and secret are required", "Monitor not found", "Monitor type data not found" (when the stored `type_data` is the JSON text `null`), and "Invalid heartbeat secret". An error from the monitor lookup itself, such as a database error, passes its own message through.

## Invariants

- The secret in the URL is the only credential. The route needs no session and no API key.
- `csrfHandle` in `src/hooks.server.ts` returns 403 for a `POST` with a form content type whose `Origin` header names another host.
- `RegisterHeartbeat` accepts only a monitor that has this tag, `status` `ACTIVE`, and `monitor_type` `HEARTBEAT`.
- `RegisterHeartbeat` compares the secret with `===` against `type_data.secretString`.
- `RegisterHeartbeat` stores the time in seconds. When the time falls exactly on a minute, it adds 1 second. This keeps the new row from overwriting a minute-rounded row with the same `(monitor_tag, timestamp)` key in `monitoring_data`.
- `RegisterHeartbeat` reports any error after the `type_data` check, including a Redis failure, as "Invalid heartbeat secret".
- An unknown monitor and a wrong secret both return 400, not 404 or 401.

## Side Effects

- `RegisterHeartbeat` reads the monitor from the `monitors` table through `GetMonitorsParsed`.
- `RegisterHeartbeat` writes the Redis key `kener:cache:last_heartbeat:<tag>` with a 45-day expiry.
- `RegisterHeartbeat` then upserts a row into `monitoring_data` with `status` `UP`, `type` `SIGNAL`, and `latency` 0. This write is best effort: on an error it logs the error and still returns `OK`.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads or writes here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
