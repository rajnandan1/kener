# services

## Overview

This folder runs one health check per monitor type. `Service` in `service.ts` picks a check class from the monitor's `monitor_type`, and each class's `execute()` returns one `MonitoringResult` (the type in `src/lib/server/types/monitor.ts`). The job in `src/lib/server/queues/monitorExecuteQueue.ts` calls `Service`. `confirmationThreshold.ts` holds a monitor's status steady until enough checks in a row agree on a change.

## Interface

- `service.ts` default-exports the class `Service` and exports the type `MonitorWithType`. The constructor maps `API` to `ApiCall`, `PING` to `PingCall`, `TCP` to `TcpCall`, `DNS` to `DnsCall`, `GROUP` to `GroupCall`, `SSL` to `SSLCall`, `SQL` to `SqlCall`, `HEARTBEAT` to `HeartbeatCall`, `GAMEDIG` to `GamedigCall`, `GRPC` to `GrpcCall`, `PROMETHEUS` to `PrometheusCall`, `DOCKER` to `DockerCall`, and any other value to `NoneCall`. `execute(startOfMinute?)` returns `Promise<MonitoringResult | null>`.
- Each `*Call.ts` file default-exports one class with an `execute()` method:
    - `ApiCall` sends an HTTP request and lets a user eval script, or `DefaultAPIEval`, turn the status code, time, and body into a status.
    - `PingCall` and `TcpCall` call `Ping()` and `TCP()` from `src/lib/server/ping.ts` once per configured host, then run an eval over the results.
    - `DnsCall` looks up one record type over UDP or DNS-over-TLS and compares the answers with the expected values (`matchType` `ALL` or `ANY`).
    - `SSLCall` reads the TLS certificate and compares the hours left with `degradedRemainingHours` and `downRemainingHours`. The file also exports `getSSLExpiry`, `dnAttr`, `SSLTimeoutError`, and `DEFAULT_SSL_TIMEOUT_MS` (10000).
    - `SqlCall` opens a Knex connection to the target database and runs the configured query.
    - `HeartbeatCall` measures the time since the last heartbeat that the monitor received.
    - `GroupCall` combines the latest status of its member monitors into one weighted status.
    - `GamedigCall` queries a game server with GameDig. `GrpcCall` calls the standard `grpc.health.v1.Health/Check` RPC.
    - `PrometheusCall` runs a PromQL instant query and compares the value with the `down` and `degraded` thresholds. The file also exports `parsePromValue` and `matchesThreshold`.
    - `DockerCall` pings the Docker daemon or inspects one container. The file also exports `evaluateState`.
    - `NoneCall` returns the last known status only when `overrideWithLastKnownStatus` is set and that status has type `MANUAL`. Otherwise it returns `null`.
- `confirmationThreshold.ts` exports `resolveConfirmedStatus(input, deps = db)`, `sideOf(status)`, and the types `Side`, `ResolveInput`, `ResolveResult`, and `ConfirmationDeps`.

## Invariants

- A new monitor type needs a branch in `Service`. A type with no branch falls through to `NoneCall`, which runs no check and reports no error. `Minuter` in `src/lib/server/cron-minute.ts` also rejects any type that is not in `MONITOR_TYPES` (`src/lib/types/monitor.ts`).
- Every check returns `status` (`UP`, `DOWN`, `DEGRADED`, and in some paths `NO_DATA` or `MAINTENANCE`), a numeric `latency`, a `type`, and an optional `error_message`. `type` is `REALTIME` for a finished check, `ERROR` for a failure, and `TIMEOUT` for a timeout. The queue applies the confirmation threshold only to these three types.
- A check records a result instead of throwing when its config is bad. For example, `ApiCall` returns `DOWN` with type `ERROR` when `type_data` is missing, and `PrometheusCall` returns type `ERROR` when `type_data` or the URL is missing. `ApiCall` does not check the URL, so with no URL the eval decides the status.
- `PrometheusCall` takes the status of every failure from `type_data.errorStatus` (default `DOWN`). It takes the status of an empty result from `type_data.noDataStatus` (default `DOWN`), with type `REALTIME`.
- The default timeouts are 10000 ms for API, gRPC, Prometheus, and SSL, and 5000 ms for SQL. Ping and TCP use each host's own `timeout`.
- Eval scripts run through `new Function` in the server process. `ApiCall` gives the script `(statusCode, responseTime, responseRaw, modules)`, where `modules` holds `cheerio`. An eval that throws gives `DOWN` with type `ERROR`. `ApiCall` gives the same result for a bad return value, and `TcpCall` gives it when the eval returns nothing or leaves out `status` or `latency`. `PingCall` does not check the return value, so a missing status gives `DOWN` with type `REALTIME`. `PingCall` and `TcpCall` save an unknown status string as it is.
- `ApiCall` accepts every HTTP status code (`validateStatus: () => true`), so the eval decides the status.
- `latency` means milliseconds of request time for most checks. For `HeartbeatCall`, it means milliseconds since the last heartbeat. For `PrometheusCall`, it holds the metric value itself.
- `GroupCall` scores `UP` as 1, `DEGRADED` as 0.5, `DOWN` as 0, and any other status as 1. It skips members with no data and divides by the total weight when the weights do not sum to 1. A score of 1 gives `UP`, a score above 0 gives `DEGRADED`, and 0 gives `DOWN`.
- `HeartbeatCall` treats a stored timestamp below 1e12 as seconds. It returns `NO_DATA` when no heartbeat exists.
- `resolveConfirmedStatus` treats `UP` as one side and `DOWN` and `DEGRADED` as the other. It commits the raw status at once when the side does not change. Otherwise it holds the last confirmed status until `threshold` checks in a row show the new side, then it backfills those rows. Call it before the row at `ts` is saved, and only when no incident or maintenance overlay is active.
- Checks cut long error messages to 200 characters plus `...`.

## Side Effects

- The checks make network calls: HTTP through axios (API, Prometheus), DNS queries, ICMP ping and TCP connects, TLS sockets (SSL), gRPC calls, SQL connections to the target database, Docker Engine API calls through `src/lib/server/docker.ts`, and GameDig queries.
- `ApiCall`, `PrometheusCall`, `SqlCall`, and `DockerCall` replace `$NAME` secrets with env values through `GetRequiredSecrets` in `src/lib/server/tool.ts`.
- `GrpcCall` writes a `health.proto` file into a `kener-grpc-*` folder under `os.tmpdir()` once per process.
- `GroupCall`, `HeartbeatCall`, and `NoneCall` read the Redis cache or the database for the last known values. `resolveConfirmedStatus` reads `db.getLastObservedStatus` and `db.getRecentSamplesForConfirmation` and writes `db.backfillConfirmedStatus`.
- Several checks log errors with `console.log` or `console.error`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server/services"`.
- `confirmationThreshold.ts` reads and writes the database, so a change to it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
