---
title: Prometheus Monitor
description: Monitor any metric with a PromQL instant query and threshold-based status
---

Prometheus monitors run a [PromQL instant query](https://prometheus.io/docs/prometheus/latest/querying/basics/) against a Prometheus server's `/api/v1/query` endpoint, derive status from optional threshold conditions on the returned value, and record the metric value itself as the per-check measurement.

This replaces pointing an API monitor at Prometheus and hand-writing an `eval` function.

## Minimum setup {#minimum-setup}

Set:

- `url` — the Prometheus base URL (e.g. `https://prometheus.example.com`; base paths like `https://host/prom` work)
- `query` — a PromQL instant query that returns a scalar or an instant vector

With no thresholds configured, the monitor is **UP** whenever the query succeeds and returns data, and follows `noDataStatus` when it returns nothing.

## Status logic {#status-logic}

For each check the metric value is evaluated in this order:

1. Transport, HTTP, or query error → **DOWN**
2. Empty result or `NaN` value → `noDataStatus` (default **DOWN**)
3. `down` condition matches → **DOWN**
4. `degraded` condition matches → **DEGRADED**
5. Otherwise → **UP**

A condition matches when `value <operator> threshold` is true, with the metric value as the left operand. For example a `down` condition of `> 0.95` reads "down when the value is greater than 0.95". `down` is checked before `degraded`, so overlapping conditions resolve to **DOWN**.

## Recorded measurement {#recorded-measurement}

The charted per-check number is always the **metric value**, not the HTTP round-trip time. Non-finite values (`NaN`, `±Inf`) and empty results are charted as `0`; status still follows the rules above.

## Configuration fields {#configuration-fields}

| Field                 | Type      | Default  | Notes                                                       |
| :-------------------- | :-------- | :------- | :---------------------------------------------------------- |
| `url`                 | `string`  | —        | Required. Prometheus base URL; base paths like `/prom` work |
| `query`               | `string`  | —        | Required. PromQL instant query                              |
| `down`                | `object`  | —        | Optional `{ operator, value }`; matches → DOWN              |
| `degraded`            | `object`  | —        | Optional `{ operator, value }`; matches → DEGRADED          |
| `noDataStatus`        | `string`  | `"DOWN"` | Empty-result status: `UP` / `DEGRADED` / `DOWN`             |
| `headers`             | `array`   | `[]`     | Key/value pairs; `$SECRET` env substitution applies         |
| `timeout`             | `number`  | `10000`  | Request timeout in ms                                       |
| `allowSelfSignedCert` | `boolean` | `false`  | Skip TLS certificate verification                           |

`operator` is one of `>`, `>=`, `<`, `<=`, `==`, `!=`.

## Example {#example}

```json
{
    "type": "PROMETHEUS",
    "type_data": {
        "url": "https://prometheus.example.com",
        "query": "avg(rate(http_requests_total{job=\"api\"}[5m]))",
        "degraded": { "operator": "<", "value": 100 },
        "down": { "operator": "<", "value": 10 },
        "noDataStatus": "DOWN",
        "timeout": 10000
    }
}
```

## Notes and caveats {#notes}

- **Aggregate multi-series queries in PromQL.** If a query returns more than one series, only the **first** is used. Wrap the query in `max(...)`, `sum(...)`, `avg(...)`, etc. so a single series is returned deterministically.
- **Float-equality caveat.** Prometheus sample values are floating point. Avoid `==` / `!=` against computed values (rates, averages) — floating-point rounding makes exact matches unreliable. Prefer range operators (`<`, `>`, `<=`, `>=`); reserve `==` / `!=` for integer-valued gauges.
- **Absent-but-healthy metrics.** For metrics that legitimately disappear (e.g. a counter that only exists while a job runs), append `or vector(0)` to the query so it always returns a value, instead of relying on `noDataStatus`.
- **Authentication.** Add an `Authorization` header under `headers`; use `$SECRET_NAME` to substitute an environment variable. Secret substitution applies to the URL and header values only — never to the query.

## Troubleshooting {#troubleshooting}

- **Immediate DOWN with an error message**: use "Test Monitor" — a bad PromQL query surfaces the Prometheus `error` field; an unreachable server surfaces the network error.
- **Always no-data**: the query matched no series. Verify the query in Prometheus's own UI, or append `or vector(0)`.
- **"query must return an instant vector or scalar"**: the query produced a range/matrix result. Use an instant query (no `[range]` in the outermost expression), or aggregate.
