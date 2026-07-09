---
title: Grace Period (Confirmation Threshold)
description: Require N consecutive checks before a status change is recorded, so transient blips don't count as downtime
---

A grace period makes a monitor ignore transient flapping: its recorded status changes only after several consecutive checks agree. A single failed ping no longer registers as downtime or dents your uptime %.

## How it works {#how-it-works}

The grace period is a count of consecutive checks (internally the **Confirmation Threshold**). With a grace period of `N`, a monitor's recorded status flips between healthy (`UP`) and unhealthy (`DOWN`/`DEGRADED`) only after `N` consecutive checks land on the new side. Shorter runs are treated as transient and never appear as a status change.

It is **count-based, not time-based**: `5` means 5 consecutive checks. On an every-minute cron that is about 5 minutes.

Example — grace period `5`, every-minute checks:

```
11:05  ping fails   → still UP (1/5)
11:06  ping fails   → still UP (2/5)
11:07  ping fails   → still UP (3/5)
11:08  ping fails   → still UP (4/5)
11:09  ping fails   → DOWN, recorded from 11:05 (5/5)
```

If the check recovers before the 5th failure, the whole stretch stays `UP`.

> [!NOTE]
> The change is **retroactive**. When an outage is confirmed it is recorded from its first failing check, not the moment of confirmation, so start times stay accurate. Recovery is symmetric — the monitor returns to `UP` from the first recovering check, again after `N` consecutive successes.

## Enable it {#enable}

Set it per monitor in **Manage → Monitors → _(monitor)_ → General Settings → Grace period**.

| Setting | Values | Default | Meaning |
|---|---|---|---|
| Grace period (`confirmation_threshold`) | integer `1`–`60` | `1` | Consecutive checks required to confirm a status change. `1` disables damping (every check is recorded immediately). |

> [!NOTE]
> A grace period of `1` is the default and reproduces Kener's previous behavior exactly — no damping, no delay.

## API {#api}

Set `confirmation_threshold` when creating or updating a monitor:

```json
PATCH /api/v4/monitors/{monitor_tag}
{ "confirmation_threshold": 5 }
```

It is validated as an integer between `1` and `60`. See the [API Reference](/docs/v4/api-reference).

## What gets damped {#scope}

The grace period damps the **recorded timeline** — status bars, current status, and uptime % — not just alerts. Everything that reads a monitor's status sees the confirmed value.

- Applies to **all monitor types** uniformly (a no-op for monitors that never flap).
- Counts only scheduled checks.
- `DEGRADED` counts as "not `UP`": a service flapping between `DOWN` and `DEGRADED` still confirms unhealthy. Changing severity *within* an already-unhealthy stretch (`DOWN` ↔ `DEGRADED`) is recorded immediately.

## During the grace window {#during-window}

While a change is pending confirmation, the monitor keeps showing its current confirmed status (for example, still `UP`). No diagnostic data is lost: the held sample keeps its **real latency** and its **error text**, tagged `| Status held during grace period`. Once confirmed, the backfilled samples append `| Down confirmed after N consecutive checks`.

## Interactions {#interactions}

- **Alerts** — [alert failure/success thresholds](/docs/v4/alerting/alert-configurations) evaluate the already-damped timeline, so the effective delay is the **larger** of the grace period and the alert threshold (a max, not a sum).
- **Maintenance & incidents** — while a [maintenance](/docs/v4/maintenances/impact-on-monitoring) or incident overlay is active, it wins the display and the grace count **freezes**; a fresh count begins when normal monitoring resumes.
- **NO_DATA** — a no-data check stays grey, is **neutral** to the count (neither advances nor resets it), and is never rewritten.
- **Manual / API pushes & default status** — data-API pushes and default-status fill pass through undamped and do not move the count.
- **Group monitors** — a [group](/docs/v4/monitors/group) scores on its members' confirmed status, so member grace periods propagate automatically. Set a grace period on the group itself only if you also want to damp the aggregate.
- **Heartbeat** — stacks on top of the heartbeat's own down/degraded timing.

## Verify {#verify}

1. Set a grace period of `3` on a test monitor and save.
2. Make the target fail for 2 checks → status stays `UP`.
3. Let it fail a 3rd consecutive check → status flips to `DOWN` and the prior 2 samples backfill to `DOWN`.
4. Restore the target → after 3 consecutive successes it returns to `UP`.

> [!TIP]
> Pick a grace period slightly longer than your typical transient blip but short enough to still catch real outages quickly. For an every-minute monitor, `3`–`5` is a good starting point.

## Related docs {#related}

- [Monitors Overview](/docs/v4/monitors/overview)
- [Alert Configurations](/docs/v4/alerting/alert-configurations)
- [Maintenance impact on monitoring](/docs/v4/maintenances/impact-on-monitoring)
