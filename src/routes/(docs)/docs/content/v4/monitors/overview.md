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
- [Group Monitor](/docs/v4/monitors/group) — Weighted aggregate of member monitors

## Related docs {#related-docs}

- [Monitors (general)](/docs/v4/monitors)
- [Sharing Monitors](/docs/v4/sharing)
- [Alert Configurations](/docs/v4/alerting/alert-configurations)
