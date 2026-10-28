# Monitor API (`/api/v4/monitors/{monitor_tag}`)

## Overview

This route reads, edits, and deletes one monitor. A monitor is one check that Kener runs, and its tag is the id in the URL. Before a handler runs, `src/hooks.server.ts` checks the Bearer API key and loads the monitor into `locals.monitor` with `GetMonitorsParsed`, or returns a JSON 404.

## Interface

- `GET` returns `{ monitor }`, passed through `MaskMonitorSecrets`.
- `PATCH` takes a JSON body in which every monitor field is optional. The handler does not copy `include_degraded_in_downtime` into the update, so `PATCH` keeps the stored value of that field. It calls `RestoreMonitorSecrets`, `WithValidHeartbeatSecret`, `ValidateTypeDataProxy`, `UpdateMonitor`, and `MaskMonitorSecrets` from `$lib/server/controllers/monitorsController`. It returns `{ monitor }`, masked.
- `DELETE` calls `DeleteMonitorCompletelyUsingTag` from the same controller and returns `{ message }`.
- [data](./data/EGM.md): this child route reads and overwrites the monitoring data of the monitor.

## Invariants

- `MaskMonitorSecrets` replaces each non-empty secret and header value in `type_data` (the settings of the monitor type) with `********`. Every read here returns the masked form.
- When `PATCH` gets `********` back for a secret, `RestoreMonitorSecrets` puts the stored value back. So a client can send back the monitor it read without losing a secret.
- `PATCH` merges `type_data` and `monitor_settings_json` into the stored objects, one level deep. A `null` value clears the field.
- The tag cannot change. `name` must be a non-empty string when the body has it.
- `confirmation_threshold` must be an integer from 1 to 60. A `null` value resets it to 1.
- `WithValidHeartbeatSecret` applies to a `HEARTBEAT` monitor, one that waits for the checked service to call a secret URL. It generates a secret when there is none, and it returns 400 for a new or changed secret that breaks the rule. A stored secret that the body leaves unchanged passes.
- `ValidateTypeDataProxy` returns 400 when `type_data.proxy` is not an `http://` or `https://` URL. A proxy equal to the stored one passes.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `PATCH` updates the row in `monitors` through `UpdateMonitor`.
- `DELETE` removes the monitor and everything keyed to its tag: monitoring data, incident links, alerts, alert configs, page links, maintenance links, group memberships, and the caches of the monitor. The scheduler in `src/lib/server/schedulers/appScheduler.ts` drops the job of the deleted monitor on its next reconcile.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/routes/(api)/api/v4/monitors/[monitor_tag]"`.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
