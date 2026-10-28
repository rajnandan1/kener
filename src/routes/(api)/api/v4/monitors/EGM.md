# Monitors API (`/api/v4/monitors`)

## Overview

This route lists monitors and creates a new monitor. A monitor is one check that Kener runs, and its tag is its id in URLs. `src/hooks.server.ts` checks the Bearer API key before a handler runs.

## Interface

- `GET` takes the optional query parameters `status`, `category_name`, `monitor_type`, and `is_hidden`. It passes them to `GetMonitorsParsed` and returns `{ monitors }`, each passed through `MaskMonitorSecrets`.
- `POST` takes a JSON body with `tag` and `name` (required) and the other monitor fields (optional). It calls `ValidateTypeDataProxy`, `WithValidHeartbeatSecret`, and `CreateUpdateMonitor` from `$lib/server/controllers/monitorsController`. It returns 201 with `{ monitor }`.
- [[monitor_tag]](<./[monitor_tag]/EGM.md>): this child route reads, edits, and deletes one monitor, and holds its data routes.

## Invariants

- `MaskMonitorSecrets` replaces each non-empty secret and header value in `type_data` (the settings of the monitor type) with `********` in the `GET` response.
- The `POST` response is not masked. A `HEARTBEAT` monitor (one that waits for the checked service to call a secret URL) sent without a secret gets a generated one, and the caller reads it there.
- `tag` must match `^[a-z0-9][a-z0-9_-]*[a-z0-9]$`, or `^[a-z0-9]$` for one character, after the handler trims it. A tag that already exists returns 400, not 409.
- The handler looks for a duplicate with `body.tag` as sent, but it inserts the trimmed tag. So a tag such as ` web` next to an existing `web` skips that 400 and fails on the unique index on `monitors.tag`. A padded new tag such as ` db` saves as `db`, but the read-back looks up ` db` and finds nothing, so the handler returns 500 "Failed to create monitor" after it saved the row.
- `CreateUpdateMonitor` passes the `POST` `type_data` through `RestoreMonitorSecrets` with no stored monitor. So a secret or header value sent as `********` saves as an empty string. A `proxy` or a heartbeat `secretString` sent as `********` fails its check first and returns 400.
- `confirmation_threshold` must be an integer from 1 to 60, and it defaults to 1.
- The other defaults are `default_status` `UP`, `status` `ACTIVE`, `monitor_type` `API`, `include_degraded_in_downtime` `NO`, and `is_hidden` `NO`.
- `ValidateTypeDataProxy` returns 400 when `type_data.proxy` is not an `http://` or `https://` URL. `WithValidHeartbeatSecret` returns 400 for a heartbeat secret that breaks the rule.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `POST` inserts one row in `monitors` through `CreateUpdateMonitor`.
- `GET` only reads `monitors`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(api)/api/v4/monitors"`. This path filter also runs the tests in `[monitor_tag]/`.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
