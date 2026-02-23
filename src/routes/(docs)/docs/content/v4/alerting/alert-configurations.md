---
title: "Alert Configurations"
description: "Create alert rules with thresholds, severity, and trigger routing"
---

Alert configurations define when notifications should be sent for a monitor.

## Required settings {#required-settings}

Each configuration needs:

- monitor
- alert type (`STATUS`, `LATENCY`, or `UPTIME`)
- alert value
- failure threshold
- success threshold
- at least one trigger

## Alert value by type {#alert-value-by-type}

| Alert type | Value format                      |
| :--------- | :-------------------------------- |
| `STATUS`   | `DOWN` or `DEGRADED`              |
| `LATENCY`  | latency threshold in milliseconds |
| `UPTIME`   | minimum uptime percentage         |

## Threshold behavior {#threshold-behavior}

- **Failure threshold**: consecutive failing evaluations before `TRIGGERED`
- **Success threshold**: consecutive passing evaluations before `RESOLVED`

Higher thresholds reduce noise; lower thresholds detect faster.

## Severity and incidents {#severity-and-incidents}

- Severity is `CRITICAL` or `WARNING`.
- Optional incident creation links alert events to incidents.

## Common patterns {#common-patterns}

### Critical outage alert {#critical-outage-alert}

- Type: `STATUS`
- Value: `DOWN`
- Failure threshold: `1`
- Success threshold: `2`
- Severity: `CRITICAL`

### Performance alert {#performance-alert}

- Type: `LATENCY`
- Value: `1000`
- Failure threshold: `3`
- Success threshold: `5`
- Severity: `WARNING`

## Troubleshooting {#troubleshooting}

- **Not triggering**: verify configuration is active and conditions actually fail consecutively
- **Not resolving**: verify success threshold and check for intermittent failures
- **No notifications**: verify attached trigger is active and correctly configured

## Related pages {#related-pages}

- [Triggers](/docs/alerting/triggers)
- [Templates](/docs/alerting/templates)
- [Webhook Examples](/docs/alerting/webhook-examples)
