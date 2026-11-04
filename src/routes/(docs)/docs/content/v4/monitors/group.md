---
title: Group Monitor
description: Combine multiple monitors into a weighted aggregate status
---

Group monitors aggregate member monitor status and latency into one monitor.

## Minimum setup {#minimum-setup}

Requirements from current validation:

- at least **2** member monitors
- members must be active, non-group monitors
- weights must sum to approximately `1` (tolerance `0.01`)
- `executionDelay` must be `>= 1000` ms
- `latencyCalculation` in `AVG | MAX | MIN`

## Status scoring model {#status-scoring-model}

Member statuses are normalized to a 0–1 scale:

- `UP = 1`
- `DEGRADED = 0.5`
- `DOWN = 0`

Members in `MAINTENANCE` are treated as `UP` (score `1`) and do not affect the group status.

Weighted score:

```
Σ(member.weight * statusScore)
```

Mapped group status:

- `= 1` → **UP** (all members healthy)
- `> 0` and `< 1` → **DEGRADED** (partial failure)
- `= 0` → **DOWN** (all members down)

### Example {#scoring-example}

5 monitors with equal weight (`0.2` each), 1 is DOWN:

```
4 × 0.2 × 1 (UP) + 1 × 0.2 × 0 (DOWN) = 0.8 → DEGRADED
```

## Latency aggregation {#latency-aggregation}

Group latency uses selected mode:

- `AVG`: average member latency
- `MAX`: slowest member latency
- `MIN`: fastest member latency

## Execution delay {#execution-delay}

`executionDelay` (in milliseconds) controls how long the group monitor waits before running its aggregation. This delay gives member monitors time to complete their own checks and update the cache before the group reads their statuses.

- Default: `1000` (1 second). Minimum: `1000`.
- If member monitors take longer to finish (e.g. slow API checks), increase this value so the group always reads fresh results.
- Only affects cron-driven execution. When a member's status is updated via the API, the cache is updated immediately and the group will read the new value on its next run.

## Member layout {#member-layout}

On the status page and the monitor page, **Included Monitors** opens the group's members. **Member layout style** in the group's settings picks how they are laid out, with the same four styles as a [page's monitor layout](/docs/v4/pages#monitor-layout-style):

- `default-list` (default): one member per row, with status bars. Groups saved before this setting keep this layout.
- `default-grid`: two members per row on tablets and desktops, with status bars.
- `compact-list`: one member per row, without status bars.
- `compact-grid`: two members per row on tablets and three on desktops, without status bars.

Grids show one member per row on phones. The preview under the setting changes as soon as you pick a style; click **Save Monitor Type Settings** to apply it. Each group keeps its own style, whatever the page's layout is.

## Configuration fields {#configuration-fields}

| Field                | Type                                                     | Default        | Notes                                                                                    |
| :------------------- | :------------------------------------------------------- | :------------- | :--------------------------------------------------------------------------------------- |
| `monitors`           | `Array<{tag, weight}>`                                   | `[]`           | Required, min 2                                                                          |
| `executionDelay`     | `number`                                                 | `1000`         | ms to wait before aggregating; must be >= 1000                                           |
| `latencyCalculation` | `AVG\|MAX\|MIN`                                          | `AVG`          |                                                                                          |
| `memberLayoutStyle`  | `default-list\|default-grid\|compact-list\|compact-grid` | `default-list` | How the members are laid out; see [Member layout](/docs/v4/monitors/group#member-layout) |

## Example {#example}

```json
{
    "monitor_type": "GROUP",
    "type_data": {
        "monitors": [
            { "tag": "api", "weight": 0.6 },
            { "tag": "db", "weight": 0.3 },
            { "tag": "cache", "weight": 0.1 }
        ],
        "executionDelay": 1500,
        "latencyCalculation": "AVG",
        "memberLayoutStyle": "default-grid"
    }
}
```

## Troubleshooting {#troubleshooting}

- **Cannot save**: verify weights sum to `1`, min member count, and delay >= `1000`
- **Unexpected stale status (cron)**: increase `executionDelay` so member checks finish before the group aggregates
- **Unexpected stale status (API updates)**: ensure you are running a version that updates the cache on API writes — older versions only updated the cache from cron, causing the group to miss API-driven status changes
- **Group too sensitive/lenient**: adjust weights — higher weight on critical monitors makes their failure impact the group score more
