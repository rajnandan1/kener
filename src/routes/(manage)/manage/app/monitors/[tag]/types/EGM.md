# Monitor Type Forms

## Overview

This folder holds one form per monitor type. `../components/MonitorTypeCard.svelte` renders the form that matches `monitor.monitor_type` and binds it to the monitor's `type_data` (the type-specific settings, stored as JSON). The forms do not save. `MonitorTypeCard` saves `type_data` through the manage API (the `POST /manage/api` endpoint).

## Interface

- `index.ts` re-exports each form as a named component: `MonitorApi`, `MonitorPing`, `MonitorTcp`, `MonitorDns`, `MonitorSsl`, `MonitorSql`, `MonitorHeartbeat`, `MonitorGroup`, `MonitorGamedig`, `MonitorNone`, `MonitorGrpc`, `MonitorPrometheus`, and `MonitorDocker`.
- Every form takes a bindable `data` prop that holds `type_data`.
- `MonitorHeartbeat` also takes `tag`. `MonitorGroup` also takes `availableMonitors` and `tag`. `MonitorDocker` also takes `defaults` (a `DockerConnectionDefaults`) and `monitorId`.
- `monitor-api.svelte` edits `url`, `method`, `headers`, `body`, `timeout`, `eval`, `proxy`, `follow_redirects`, `max_redirects`, and `allowSelfSignedCert`.
- `monitor-ping.svelte` edits `hosts` and `pingEval`. `monitor-tcp.svelte` edits `hosts` and `tcpEval`.
- `monitor-dns.svelte` edits `host`, `lookupRecord`, `nameServer`, `matchType`, `values`, and `transport`. It also edits `tlsPort`, `tlsServername`, and `allowSelfSignedCert`.
- `monitor-ssl.svelte` edits `host`, `port`, `timeout`, `tlsServername`, `degradedRemainingHours`, `downRemainingHours`, and `allowSelfSignedCert`.
- `monitor-sql.svelte` edits `dbType`, `connectionString`, `query`, and `timeout`.
- `monitor-heartbeat.svelte` edits `secretString`, `degradedRemainingMinutes`, and `downRemainingMinutes`. It shows the heartbeat URL `/ext/heartbeat/{tag}/{secretString}`.
- `monitor-group.svelte` edits `monitors` (tag and weight per member), `executionDelay`, and `latencyCalculation`.
- `monitor-gamedig.svelte` edits `gameId`, `host`, `port`, `guessPort`, `requestRules`, `timeout`, and `eval`.
- `monitor-grpc.svelte` edits `host`, `port`, `service`, `timeout`, `tls`, and `insecure`.
- `monitor-prometheus.svelte` edits `url`, `query`, `headers`, `timeout`, `proxy`, `degraded`, `down`, `noDataStatus`, `errorStatus`, and `allowSelfSignedCert`.
- `monitor-docker.svelte` edits `connectionType` (`socket`, `tcp`, or `tls`), `daemon`, `checkType` (`container` or `daemon`), `containerName`, `timeout`, and the TLS fields `tlsCa`, `tlsCert`, and `tlsKey`.
- `monitor-none.svelte` edits `overrideWithLastKnownStatus`.

## Invariants

- A new monitor type needs a form here, an export in `index.ts`, and a branch in the `{#if}` chain of `MonitorTypeCard.svelte`. It also needs an entry in `MONITOR_TYPES` in `src/lib/types/monitor.ts`, which feeds the type picker and the `MonitorType` union. In `MonitorTypeCard.svelte`, it needs a label in `monitorTypeLabels` and a case in `isTypeSettingsValid`, whose `default` accepts any data. It also needs a branch in `src/lib/server/services/service.ts`. A type with no branch there falls through to `NoneCall` and runs no checks.
- Each form sets its own defaults when a field is missing. For example, `monitor-grpc.svelte` sets port `50051` and timeout `10000`, and `monitor-group.svelte` sets `executionDelay` to at least 1000 ms and `latencyCalculation` to `AVG`.
- Dashboard reads return stored secrets masked. When the form sends a masked secret back, the server restores the stored value in `CreateUpdateMonitor` (`RestoreMonitorSecrets` in `src/lib/server/controllers/monitorsController.ts`).
- `monitor-docker.svelte` clears `tlsCa`, `tlsCert`, and `tlsKey` when the connection type changes away from `tls`. This stops a hidden private key from being saved.
- `monitor-heartbeat.svelte` makes a new random secret when none is stored. It accepts the stored secret as is, and it checks a changed secret with `IsValidHeartbeatSecret`.
- `monitor-group.svelte` offers only `ACTIVE` monitors that are not of type `GROUP` and are not the group itself. It marks a member as stale when that member is no longer eligible.
- `monitor-api.svelte` and `monitor-prometheus.svelte` show a warning when a `$NAME` secret reference would travel over plain `http://`.
- `monitor-grpc.svelte` forces `insecure` to `false` when `tls` is off.

## Side Effects

- `monitor-docker.svelte` sends the `listDockerContainers` action (permission `monitors.write`) with `monitor_id` and the unsaved form fields. The server connects to the Docker daemon and returns the container list. When the key is masked, the server uses the saved key.
- The other forms make no network calls. They change only the bound `type_data` object.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:client -- "src/routes/(manage)/manage/app/monitors/[tag]/types"` (the component tests for the Docker, heartbeat, and SSL forms and the plain-HTTP secret warning).
