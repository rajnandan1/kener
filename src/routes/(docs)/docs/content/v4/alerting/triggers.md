---
title: "Alert Triggers"
description: "Configure Webhook, Discord, Slack, and Email delivery channels"
---

Triggers are delivery channels used by alert configurations.

## Supported trigger types {#supported-trigger-types}

Runtime currently supports:

- `webhook`
- `discord`
- `slack`
- `email`

## Trigger meta by type {#trigger-meta-by-type}

| Type      | Key fields                                  |
| :-------- | :------------------------------------------ |
| `webhook` | `url`, `headers`, `webhook_body`            |
| `discord` | `url`, `discord_body`                       |
| `slack`   | `url`, `slack_body`                         |
| `email`   | `to`, `from`, `email_subject`, `email_body` |

> [!NOTE]
> For webhook headers, use an array shape: `[{"key":"Authorization","value":"Bearer $TOKEN"}]`.

## Template variables {#template-variables}

Trigger bodies/subjects can use Mustache variables. Use the canonical list in [Templates](/docs/alerting/templates).

## Secret handling {#secret-handling}

Use `$VAR_NAME` for runtime environment substitution in URL, headers, and body.

Examples:

- URL: `https://hooks.example.com/$HOOK_ID`
- Header value: `Bearer $API_TOKEN`
- Body value: `"token": "$WEBHOOK_SECRET"`

## Testing triggers {#testing-triggers}

Use the trigger test flow in Manage UI to validate payload, auth, and destination behavior before attaching to production alerts.

## Webhook provider examples {#webhook-provider-examples}

Telegram, PagerDuty, Teams, and other provider payload examples are in:

- [Alerting Trigger Examples Guide](/docs/v4/guides/alerting-trigger-examples)
