---
title: "Alert Templates"
description: "Use Mustache variables to customize webhook, chat, and email alert messages"
---

Templates define the body and subject sent by triggers. Kener uses Mustache rendering.

## Canonical alert variables {#canonical-alert-variables}

| Variable                      |
| :---------------------------- |
| `{{alert_id}}`                |
| `{{alert_name}}`              |
| `{{alert_for}}`               |
| `{{alert_value}}`             |
| `{{alert_status}}`            |
| `{{alert_severity}}`          |
| `{{alert_message}}`           |
| `{{alert_source}}`            |
| `{{alert_timestamp}}`         |
| `{{alert_cta_url}}`           |
| `{{alert_cta_text}}`          |
| `{{alert_incident_id}}`       |
| `{{alert_incident_url}}`      |
| `{{alert_failure_threshold}}` |
| `{{alert_success_threshold}}` |
| `{{is_resolved}}`             |
| `{{is_triggered}}`            |

`{{alert_name}}` is the tag of the monitor the alert fired for. The shipped templates build their headline as `Alert {{alert_name}} for {{alert_for}} {{alert_value}} {{alert_status}} at {{alert_timestamp}}`. Existing triggers whose subject or title is a bare `{{alert_name}}` can paste that string to keep the full headline.

## Canonical site variables {#canonical-site-variables}

| Variable                 |
| :----------------------- |
| `{{site_url}}`           |
| `{{site_name}}`          |
| `{{site_logo_url}}`      |
| `{{colors_up}}`          |
| `{{colors_down}}`        |
| `{{colors_degraded}}`    |
| `{{colors_maintenance}}` |

## Mustache patterns {#mustache-patterns}

Basic interpolation:

```text
{{alert_name}}
```

Conditional sections:

```text
{{#is_triggered}}TRIGGERED{{/is_triggered}}{{#is_resolved}}RESOLVED{{/is_resolved}}
```

## Runtime default templates {#runtime-default-templates}

Default templates are defined in:

- webhook: `src/lib/server/templates/webhook_alert_template.ts`
- discord: `src/lib/server/templates/discord_alert_template.ts`
- slack: `src/lib/server/templates/slack_alert_template.ts`
- email: `src/lib/server/templates/email_alert_template.ts`

## Secret interpolation {#secret-interpolation}

Use `$VAR_NAME` (not `{{env.VAR_NAME}}`) for secrets.

```text
Authorization: Bearer $API_TOKEN
```

## Troubleshooting {#troubleshooting}

- **Variables show empty**: variable not present for that event
- **Conditional block not rendering**: verify section syntax and boolean variable name
- **Secrets not replaced**: confirm env var exists in runtime environment

## Related pages {#related-pages}

- [Triggers](/docs/v4/alerting/triggers)
- [Webhook Examples](/docs/v4/alerting/webhook-examples)
