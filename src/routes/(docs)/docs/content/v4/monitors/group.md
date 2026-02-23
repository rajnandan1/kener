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

Member statuses are scored as:

- `UP = 0`
- `DEGRADED = 1`
- `DOWN = 2`
- `MAINTENANCE = 3`

Weighted score:

```
Σ(member.weight * statusScore)
```

Mapped group status:

- `< 1` → **UP**
- `>= 1` and `< 2` → **DEGRADED**
- `>= 2` and `< 3` → **DOWN**
- `>= 3` → **MAINTENANCE**

## Latency aggregation {#latency-aggregation}

Group latency uses selected mode:

- `AVG`: average member latency
- `MAX`: slowest member latency
- `MIN`: fastest member latency

## Configuration fields {#configuration-fields}

| Field                | Type                   | Default | Notes           |
| :------------------- | :--------------------- | :------ | :-------------- |
| `monitors`           | `Array<{tag, weight}>` | `[]`    | Required, min 2 |
| `executionDelay`     | `number`               | `1000`  | Must be >= 1000 |
| `latencyCalculation` | `AVG\|MAX\|MIN`        | `AVG`   |                 |

## Example {#example}

```json
{
    "type": "GROUP",
    "type_data": {
        "monitors": [
            { "tag": "api", "weight": 0.6 },
            { "tag": "db", "weight": 0.3 },
            { "tag": "cache", "weight": 0.1 }
        ],
        "executionDelay": 1500,
        "latencyCalculation": "AVG"
    }
}
```

## Troubleshooting {#troubleshooting}

- **Cannot save**: verify weights sum to `1`, min member count, and delay >= `1000`
- **Unexpected stale status**: increase `executionDelay` so member checks finish first
- **Group too optimistic/pessimistic**: rebalance weights toward critical components
