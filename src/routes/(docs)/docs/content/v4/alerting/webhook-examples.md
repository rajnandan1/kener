---
title: "Webhook Examples"
description: "Practical webhook integration examples for Telegram, PagerDuty, Microsoft Teams, and other popular services."
---

Webhooks allow you to integrate Kener with virtually any service by sending HTTP POST requests with alert data. This guide provides practical examples for popular services and custom integrations.

## Overview {#overview}

Kener's webhook trigger sends POST requests to your specified URL with:

- Custom headers (optional)
- JSON body with alert data
- Mustache variable substitution
- Environment variable support for secrets

All examples use environment variables for sensitive credentials. Never hard-code API keys or tokens directly in your webhook configuration.

## Example 1: Telegram {#example-telegram}

Send alert notifications to a Telegram chat using the Telegram Bot API.

### Step 1: Create a Telegram Bot {#telegram-create-bot}

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` command
3. Follow prompts to set bot name and username
4. **Copy the bot token** (looks like `110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw`)

### Step 2: Get Your Chat ID {#telegram-get-chat-id}

**Option A: Using @userinfobot**

1. Search for **@userinfobot** in Telegram
2. Start a chat with it
3. It will reply with your user ID (this is your chat ID)

**Option B: Using getUpdates API**

1. Send a message to your bot
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Look for `"chat":{"id":123456789}` in the response
4. Use this ID as your chat ID

**For Groups:**

1. Add your bot to the group
2. Send a message in the group
3. Visit the getUpdates URL above
4. Look for the negative chat ID (like `-987654321`)

### Step 3: Configure Environment Variables {#telegram-env-variables}

Add to your `.env` file:

```bash
TELEGRAM_BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
TELEGRAM_CHAT_ID=123456789
```

### Step 4: Create Webhook Trigger in Kener {#telegram-create-trigger}

Navigate to `/manage/app/triggers` and create a new Webhook trigger:

**Name:** `Telegram Notifications`

**URL:** `https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage`

**Headers:** (Leave empty or set to `{"Content-Type": "application/json"}`)

**Body:**

```json
{
    "chat_id": "$TELEGRAM_CHAT_ID",
    "text": "{{#is_triggered}}🚨 *ALERT TRIGGERED*{{/is_triggered}}{{#is_resolved}}✅ *ALERT RESOLVED*{{/is_resolved}}\n\n*{{alert_name}}*\n\n⚠️ *Severity:* {{alert_severity}}\n📈 *Status:* {{alert_status}}\n📋 *Type:* {{alert_for}}\n📊 *Value:* {{alert_value}}\n\n{{alert_message}}\n\n*Thresholds:*\nFailure: {{alert_failure_threshold}}\nSuccess: {{alert_success_threshold}}\nTime: {{alert_timestamp}}\n\n[{{alert_cta_text}}]({{alert_cta_url}})",
    "parse_mode": "Markdown",
    "disable_web_page_preview": true
}
```

### Enhanced Telegram with Buttons {#telegram-with-buttons}

For inline keyboard buttons:

```json
{
    "chat_id": "$TELEGRAM_CHAT_ID",
    "text": "{{#is_triggered}}🚨 *ALERT TRIGGERED*{{/is_triggered}}{{#is_resolved}}✅ *ALERT RESOLVED*{{/is_resolved}}\n\n*{{alert_name}}*\n\n⚠️ *Severity:* {{alert_severity}}\n📈 *Status:* {{alert_status}}\n\n{{alert_message}}",
    "parse_mode": "Markdown",
    "reply_markup": {
        "inline_keyboard": [
            [
                {
                    "text": "🔍 {{alert_cta_text}}",
                    "url": "{{alert_cta_url}}"
                },
                {
                    "text": "📊 Status Page",
                    "url": "{{site_url}}"
                }
            ]
        ]
    }
}
```

### Telegram with HTML Formatting {#telegram-html-formatting}

Using HTML instead of Markdown:

```json
{
    "chat_id": "$TELEGRAM_CHAT_ID",
    "text": "{{#is_triggered}}🚨 <b>ALERT TRIGGERED</b>{{/is_triggered}}{{#is_resolved}}✅ <b>ALERT RESOLVED</b>{{/is_resolved}}\n\n<b>{{alert_name}}</b>\n\n<b>Severity:</b> {{alert_severity}}\n<b>Status:</b> {{alert_status}}\n<b>Type:</b> {{alert_for}}\n\n{{alert_message}}\n\n<b>Failure Threshold:</b> {{alert_failure_threshold}}\n<b>Success Threshold:</b> {{alert_success_threshold}}\n<b>Time:</b> {{alert_timestamp}}\n\n<a href=\"{{alert_cta_url}}\">{{alert_cta_text}}</a>",
    "parse_mode": "HTML",
    "disable_web_page_preview": true
}
```

## Example 2: PagerDuty {#example-pagerduty}

Integrate with PagerDuty Events API v2 for incident management.

### Step 1: Get Integration Key {#pagerduty-get-key}

1. In PagerDuty, go to **Services**
2. Select your service or create a new one
3. Go to **Integrations** tab
4. Add integration → **Events API V2**
5. **Copy the Integration Key**

### Step 2: Configure Environment Variables {#pagerduty-env-variables}

```bash
PAGERDUTY_INTEGRATION_KEY=abcd1234efgh5678ijkl
```

### Step 3: Create Webhook Trigger {#pagerduty-create-trigger}

**Name:** `PagerDuty Critical Alerts`

**URL:** `https://events.pagerduty.com/v2/enqueue`

**Headers:**

```json
{
    "Content-Type": "application/json"
}
```

**Body:**

```json
{
    "routing_key": "$PAGERDUTY_INTEGRATION_KEY",
    "event_action": "{{#is_triggered}}trigger{{/is_triggered}}{{#is_resolved}}resolve{{/is_resolved}}",
    "dedup_key": "kener-{{alert_id}}",
    "payload": {
        "summary": "{{alert_name}} - {{alert_status}}",
        "source": "{{alert_source}}",
        "severity": "{{#alert_severity}}critical{{/alert_severity}}",
        "timestamp": "{{alert_timestamp}}",
        "component": "{{alert_for}}",
        "group": "monitoring",
        "class": "{{alert_for}}",
        "custom_details": {
            "alert_name": "{{alert_name}}",
            "alert_type": "{{alert_for}}",
            "alert_value": "{{alert_value}}",
            "failure_threshold": "{{alert_failure_threshold}}",
            "success_threshold": "{{alert_success_threshold}}",
            "status": "{{alert_status}}",
            "message": "{{alert_message}}",
            "alert_url": "{{alert_cta_url}}"
        }
    },
    "links": [
        {
            "href": "{{alert_cta_url}}",
            "text": "View in Kener"
        }
    ]
}
```

**Notes:**

- `event_action`: "trigger" creates incident, "resolve" closes it
- `dedup_key`: Groups related events (uses Kener alert ID)
- `severity`: critical, error, warning, or info
- PagerDuty automatically handles acknowledgments and escalations

## Example 3: Microsoft Teams {#example-teams}

Send alerts to Microsoft Teams channels via incoming webhooks.

### Step 1: Create Incoming Webhook {#teams-create-webhook}

1. In Teams, go to your channel
2. Click **•••** → **Connectors** → **Incoming Webhook**
3. Configure and **copy the webhook URL**

### Step 2: Configure Environment Variables {#teams-env-variables}

```bash
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/abc123.../IncomingWebhook/xyz789...
```

### Step 3: Create Webhook Trigger {#teams-create-trigger}

**Name:** `Microsoft Teams Alerts`

**URL:** `$TEAMS_WEBHOOK_URL`

**Body:**

```json
{
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "{{#is_triggered}}D13438{{/is_triggered}}{{#is_resolved}}28A745{{/is_resolved}}",
    "summary": "{{alert_name}}",
    "sections": [
        {
            "activityTitle": "{{#is_triggered}}🚨 Alert Triggered{{/is_triggered}}{{#is_resolved}}✅ Alert Resolved{{/is_resolved}}",
            "activitySubtitle": "{{alert_name}}",
            "facts": [
                {
                    "name": "Monitor:",
                    "value": "{{alert_for}}"
                },
                {
                    "name": "Status:",
                    "value": "{{alert_status}}"
                },
                {
                    "name": "Severity:",
                    "value": "{{alert_severity}}"
                },
                {
                    "name": "Current Value:",
                    "value": "{{alert_value}}"
                },
                {
                    "name": "Threshold:",
                    "value": "{{alert_failure_threshold}}"
                },
                {
                    "name": "Time:",
                    "value": "{{alert_timestamp}}"
                }
            ],
            "markdown": true
        }
    ],
    "potentialAction": [
        {
            "@type": "OpenUri",
            "name": "View Monitor",
            "targets": [
                {
                    "os": "default",
                    "uri": "{{alert_cta_url}}"
                }
            ]
        }
    ]
}
```

## Example 4: Opsgenie {#example-opsgenie}

Send alerts to Opsgenie for on-call management.

### Setup {#opsgenie-setup}

**Environment Variables:**

```bash
OPSGENIE_API_KEY=your-api-key-here
```

**URL:** `https://api.opsgenie.com/v2/alerts`

**Headers:**

```json
{
    "Authorization": "GenieKey $OPSGENIE_API_KEY",
    "Content-Type": "application/json"
}
```

**Body:**

```json
{
    "message": "{{alert_name}}",
    "alias": "kener-alert-{{alert_id}}",
    "description": "{{alert_message}}\n\nMonitor: {{alert_for}}\nCurrent: {{alert_value}}\nThreshold: {{alert_failure_threshold}}",
    "priority": "{{#alert_severity}}P1{{/alert_severity}}",
    "source": "{{alert_source}}",
    "entity": "{{alert_for}}",
    "tags": ["kener", "{{alert_severity}}", "{{alert_for}}"],
    "details": {
        "alert_name": "{{alert_name}}",
        "monitor": "{{alert_for}}",
        "status": "{{alert_status}}",
        "severity": "{{alert_severity}}",
        "current_value": "{{alert_value}}",
        "threshold": "{{alert_failure_threshold}}",
        "timestamp": "{{alert_timestamp}}",
        "alert_url": "{{alert_cta_url}}"
    }
}
```

## Example 5: Mattermost {#example-mattermost}

Send alerts to Mattermost channels.

### Setup {#mattermost-setup}

**Environment Variables:**

```bash
MATTERMOST_WEBHOOK_URL=https://your-mattermost-domain/hooks/xxx-webhook-id-xxx
```

**URL:** `$MATTERMOST_WEBHOOK_URL`

**Body:**

```json
{
    "username": "Kener Alerts",
    "icon_url": "{{site_logo_url}}",
    "text": "### {{#is_triggered}}🚨 Alert Triggered{{/is_triggered}}{{#is_resolved}}✅ Alert Resolved{{/is_resolved}}\n\n**{{alert_name}}**\n\n**Monitor:** {{alert_for}}\n**Status:** {{alert_status}}\n**Severity:** {{alert_severity}}\n\n{{alert_message}}\n\n**Current Value:** {{alert_value}}\n**Threshold:** {{alert_failure_threshold}}\n**Time:** {{alert_timestamp}}\n\n[View Monitor]({{alert_cta_url}})"
}
```

## Example 6: Custom Logging Service {#example-custom-logging-service}

Send alerts to a custom HTTP endpoint for logging or processing.

### Simple JSON Webhook {#custom-logging-simple}

**URL:** `https://your-api.com/alerts`

**Headers:**

```json
{
    "Authorization": "Bearer $CUSTOM_API_TOKEN",
    "Content-Type": "application/json",
    "X-Service": "kener"
}
```

**Body:**

```json
{
  "timestamp": "{{alert_timestamp}}",
  "event_type": "alert",
  "event_id": "{{alert_id}}",
  "alert": {
    "name": "{{alert_name}}",
    "status": "{{alert_status}}",
    "severity": "{{alert_severity}}",
    "is_active": {{#is_triggered}}true{{/is_triggered}}{{#is_resolved}}false{{/is_resolved}}
  },
  "monitor": {
    "name": "{{alert_for}}",
    "current_value": "{{alert_value}}",
    "threshold": "{{alert_failure_threshold}}"
  },
  "metadata": {
    "source": "{{alert_source}}",
    "description": "{{alert_message}}",
    "action_url": "{{alert_cta_url}}",
    "site_url": "{{site_url}}"
  }
}
```

## Example 7: Splunk HTTP Event Collector {#example-splunk}

Send alerts to Splunk for analysis and monitoring.

### Setup {#splunk-setup}

**Environment Variables:**

```bash
SPLUNK_HEC_TOKEN=your-hec-token-here
SPLUNK_HEC_URL=https://splunk.example.com:8088/services/collector/event
```

**URL:** `$SPLUNK_HEC_URL`

**Headers:**

```json
{
    "Authorization": "Splunk $SPLUNK_HEC_TOKEN",
    "Content-Type": "application/json"
}
```

**Body:**

```json
{
  "sourcetype": "kener:alert",
  "source": "{{alert_source}}",
  "event": {
    "alert_id": "{{alert_id}}",
    "alert_name": "{{alert_name}}",
    "monitor": "{{alert_for}}",
    "status": "{{alert_status}}",
    "severity": "{{alert_severity}}",
    "is_triggered": {{#is_triggered}}true{{/is_triggered}}{{#is_resolved}}false{{/is_resolved}},
    "is_resolved": {{#is_resolved}}true{{/is_resolved}}{{#is_triggered}}false{{/is_triggered}},
    "current_value": "{{alert_value}}",
    "threshold": "{{alert_failure_threshold}}",
    "description": "{{alert_message}}",
    "action_url": "{{alert_cta_url}}",
    "timestamp": "{{alert_timestamp}}"
  }
}
```

## Example 8: Datadog Events API {#example-datadog}

Send alerts as events to Datadog.

### Setup {#datadog-setup}

**Environment Variables:**

```bash
DATADOG_API_KEY=your-api-key
DATADOG_SITE=datadoghq.com
```

**URL:** `https://api.$DATADOG_SITE/api/v1/events`

**Headers:**

```json
{
    "DD-API-KEY": "$DATADOG_API_KEY",
    "Content-Type": "application/json"
}
```

**Body:**

```json
{
    "title": "{{alert_name}}",
    "text": "{{alert_message}}\n\n**Monitor:** {{alert_for}}\n**Current:** {{alert_value}}\n**Threshold:** {{alert_failure_threshold}}",
    "alert_type": "{{#is_triggered}}error{{/is_triggered}}{{#is_resolved}}success{{/is_resolved}}",
    "priority": "{{#alert_severity}}normal{{/alert_severity}}",
    "tags": ["source:kener", "monitor:{{alert_for}}", "severity:{{alert_severity}}", "alert_type:{{alert_for}}"],
    "aggregation_key": "kener-alert-{{alert_id}}",
    "source_type_name": "kener"
}
```

## Example 9: Webhook with Retry Logic {#example-webhook-retry}

For critical integrations, implement a webhook that signals when to retry.

### Webhook with Idempotency {#webhook-retry-idempotency}

**Headers:**

```json
{
    "Content-Type": "application/json",
    "X-Idempotency-Key": "kener-{{alert_id}}-{{timestamp_unix}}",
    "X-Webhook-Signature": "$WEBHOOK_SECRET"
}
```

**Body:**

```json
{
  "idempotency_key": "kener-{{alert_id}}-{{timestamp_unix}}",
  "event": {
    "type": "alert.{{#is_triggered}}triggered{{/is_triggered}}{{#is_resolved}}resolved{{/is_resolved}}",
    "id": "{{alert_id}}",
    "timestamp": {{timestamp_unix}},
    "data": {
      "alert_name": "{{alert_name}}",
      "monitor": "{{alert_for}}",
      "status": "{{alert_status}}",
      "severity": "{{alert_severity}}",
      "current_value": "{{alert_value}}",
      "threshold": "{{alert_failure_threshold}}",
      "url": "{{alert_cta_url}}"
    }
  },
  "metadata": {
    "source": "{{alert_source}}",
    "site": "{{site_url}}"
  }
}
```

## Example 10: Conditional Webhooks by Severity {#example-conditional-webhooks}

Send to different endpoints based on alert severity.

### Critical Alerts to PagerDuty {#conditional-webhooks-critical}

Create one trigger for critical alerts:

**Body:**

```json
{
    "routing_key": "$PAGERDUTY_CRITICAL_KEY",
    "event_action": "trigger",
    "payload": {
        "summary": "[CRITICAL] {{alert_name}}",
        "severity": "critical",
        "source": "{{alert_for}}"
    }
}
```

Use this trigger **only** for alert configurations with `CRITICAL` severity.

### Warning Alerts to Slack {#conditional-webhooks-warning}

Create another trigger for warnings:

**URL:** `$SLACK_WARNINGS_WEBHOOK`

**Body:**

```json
{
  "text": "⚠️ Warning: {{alert_name}}",
  "blocks": [...]
}
```

Use this trigger **only** for alert configurations with `WARNING` severity.

## Testing Your Webhooks {#testing-webhooks}

### 1. Test Endpoint Independently {#testing-endpoint}

Before configuring in Kener, test your endpoint:

```bash
curl -X POST https://api.telegram.org/bot<TOKEN>/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "123456789",
    "text": "Test message"
  }'
```

### 2. Use Webhook Testing Tools {#testing-tools}

- [webhook.site](https://webhook.site) - Inspect webhook payloads
- [RequestBin](https://requestbin.com) - Debug webhook requests
- [ngrok](https://ngrok.com) - Tunnel to local development server

### 3. Create Test Alert {#testing-test-alert}

1. Create a low-threshold alert (e.g., latency > 1ms)
2. Attach your webhook trigger
3. Trigger the alert
4. Verify the webhook fires correctly

### 4. Check Logs {#testing-logs}

Review Kener logs for webhook errors:

- Connection failures
- Authentication errors
- Rate limiting
- Invalid JSON responses

## Common Patterns {#common-patterns}

### Pattern 1: Multiple Recipients {#pattern-multiple-recipients}

Send the same alert to multiple channels:

```json
{
    "chat_ids": ["$TEAM_CHAT_ID", "$ONCALL_CHAT_ID"],
    "message": "{{alert_name}}"
}
```

Or create separate triggers for each recipient.

### Pattern 2: Severity-Based Routing {#pattern-severity-routing}

In your webhook body, include routing information:

```json
{
    "destination": "{{#alert_severity}}critical-channel{{/alert_severity}}",
    "priority": "{{#is_triggered}}high{{/is_triggered}}{{#is_resolved}}low{{/is_resolved}}",
    "message": "{{alert_name}}"
}
```

### Pattern 3: Rich Metadata {#pattern-rich-metadata}

Include all available context for downstream processing:

```json
{
  "alert": {
    "id": "{{alert_id}}",
    "name": "{{alert_name}}",
    "status": "{{alert_status}}",
    "severity": "{{alert_severity}}",
    "type": "{{alert_for}}"
  },
  "monitor": {
    "name": "{{alert_for}}",
    "current": "{{alert_value}}",
    "threshold": "{{alert_failure_threshold}}"
  },
  "context": {
    "triggered": {{#is_triggered}}true{{/is_triggered}}{{#is_resolved}}false{{/is_resolved}},
    "resolved": {{#is_resolved}}true{{/is_resolved}}{{#is_triggered}}false{{/is_triggered}},
    "description": "{{alert_message}}"
  },
  "links": {
    "monitor": "{{alert_cta_url}}",
    "site": "{{site_url}}"
  },
  "timestamps": {
    "iso": "{{alert_timestamp}}",
    "unix": {{timestamp_unix}}
  }
}
```

## Security Best Practices {#security-best-practices}

### 1. Always Use HTTPS {#security-https}

Only send webhooks to HTTPS endpoints to protect sensitive data in transit.

### 2. Store Secrets in Environment Variables {#security-env-vars}

```bash
# .env file
API_KEY=secret-value-here
WEBHOOK_URL=https://api.example.com/webhook
```

```json
{
    "Authorization": "Bearer $API_KEY"
}
```

### 3. Implement Webhook Signatures {#security-signatures}

For custom webhooks, verify requests came from Kener:

**Headers:**

```json
{
    "X-Webhook-Secret": "$WEBHOOK_SECRET"
}
```

Validate this secret on your receiving endpoint.

### 4. Rate Limiting {#security-rate-limiting}

Be aware of service rate limits:

- Telegram: 30 messages/second
- Discord: 30 requests/60 seconds per webhook
- Slack: ~1 request/second average
- PagerDuty: 120 events/minute per integration

Adjust alert thresholds to avoid hitting limits.

### 5. Retry Logic {#security-retry-logic}

Services may be temporarily unavailable. Implement retry logic on your receiving endpoint for idempotent operations.

## Troubleshooting {#troubleshooting}

### Webhook Not Firing {#troubleshooting-not-firing}

**Check:**

1. Is trigger active?
2. Is trigger selected in alert configuration?
3. Check Kener logs for errors
4. Test endpoint independently with curl

### 401/403 Authentication Errors {#troubleshooting-auth-errors}

**Solutions:**

- Verify API keys/tokens are correct
- Check environment variables are loaded
- Ensure proper header format (`Bearer`, `GenieKey`, etc.)
- Confirm API key has required permissions

### Timeout Errors {#troubleshooting-timeout}

**Solutions:**

- Check if endpoint is reachable
- Verify firewall rules allow outbound connections
- Test with webhook.site to isolate issue
- Check endpoint response time (should be < 10s)

### Variables Not Substituting {#troubleshooting-variables}

**Solutions:**

- Check variable spelling and case
- Verify mustache syntax: `{{var}}` not `{var}`
- Test with simple payload first
- Check Kener logs for template errors

### Rate Limit Exceeded {#troubleshooting-rate-limit}

**Solutions:**

- Increase alert failure thresholds
- Use separate webhooks for different channels
- Implement backoff logic in receiving endpoint
- Consider batching alerts (custom endpoint)

## Next Steps {#next-steps}

- [Templates](/docs/alerting/templates) - Learn about customizing notification templates
- [Triggers](/docs/alerting/triggers) - Understand trigger configuration
- [Alert Configurations](/docs/alerting/alert-configurations) - Create alerts that use webhooks
