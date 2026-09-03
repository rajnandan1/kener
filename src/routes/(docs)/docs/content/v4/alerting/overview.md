---
title: "Alerting Overview"
description: "How alerts are evaluated, triggered, and delivered in Kener"
---

Kener alerting turns monitor signals into notifications through configured triggers.

## Flow {#flow}

```
Monitor result -> Alert configuration evaluation -> Alert event -> Trigger delivery
```

## Alert types {#alert-types}

- **STATUS**: evaluates monitor status (`DOWN` or `DEGRADED` targets)
- **LATENCY**: evaluates latency threshold in milliseconds
- **UPTIME**: evaluates uptime percentage threshold

## Trigger lifecycle {#trigger-lifecycle}

Each alert event is sent as:

- `TRIGGERED` when failure threshold is reached
- `RESOLVED` when success threshold is reached

If incident creation is enabled on the configuration, Kener can also create/update incidents from alert events.

## Supported trigger providers {#supported-trigger-providers}

Current runtime supports:

- `webhook`
- `discord`
- `slack`
- `email`

## Template variable model {#template-variable-model}

Trigger templates render with alert and site variables (for example `{{alert_name}}`, `{{alert_status}}`, `{{site_name}}`, `{{site_url}}`).

Use [Templates](/docs/v4/alerting/templates) for the canonical variable list.

## Secret interpolation {#secret-interpolation}

Secrets are interpolated from environment variables using `$VAR_NAME` syntax (not `{{env.VAR_NAME}}`).

Example:

```
Authorization: Bearer $API_TOKEN
```

## Next steps {#next-steps}

- [Alert Configurations](/docs/v4/alerting/alert-configurations)
- [Triggers](/docs/v4/alerting/triggers)
- [Templates](/docs/v4/alerting/templates)
- [Webhook Examples](/docs/v4/alerting/webhook-examples)
