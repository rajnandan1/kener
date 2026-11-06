---
title: Monitors Overview
description: Choose the right monitor type and understand how monitor status is computed
---

Monitors are checks that run on your schedule and write a status + latency sample. Use this page to pick the right monitor type and understand status behavior.

## Status values {#status}

Kener monitor results can be:

- **UP**: Check succeeded
- **DEGRADED**: Check succeeded but is unhealthy by your logic/threshold
- **DOWN**: Check failed
- **MAINTENANCE**: Overridden by an active maintenance window
- **NO_DATA**: No signal yet (mainly used by heartbeat monitors before first ping)

## Status priority {#status-priority}

Final status is resolved by priority:

```
MAINTENANCE > INCIDENT > REALTIME > DEFAULT
```

So realtime checks do not override an active maintenance or incident state.

## Scheduling {#scheduling}

Monitors run from cron expressions (for example `* * * * *` for every minute). Use tighter schedules for critical services and relaxed schedules for low-risk dependencies.

## Uptime calculation {#uptime-calculation}

Default uptime formula:

```
      UP + MAINTENANCE
-------------------------------- x 100
UP + MAINTENANCE + DEGRADED + DOWN
```

## Monitor types {#monitor-types}

- [API Monitor](/docs/v4/monitors/api) — HTTP/HTTPS checks with custom eval logic
- [Ping Monitor](/docs/v4/monitors/ping) — ICMP reachability/latency for hosts
- [TCP Monitor](/docs/v4/monitors/tcp) — TCP port open/timeout/error checks
- [DNS Monitor](/docs/v4/monitors/dns) — DNS record matching (`ANY`/`ALL`)
- [SSL Monitor](/docs/v4/monitors/ssl) — TLS certificate expiry thresholds
- [SQL Monitor](/docs/v4/monitors/sql) — Run SQL query against DB connection
- [Heartbeat Monitor](/docs/v4/monitors/heartbeat) — Push-based health signal
- [GameDig Monitor](/docs/v4/monitors/gamedig) — Game server query checks
- [gRPC Monitor](/docs/v4/monitors/grpc) — gRPC Health Checking Protocol
- [Docker Monitor](/docs/v4/monitors/docker) — Container state and healthcheck via the Docker Engine API, or the daemon itself
- [Group Monitor](/docs/v4/monitors/group) — Weighted aggregate of member monitors
- [Prometheus Monitor](/docs/v4/monitors/prometheus) — PromQL instant query with threshold-based status

## Custom eval sandbox {#eval-sandbox}

API, Ping, TCP, and GameDig monitors run custom `eval` code in a sandbox. The sandbox is a separate JavaScript engine. It cannot reach the Kener server, its files, its environment variables, or the network.

Eval code can use:

- The JavaScript language, including `JSON`, `Math`, `Date`, regular expressions, and `async` functions
- `modules.cheerio` to parse HTML
- `atob` and `btoa`
- `console`, which writes nothing

Node.js and browser features do not exist in the sandbox. This includes `fetch`, `process`, `require`, `import()`, `Buffer`, `setTimeout`, `URL`, `TextDecoder`, `crypto`, and `Intl`. An eval that uses one reports **DOWN** with an error such as `'fetch' is not defined`.

`modules.cheerio` has `load`, `contains`, and `merge`. Write `modules.cheerio` as plain text in the eval, because Kener loads cheerio only when the eval contains the word `cheerio`. `Date` uses the time zone of the server. With no `Intl`, `toLocaleString()` adds no thousands separators or local date formats.

| Limit    | Value      |
| -------- | ---------- |
| Run time | 10 seconds |
| Memory   | 256 MB     |

An eval reports **DOWN** with type `ERROR` when it goes over a limit, throws an error, or returns a `status` that is not `UP`, `DEGRADED`, `DOWN`, or `MAINTENANCE`.

Cheerio runs about 20 times slower in the sandbox than in Node.js. A 1 MB page takes about 2 seconds. A response body above 100 MB can go over the memory limit.

### Replace `fetch` in an eval {#replace-fetch}

- **The second URL is fixed**: add a second [API monitor](/docs/v4/monitors/api). To show one status, add both monitors to a [Group monitor](/docs/v4/monitors/group). When only one of the two is **DOWN**, the group reports **DEGRADED**, so an alert on **DOWN** alone does not fire.
- **The second URL comes from the first response, or the check needs a login**: run your own script outside Kener. Make the script call the URL of a [Heartbeat monitor](/docs/v4/monitors/heartbeat) when every step passes.

## Stored secrets {#stored-secrets}

The dashboard and the REST API show these stored values as `********`: each header value, the request `body`, the `proxy` URL, a SQL `connectionString`, a Docker `tlsKey`, and a heartbeat `secretString`. Monitor checks use the real values.

- The dashboard shows the heartbeat secret to users with `monitors.write`, so they can copy the heartbeat URL.
- A save that sends `********` back keeps the stored value. To change a secret, type the new value.
- A `$SECRET` reference such as `Bearer $API_TOKEN` is masked too. The value stays in the environment variable.

## Related docs {#related-docs}

- [Grace Period](/docs/v4/monitors/grace-period) — require N consecutive checks before a status change is recorded
- [Monitors (general)](/docs/v4/monitors)
- [Sharing Monitors](/docs/v4/sharing)
- [Alert Configurations](/docs/v4/alerting/alert-configurations)
