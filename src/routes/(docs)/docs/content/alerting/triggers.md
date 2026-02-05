---
title: "Alert Triggers"
description: "Configure notification channels (triggers) including Webhook, Discord, Slack, and Email to receive alert notifications."
---

Triggers are notification channels that receive alert notifications when your monitor alert configurations are triggered or resolved. Kener supports multiple trigger types including Webhook, Discord, Slack, and Email.

## What are Triggers? {#what-are-triggers}

Triggers define **where** and **how** alert notifications are sent. Each trigger:

- Has a unique name and type
- Can be used by multiple alert configurations
- Supports custom templates with mustache syntax
- Can include environment variables for secure credential storage
- Operates independently (one alert can notify multiple triggers)

## Accessing Triggers {#accessing-triggers}

Navigate to **Manage > Triggers** or visit `/manage/app/triggers` to view and manage all your notification channels.

## Supported Trigger Types {#supported-trigger-types}

### Webhook {#webhook}

Send HTTP POST requests to any custom endpoint. Perfect for:

- Integrating with tools not natively supported
- Custom notification services
- Internal monitoring systems
- Triggering automation workflows

**Required Configuration:**

- URL: The endpoint to POST to
- Headers: Optional custom headers (JSON format)
- Body: Custom request body with mustache variables

See [Webhook Examples](/docs/alerting/webhook-examples) for practical implementations including Telegram, PagerDuty, and more.

### Discord {#discord}

Send rich messages to Discord channels via webhooks.

**Required Configuration:**

- Webhook URL: Get from Discord Channel Settings → Integrations → Webhooks

**Features:**

- Rich embeds with colors
- Customizable titles and descriptions
- Automatic color coding (red for TRIGGERED, green for RESOLVED)
- Username and avatar customization

### Slack {#slack}

Send messages to Slack channels or users via webhooks.

**Required Configuration:**

- Webhook URL: Create an incoming webhook at api.slack.com/apps

**Features:**

- Rich message blocks
- Action buttons
- Custom colors and emoji
- Thread replies for updates

### Email {#email}

Send email notifications via Resend or SMTP.

**Required Configuration for Resend:**

- API Key: Your Resend API key (store in environment variable)
- From Email: Verified sender email
- To Email: Recipient email address

**Required Configuration for SMTP:**

- SMTP Host
- SMTP Port
- SMTP Username
- SMTP Password
- From Email
- To Email

**Features:**

- HTML email templates
- Plain text fallback
- Custom subject lines
- Attachment support (images in templates)

## Creating a Trigger {#creating-trigger}

1. Navigate to `/manage/app/triggers`
2. Click **Create Trigger**
3. Fill in the required fields:

### Basic Information {#basic-information}

**Name**
A descriptive name for this trigger (e.g., "Production Alerts - Slack", "PagerDuty Critical")

**Type**
Choose from Webhook, Discord, Slack, or Email

**Description** (Optional)
Notes about this trigger's purpose, when to use it, or configuration details

## Trigger Variables (Mustache Syntax) {#trigger-variables}

All triggers support mustache templating with the following variables:

### Alert Variables

| Variable                      | Description                     | Example Value                                                          |
| ----------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `{{alert_id}}`                | Alert event ID                  | "42"                                                                   |
| `{{alert_name}}`              | Auto-generated alert name       | "Alert api-prod for STATUS DOWN TRIGGERED at 2024-01-15T10:30:00.000Z" |
| `{{alert_for}}`               | Alert type                      | "STATUS", "LATENCY", or "UPTIME"                                       |
| `{{alert_value}}`             | Alert threshold value           | "DOWN", "1000", or "99.9"                                              |
| `{{alert_status}}`            | Current alert status            | "TRIGGERED" or "RESOLVED"                                              |
| `{{alert_severity}}`          | Alert severity level            | "CRITICAL" or "WARNING"                                                |
| `{{alert_message}}`           | Alert description from config   | Custom message text                                                    |
| `{{alert_source}}`            | Source of alert                 | "ALERT"                                                                |
| `{{alert_timestamp}}`         | ISO 8601 timestamp              | "2024-01-15T10:30:00.000Z"                                             |
| `{{alert_cta_url}}`           | Call-to-action URL              | "https://kener.ing/docs/home"                                          |
| `{{alert_cta_text}}`          | Call-to-action button text      | "View Documentation"                                                   |
| `{{alert_incident_id}}`       | Associated incident ID (if any) | "123" or undefined                                                     |
| `{{alert_failure_threshold}}` | Failure threshold setting       | 3                                                                      |
| `{{alert_success_threshold}}` | Success threshold setting       | 5                                                                      |
| `{{is_resolved}}`             | Boolean if alert is resolved    | true/false                                                             |
| `{{is_triggered}}`            | Boolean if alert is triggered   | true/false                                                             |

### Site Variables

| Variable                 | Description                  | Example Value                  |
| ------------------------ | ---------------------------- | ------------------------------ |
| `{{site_url}}`           | Your Kener site URL          | "https://status.example.com"   |
| `{{site_name}}`          | Your Kener site name         | "My Status Page"               |
| `{{site_logo_url}}`      | Your site logo URL           | "https://example.com/logo.png" |
| `{{colors_up}}`          | Color for UP status          | "#10b981"                      |
| `{{colors_down}}`        | Color for DOWN status        | "#ef4444"                      |
| `{{colors_degraded}}`    | Color for DEGRADED status    | "#f59e0b"                      |
| `{{colors_maintenance}}` | Color for MAINTENANCE status | "#6b7280"                      |

### Conditional Rendering {#conditional-rendering}

Use mustache sections for conditional content:

```json
{
    "color": "{{#is_triggered}}16711680{{/is_triggered}}{{#is_resolved}}65280{{/is_resolved}}",
    "message": "{{#is_triggered}}⚠️ Alert Triggered{{/is_triggered}}{{#is_resolved}}✅ Alert Resolved{{/is_resolved}}"
}
```

### Environment Variables {#environment-variables}

Reference environment variables using `$VARIABLE_NAME`:

```json
{
    "Authorization": "Bearer $API_TOKEN",
    "X-API-Key": "$WEBHOOK_SECRET"
}
```

**Setting Environment Variables:**

```bash
# In .env file
API_TOKEN=your_token_here
WEBHOOK_SECRET=your_secret_here
```

**Important:** Environment variables can be used anywhere in your template - in URLs, headers, or body. For example:

```
URL: https://hooks.slack.com/services/$SLACK_WEBHOOK_TOKEN
```

## Default Templates {#default-templates}

Kener provides default templates for each trigger type. You can customize these or create your own.

### Default Webhook Body {#default-webhook-body}

```json
{
  "alert_id": "{{alert_id}}",
  "alert_name": "{{alert_name}}",
  "alert_for": "{{alert_for}}",
  "alert_value": "{{alert_value}}",
  "alert_status": "{{alert_status}}",
  "alert_severity": "{{alert_severity}}",
  "alert_message": "{{alert_message}}",
  "alert_source": "{{alert_source}}",
  "alert_timestamp": "{{alert_timestamp}}",
  "alert_cta_url": "{{alert_cta_url}}",
  "alert_cta_text": "{{alert_cta_text}}",
  "alert_incident_id": {{alert_incident_id}},
  "alert_failure_threshold": {{alert_failure_threshold}},
  "alert_success_threshold": {{alert_success_threshold}},
  "is_resolved": {{is_resolved}},
  "is_triggered": {{is_triggered}},
  "site_url": "{{site_url}}",
  "site_name": "{{site_name}}",
  "site_logo_url": "{{site_logo_url}}",
  "colors_up": "{{colors_up}}",
  "colors_down": "{{colors_down}}",
  "colors_degraded": "{{colors_degraded}}",
  "colors_maintenance": "{{colors_maintenance}}"
}
```

### Default Discord Body {#default-discord-body}

```json
{
  "username": "{{site_name}}",
  "avatar_url": "{{site_logo_url}}",
  "content": "{{#is_triggered}}🚨 **Alert Triggered**{{/is_triggered}}{{#is_resolved}}✅ **Alert Resolved**{{/is_resolved}}",
  "embeds": [
    {
      "title": "{{alert_name}}",
      "url": "{{alert_cta_url}}",
      "color": {{#is_triggered}}15158332{{/is_triggered}}{{#is_resolved}}3066993{{/is_resolved}},
      "fields": [
        {
          "name": "📊 Status",
          "value": "{{alert_status}}",
          "inline": true
        },
        {
          "name": "⚠️ Severity",
          "value": "{{alert_severity}}",
          "inline": true
        },
        {
          "name": "📋 Alert Type",
          "value": "{{alert_for}}",
          "inline": true
        },
        {
          "name": "📈 Alert Value",
          "value": "{{alert_value}}",
          "inline": true
        },
        {
          "name": "🔻 Failure Threshold",
          "value": "{{alert_failure_threshold}}",
          "inline": true
        },
        {
          "name": "🔺 Success Threshold",
          "value": "{{alert_success_threshold}}",
          "inline": true
        },
        {
          "name": "📝 Message",
          "value": "{{alert_message}}",
          "inline": false
        }
      ],
      "footer": {
        "text": "Alert ID: {{alert_id}} | {{site_name}} Monitoring",
        "icon_url": "{{site_logo_url}}"
      },
      "timestamp": "{{alert_timestamp}}"
    }
  ]
}
```

### Default Slack Body {#default-slack-body}

```json
{
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "{{#is_triggered}}🚨 Alert Triggered{{/is_triggered}}{{#is_resolved}}✅ Alert Resolved{{/is_resolved}}",
                "emoji": true
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*{{alert_name}}*"
            }
        },
        {
            "type": "divider"
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": "*Status:*\\n{{alert_status}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Severity:*\\n{{alert_severity}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Alert Type:*\\n{{alert_for}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Alert Value:*\\n{{alert_value}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Failure Threshold:*\\n{{alert_failure_threshold}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Success Threshold:*\\n{{alert_success_threshold}}"
                }
            ]
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Message:*\\n{{alert_message}}"
            }
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "🕐 *Time:* {{alert_timestamp}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "🆔 *Alert ID:* {{alert_id}}"
                }
            ]
        },
        {
            "type": "divider"
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "{{alert_cta_text}}",
                        "emoji": true
                    },
                    "url": "{{alert_cta_url}}",
                    "style": "{{#is_triggered}}danger{{/is_triggered}}{{#is_resolved}}primary{{/is_resolved}}"
                }
            ]
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "Sent from *{{site_name}}* monitoring system"
                }
            ]
        }
    ]
}
```

### Default Email Template {#default-email-template}

**Subject:**

```
{{alert_name}}
```

**Body (HTML):**
See the [Templates documentation](/docs/alerting/templates#email-template) for the complete HTML email template.

## Managing Triggers {#managing-triggers}

### Editing Triggers {#editing-triggers}

1. Click on a trigger in the list
2. Modify any configuration
3. Click **Save Changes**

### Testing Triggers {#testing-triggers}

Before using a trigger in production:

1. Create a test alert configuration
2. Use low thresholds to trigger quickly
3. Manually trigger or wait for conditions
4. Verify notifications are received correctly
5. Check formatting and variable substitution

### Activating/Deactivating {#activating-deactivating}

Use the toggle switch to quickly enable/disable triggers without deleting them.

**Inactive triggers:**

- Don't receive alert notifications
- Retain all configuration
- Can be reactivated instantly

### Deleting Triggers {#deleting-triggers}

**Warning:** Deleting a trigger will remove it from all alert configurations using it.

1. Open the trigger
2. Scroll to **Danger Zone**
3. Click **Delete Trigger**
4. Confirm deletion

## Best Practices {#best-practices-triggers}

### Use Environment Variables for Secrets {#use-environment-variables}

Never hard-code API keys or tokens in trigger configurations:

**Bad:**

```json
{
    "Authorization": "Bearer sk_live_abc123xyz"
}
```

**Good:**

```json
{
    "Authorization": "Bearer $API_TOKEN"
}
```

### Create Separate Triggers for Different Purposes {#create-separate-triggers}

Instead of one "Slack" trigger, create:

- "Slack - Critical Alerts" → #oncall channel
- "Slack - Warnings" → #monitoring channel
- "Slack - Test" → your personal DM

### Test Before Production {#test-before-production-triggers}

Always test your triggers with non-critical alerts first.

### Document Trigger Purpose {#document-trigger-purpose}

Use the description field to document:

- What this trigger is for
- Who monitors it
- When it should be used
- Any special configuration notes

### Monitor Trigger Failures {#monitor-trigger-failures}

If a trigger consistently fails:

- Check the trigger logs
- Verify credentials/tokens
- Check for API rate limits
- Validate JSON syntax
- Test the endpoint independently

### Keep Templates Simple {#keep-templates-simple}

Start with default templates and only customize if needed. Complex templates are harder to debug.

## Troubleshooting {#troubleshooting-triggers}

### Trigger Not Sending Notifications {#trigger-not-sending}

**Check:**

1. Is trigger active?
2. Is trigger selected in alert configuration?
3. Are credentials valid?
4. Check trigger logs for errors
5. Test endpoint independently (curl/Postman)

### Invalid JSON Error {#invalid-json-error}

- Validate JSON syntax (use JSONLint.com)
- Check for unquoted strings
- Verify comma placement
- Ensure proper brace matching

### Variables Not Substituting {#variables-not-substituting}

- Check variable spelling (case-sensitive)
- Ensure proper mustache syntax `{{variable}}`
- Verify the variable is available (see variable table above)
- Check for extra spaces inside braces

### Rate Limiting {#rate-limiting}

Some services rate limit webhooks:

- Discord: 30 requests per 60 seconds per webhook
- Slack: ~1 request per second average
- Custom APIs: Check their documentation

**Solutions:**

- Increase alert thresholds to reduce frequency
- Use separate webhooks for different channels
- Implement retry logic in custom endpoints

## Next Steps {#next-steps-triggers}

- [Templates](/docs/alerting/templates) - Customize notification templates
- [Webhook Examples](/docs/alerting/webhook-examples) - See practical webhook examples
- [Alert Configurations](/docs/alerting/alert-configurations) - Create alerts using triggers
