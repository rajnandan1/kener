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

## Default Status {#default-status}

Default Status is the monitor's answer to the question: **what does a minute with no monitoring sample mean?**

| Value        | Behavior                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `NONE`       | Gap minutes show as no data (gray)                                                                                        |
| `UP`         | A `DEFAULT` sample is written each minute marking the service UP                                                          |
| `DOWN`       | A `DEFAULT` sample is written each minute marking the service DOWN                                                        |
| `DEGRADED`   | A `DEFAULT` sample is written each minute marking the service DEGRADED                                                    |
| `LAST_KNOWN` | Each minute without a new sample, Kener writes a `CARRIED` row repeating the most recent alert-visible status and latency |

### Last known status {#last-known-status}

`LAST_KNOWN` is only available on **Manual (`NONE`-type) monitors**. If you select it on any other monitor type, the API resets it to `UP`. Changing a monitor's type away from Manual also resets it to `UP`.

How it works:

- Every scheduler tick with no new data, Kener writes a `CARRIED` sample copying the status and latency of the most recent alert-visible sample.
- Carry is tick-forward only — it starts at the next scheduler tick after you save the setting, with no backfill of past gaps.
- Carried rows persist in history even if you later change the setting.

Example push flow:

```bash
curl -X PATCH 'https://status.example.com/api/v4/monitors/my-service/data/{current_unix_minute}' \
  -H 'Authorization: Bearer <api-key>' \
  -H 'Content-Type: application/json' \
  --data '{"status": "DOWN", "latency": 100}'
# With Default Status = Last known status, the monitor stays DOWN until you push UP.
```

> [!WARNING]
>
> - If your integration stops sending, the page keeps showing the last status indefinitely — Kener cannot tell "still up" from "stopped reporting". Use a [Heartbeat monitor](/docs/v4/monitors/heartbeat) to catch a silent integration.
> - Carried minutes count toward alert thresholds: a single DOWN push will trigger alerts after your failure threshold, and they stay triggered until you push a recovery.

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
- [Group Monitor](/docs/v4/monitors/group) — Weighted aggregate of member monitors

## Related docs {#related-docs}

- [Monitors (general)](/docs/v4/monitors)
- [Sharing Monitors](/docs/v4/sharing)
- [Alert Configurations](/docs/v4/alerting/alert-configurations)
