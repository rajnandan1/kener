---
title: Mattermost Webhook Trigger
description: Send Kener alerts to Mattermost using the Webhook trigger with Slack-compatible payloads
---

Use this guide to send Kener alerts to Mattermost via **Incoming Webhooks** using the **Webhook** trigger type.

Mattermost supports Slack-compatible webhook payloads, so you can reuse the same JSON body patterns with minor adjustments.

## Quick setup {#quick-setup}

1. In Mattermost, create an **Incoming Webhook** and copy the webhook URL.
2. In Kener, go to **Manage → Alerting → Triggers**.
3. Create a new trigger with:
    - **Type**: `webhook`
    - **URL**: `$MATTERMOST_WEBHOOK_URL`
    - **Headers**: `[{"key":"Content-Type","value":"application/json"}]`
4. Set the webhook body from the example below.
5. Save and run a trigger test.

## Example webhook body {#example-webhook-body}

```json
{
    "text": "{{#is_triggered}}:rotating_light: Alert Triggered{{/is_triggered}}{{#is_resolved}}:white_check_mark: Alert Resolved{{/is_resolved}}\n\n**{{alert_name}}**\nStatus: {{alert_status}}\nSeverity: {{alert_severity}}\nType: {{alert_for}}\nValue: {{alert_value}}\n\n{{alert_message}}\n\n[{{alert_cta_text}}]({{alert_cta_url}})"
}
```

## Required variables {#required-variables}

| Variable                 | Required | Description                          |
| :----------------------- | :------- | :----------------------------------- |
| `MATTERMOST_WEBHOOK_URL` | Yes      | Incoming webhook URL from Mattermost |

## Verification {#verification}

After saving the trigger:

1. Use the trigger test button in Kener.
2. Confirm a message appears in the target Mattermost channel.
3. Verify both trigger and resolve flows render as expected.

## Troubleshooting {#troubleshooting}

- **HTTP 400/403 from Mattermost**: Re-check webhook URL and channel permissions.
- **No message in channel**: Confirm the webhook is active and mapped to the expected channel/team.
- **Variables not rendering**: Ensure you used Mustache variables like `{{alert_name}}` and not escaped placeholders.
- **Secrets exposed in UI**: Use `$MATTERMOST_WEBHOOK_URL` in URL/body/headers and define it in environment variables.

## Related docs {#related-docs}

- [Alert Triggers](/docs/v4/alerting/triggers)
- [Alerting Trigger Examples](/docs/v4/guides/alerting-trigger-examples)
- [Templates](/docs/v4/alerting/templates)
