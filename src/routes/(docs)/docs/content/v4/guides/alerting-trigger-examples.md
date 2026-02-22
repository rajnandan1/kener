---
title: Alerting Trigger Examples
description: Copy-ready webhook payload examples for Telegram and other common providers
---

Use these with a **Webhook** trigger. All examples use runtime-supported Mustache variables and `$ENV_VAR` secret interpolation.

## Telegram {#telegram}

```text
URL: https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage
```

```json
{
    "chat_id": "$TELEGRAM_CHAT_ID",
    "text": "{{#is_triggered}}🚨 *Alert Triggered*{{/is_triggered}}{{#is_resolved}}✅ *Alert Resolved*{{/is_resolved}}\n\n*{{alert_name}}*\nStatus: {{alert_status}}\nSeverity: {{alert_severity}}\nType: {{alert_for}}\nValue: {{alert_value}}\n\n{{alert_message}}\n\n[{{alert_cta_text}}]({{alert_cta_url}})",
    "parse_mode": "Markdown",
    "disable_web_page_preview": true
}
```

## PagerDuty Events API v2 {#pagerduty}

```text
URL: https://events.pagerduty.com/v2/enqueue
```

```json
{
    "routing_key": "$PAGERDUTY_INTEGRATION_KEY",
    "event_action": "{{#is_triggered}}trigger{{/is_triggered}}{{#is_resolved}}resolve{{/is_resolved}}",
    "dedup_key": "kener-{{alert_id}}",
    "payload": {
        "summary": "{{alert_name}} - {{alert_status}}",
        "source": "{{alert_source}}",
        "severity": "{{#is_triggered}}critical{{/is_triggered}}{{#is_resolved}}info{{/is_resolved}}",
        "timestamp": "{{alert_timestamp}}"
    },
    "links": [{ "href": "{{alert_cta_url}}", "text": "{{alert_cta_text}}" }]
}
```

## Microsoft Teams (Incoming Webhook) {#teams}

```text
URL: $TEAMS_WEBHOOK_URL
```

```json
{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "{{#is_triggered}}D13438{{/is_triggered}}{{#is_resolved}}28A745{{/is_resolved}}",
    "summary": "{{alert_name}}",
    "sections": [
        {
            "activityTitle": "{{#is_triggered}}🚨 Alert Triggered{{/is_triggered}}{{#is_resolved}}✅ Alert Resolved{{/is_resolved}}",
            "facts": [
                { "name": "Status", "value": "{{alert_status}}" },
                { "name": "Severity", "value": "{{alert_severity}}" },
                { "name": "Type", "value": "{{alert_for}}" },
                { "name": "Value", "value": "{{alert_value}}" }
            ],
            "markdown": true
        }
    ],
    "potentialAction": [
        {
            "@type": "OpenUri",
            "name": "{{alert_cta_text}}",
            "targets": [{ "os": "default", "uri": "{{alert_cta_url}}" }]
        }
    ]
}
```

## Opsgenie {#opsgenie}

```text
URL: https://api.opsgenie.com/v2/alerts
Headers: [{"key":"Authorization","value":"GenieKey $OPSGENIE_API_KEY"},{"key":"Content-Type","value":"application/json"}]
```

```json
{
    "message": "{{alert_name}}",
    "alias": "kener-alert-{{alert_id}}",
    "description": "{{alert_message}}",
    "priority": "{{#is_triggered}}P1{{/is_triggered}}{{#is_resolved}}P5{{/is_resolved}}",
    "source": "{{alert_source}}",
    "details": {
        "status": "{{alert_status}}",
        "severity": "{{alert_severity}}",
        "type": "{{alert_for}}",
        "value": "{{alert_value}}",
        "time": "{{alert_timestamp}}"
    }
}
```

## Generic custom API {#generic-api}

```text
URL: https://api.example.com/alerts
Headers: [{"key":"Authorization","value":"Bearer $CUSTOM_API_TOKEN"},{"key":"Content-Type","value":"application/json"}]
```

```json
{
    "alert": {
        "id": "{{alert_id}}",
        "name": "{{alert_name}}",
        "status": "{{alert_status}}",
        "severity": "{{alert_severity}}"
    },
    "monitor": {
        "type": "{{alert_for}}",
        "value": "{{alert_value}}",
        "failure_threshold": "{{alert_failure_threshold}}",
        "success_threshold": "{{alert_success_threshold}}"
    },
    "context": {
        "message": "{{alert_message}}",
        "timestamp": "{{alert_timestamp}}",
        "url": "{{alert_cta_url}}"
    },
    "site": {
        "name": "{{site_name}}",
        "url": "{{site_url}}"
    }
}
```

## Required environment variables {#required-env}

```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
PAGERDUTY_INTEGRATION_KEY=...
TEAMS_WEBHOOK_URL=...
OPSGENIE_API_KEY=...
CUSTOM_API_TOKEN=...
```

## Notes {#notes}

- Use `$VAR_NAME` for secrets (not `{{env.VAR_NAME}}`).
- Webhook headers must be key/value array entries.
- Validate provider payloads with test channels before production routing.
