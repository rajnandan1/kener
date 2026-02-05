# Templates {#templates}

Templates define how your alert notifications are formatted and what information they contain. Kener uses the [Mustache template system](https://mustache.github.io/) to provide flexible, dynamic notification formatting across all trigger types.

## What are Templates? {#what-are-templates}

Templates are JSON or HTML structures that combine:

- Static content (text, structure, formatting)
- Dynamic variables (monitor data, alert status, timestamps)
- Conditional logic (show different content based on alert state)
- Environment variables (secure credential storage)

Each trigger type (Webhook, Discord, Slack, Email) has its own template format, but all share the same variable system and mustache syntax.

## Template Variables {#template-variables}

All templates have access to these mustache variables:

### Alert Variables

| Variable                      | Type             | Description                     | Example Value                                                          |
| ----------------------------- | ---------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `{{alert_id}}`                | string           | Alert event ID                  | "42"                                                                   |
| `{{alert_name}}`              | string           | Auto-generated alert name       | "Alert api-prod for STATUS DOWN TRIGGERED at 2024-01-15T10:30:00.000Z" |
| `{{alert_for}}`               | string           | Alert type                      | "STATUS", "LATENCY", or "UPTIME"                                       |
| `{{alert_value}}`             | string           | Alert threshold value           | "DOWN", "1000", or "99.9"                                              |
| `{{alert_status}}`            | string           | Current alert status            | "TRIGGERED" or "RESOLVED"                                              |
| `{{alert_severity}}`          | string           | Alert severity level            | "CRITICAL" or "WARNING"                                                |
| `{{alert_message}}`           | string           | Alert description from config   | Custom message text                                                    |
| `{{alert_source}}`            | string           | Source of alert                 | "ALERT"                                                                |
| `{{alert_timestamp}}`         | string           | ISO 8601 timestamp              | "2024-01-15T10:30:00.000Z"                                             |
| `{{alert_cta_url}}`           | string           | Call-to-action URL              | "https://kener.ing/docs/home"                                          |
| `{{alert_cta_text}}`          | string           | Call-to-action button text      | "View Documentation"                                                   |
| `{{alert_incident_id}}`       | number/undefined | Associated incident ID (if any) | 123 or undefined                                                       |
| `{{alert_failure_threshold}}` | number           | Failure threshold setting       | 3                                                                      |
| `{{alert_success_threshold}}` | number           | Success threshold setting       | 5                                                                      |
| `{{is_resolved}}`             | boolean          | Boolean if alert is resolved    | true/false                                                             |
| `{{is_triggered}}`            | boolean          | Boolean if alert is triggered   | true/false                                                             |

### Site Variables

| Variable                 | Type   | Description                  | Example Value                  |
| ------------------------ | ------ | ---------------------------- | ------------------------------ |
| `{{site_url}}`           | string | Your Kener site URL          | "https://status.example.com"   |
| `{{site_name}}`          | string | Your Kener site name         | "My Status Page"               |
| `{{site_logo_url}}`      | string | Your site logo URL           | "https://example.com/logo.png" |
| `{{colors_up}}`          | string | Color for UP status          | "#10b981"                      |
| `{{colors_down}}`        | string | Color for DOWN status        | "#ef4444"                      |
| `{{colors_degraded}}`    | string | Color for DEGRADED status    | "#f59e0b"                      |
| `{{colors_maintenance}}` | string | Color for MAINTENANCE status | "#6b7280"                      |

## Mustache Syntax {#mustache-syntax}

### Basic Variable Substitution {#basic-variable-substitution}

Replace `{{variable}}` with its value:

```json
{
    "message": "Alert: {{alert_name}}",
    "severity": "{{severity}}",
    "time": "{{timestamp}}"
}
```

**Output (when triggered):**

```json
{
    "message": "Alert: Production API DOWN",
    "severity": "CRITICAL",
    "time": "2024-01-15T10:30:00.000Z"
}
```

### Conditional Sections {#conditional-sections}

Use `{{#variable}}...{{/variable}}` to show content only when variable is truthy:

```json
{
    "color": "{{#is_triggered}}16711680{{/is_triggered}}{{#is_resolved}}65280{{/is_resolved}}",
    "emoji": "{{#is_triggered}}🚨{{/is_triggered}}{{#is_resolved}}✅{{/is_resolved}}"
}
```

**When triggered:**

```json
{
    "color": "16711680",
    "emoji": "🚨"
}
```

**When resolved:**

```json
{
    "color": "65280",
    "emoji": "✅"
}
```

### Inverted Sections {#inverted-sections}

Use `{{^variable}}...{{/variable}}` to show content when variable is falsy:

```json
{
    "message": "{{^is_resolved}}Alert is still active{{/is_resolved}}"
}
```

### Environment Variables {#template-environment-variables}

Reference environment variables using `$VARIABLE_NAME`:

```json
{
    "Authorization": "Bearer $API_TOKEN",
    "X-API-Key": "$WEBHOOK_SECRET"
}
```

**Important:** Never hard-code secrets in templates. Always use environment variables. They can be used anywhere - in URLs, headers, or body content.

**Example in URL:**

```
https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage
```

## Default Templates by Trigger Type {#default-templates-by-type}

### Webhook Template {#webhook-template}

Default JSON structure for webhook triggers:

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

**Customization Ideas:**

- Add custom fields for your system
- Include environment-specific metadata
- Flatten structure for simpler APIs
- Add authentication headers

### Discord Template {#discord-template}

Default Discord webhook embed format:

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

**Color Reference:**

- `15158332` (0xE74856) - Red for triggered alerts
- `3066993` (0x2ECE71) - Green for resolved alerts
- `16776960` (0xFFFF00) - Yellow for warnings
- `16744448` (0xFF8800) - Orange for degraded

**Customization Ideas:**

- Add thumbnail or image
- Include additional fields (latency, uptime)
- Customize username per severity
- Add footer with team info

### Slack Template {#slack-template}

Default Slack Block Kit format:

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

**Button Styles:**

- `danger` - Red button for critical/triggered alerts
- `primary` - Green button for resolved alerts
- Default (no style) - Gray button for informational

**Customization Ideas:**

- Add context block with timestamp
- Include dividers between sections
- Add multiple action buttons
- Use markdown formatting in descriptions

### Email Template {#email-template}

Default HTML email template with inline CSS:

**Subject Line:**

```
[{{severity}}] {{alert_name}} - {{status}}
```

**Body (HTML):**

```html
<!DOCTYPE html>
<html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: {{#is_triggered}}#dc2626{{/is_triggered}}{{#is_resolved}}#16a34a{{/is_resolved}}; color: white; padding: 20px; border-radius: 5px; }
            .content { padding: 20px; background: #f5f5f5; margin-top: 20px; border-radius: 5px; }
            .button { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>{{alert_name}}</h2>
                <p>Status: {{status}} | Severity: {{severity}}</p>
            </div>
            <div class="content">
                <p>{{description}}</p>
                <p><strong>Monitor:</strong> {{metric}}</p>
                <p><strong>Current Value:</strong> {{current_value}}</p>
                <p><strong>Threshold:</strong> {{threshold}}</p>
                <p><strong>Time:</strong> {{timestamp}}</p>
                <a href="{{action_url}}" class="button">{{action_text}}</a>
            </div>
            <div class="footer">
                <p>Sent by {{site_name}} | {{site_url}}</p>
            </div>
        </div>
    </body>
</html>
```

**Customization Ideas:**

- Add company logo using `<img src="{{logo_url}}">`
- Change color scheme to match branding
- Add more metrics (latency, uptime)
- Include incident history
- Add plain text fallback for email clients

## Template Customization Examples {#template-customization-examples}

### Example 1: Severity-Based Webhook {#severity-based-webhook}

Send different payloads based on severity:

```json
{
    "alert": "{{alert_name}}",
    "priority": "{{#is_triggered}}{{severity}}{{/is_triggered}}{{#is_resolved}}INFO{{/is_resolved}}",
    "message": {
        "critical": "{{#is_triggered}}🚨 CRITICAL: {{metric}} is DOWN{{/is_triggered}}",
        "warning": "{{#is_triggered}}⚠️ WARNING: {{metric}} is degraded{{/is_triggered}}",
        "resolved": "{{#is_resolved}}✅ RESOLVED: {{metric}} is back to normal{{/is_resolved}}"
    },
    "notify": "{{#is_triggered}}true{{/is_triggered}}{{#is_resolved}}false{{/is_resolved}}"
}
```

### Example 2: Rich Discord with Latency Details {#rich-discord-latency}

Include current latency and threshold comparison:

```json
{
    "username": "{{site_name}} Monitoring",
    "avatar_url": "{{logo_url}}",
    "embeds": [
        {
            "title": "{{#is_triggered}}⚠️ High Latency Alert{{/is_triggered}}{{#is_resolved}}✅ Latency Normalized{{/is_resolved}}",
            "description": "**{{metric}}**\n{{description}}",
            "color": "{{#is_triggered}}{{#severity}}15158332{{/severity}}{{/is_triggered}}{{#is_resolved}}3066993{{/is_resolved}}",
            "fields": [
                {
                    "name": "Current Latency",
                    "value": "{{current_value}}ms",
                    "inline": true
                },
                {
                    "name": "Threshold",
                    "value": "{{threshold}}ms",
                    "inline": true
                },
                {
                    "name": "Status",
                    "value": "{{status}}",
                    "inline": true
                }
            ],
            "footer": {
                "text": "Alert ID: {{id}} | {{source}}"
            },
            "timestamp": "{{timestamp}}",
            "url": "{{action_url}}"
        }
    ]
}
```

### Example 3: Slack with Contextual Actions

Add context and multiple action buttons:

```json
{
    "text": "Alert: {{alert_name}}",
    "blocks": [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "{{#is_triggered}}🚨{{/is_triggered}}{{#is_resolved}}✅{{/is_resolved}} {{alert_name}}"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*{{metric}}* - {{status}}\n> {{description}}"
            }
        },
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "Severity: *{{severity}}* | Alert ID: `{{id}}` | <{{site_url}}|Status Page>"
                }
            ]
        },
        {
            "type": "divider"
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": "*Current:*\n{{current_value}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Threshold:*\n{{threshold}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Time:*\n<!date^{{timestamp_unix}}^{date_short_pretty} at {time}|{{timestamp}}>"
                }
            ]
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "View Monitor"
                    },
                    "url": "{{action_url}}",
                    "style": "primary"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "View All Alerts"
                    },
                    "url": "{{site_url}}/manage/app/alerts"
                }
            ]
        }
    ]
}
```

### Example 4: Minimal Email

Simple, clean email template:

**Subject:**

```
{{#is_triggered}}🚨{{/is_triggered}}{{#is_resolved}}✅{{/is_resolved}} {{alert_name}}
```

**Body:**

```html
<!DOCTYPE html>
<html>
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: {{#is_triggered}}#dc2626{{/is_triggered}}{{#is_resolved}}#16a34a{{/is_resolved}};">{{alert_name}}</h2>
        <p><strong>Status:</strong> {{status}}</p>
        <p><strong>Severity:</strong> {{severity}}</p>
        <p><strong>Monitor:</strong> {{metric}}</p>
        <p>{{description}}</p>
        <p>
            <a href="{{action_url}}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;"
                >View Details</a
            >
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
        <p style="color: #666; font-size: 12px;">Alert ID: {{id}} | {{timestamp}}</p>
    </body>
</html>
```

## Using Environment Variables

Store sensitive credentials securely outside your templates.

### In .env file:

```bash
# API Keys
PAGERDUTY_INTEGRATION_KEY=abc123xyz789
TELEGRAM_BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw

# Webhook Secrets
WEBHOOK_SECRET=my-secret-key
CUSTOM_API_TOKEN=bearer-token-here

# Team Configuration
ONCALL_SLACK_WEBHOOK=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### In Template Headers:

```json
{
    "Authorization": "Bearer {{env.CUSTOM_API_TOKEN}}",
    "X-Webhook-Secret": "{{env.WEBHOOK_SECRET}}",
    "Content-Type": "application/json"
}
```

### In Template Body:

```json
{
    "routing_key": "{{env.PAGERDUTY_INTEGRATION_KEY}}",
    "event_action": "trigger",
    "payload": {
        "summary": "{{alert_name}}",
        "severity": "critical",
        "source": "{{source}}"
    }
}
```

## Testing Your Templates

Before using templates in production:

### 1. Validate JSON Syntax

Use a JSON validator (like [JSONLint](https://jsonlint.com/)) to ensure proper formatting:

- Check for missing commas
- Verify quote matching
- Ensure proper brace nesting

### 2. Test Variable Substitution

Create a test alert with low thresholds:

- Trigger the alert quickly
- Check if variables populate correctly
- Verify conditional sections show/hide properly

### 3. Test Both States

Test templates in both triggered and resolved states:

- Colors change appropriately
- Emojis update
- Messages reflect current state
- Buttons have correct styling

### 4. Check Environment Variables

Verify environment variables are loaded:

- Check Kener logs for missing variable warnings
- Ensure .env file is in correct location
- Restart Kener after changing .env

### 5. Test with Real Services

Send test notifications to actual services:

- Discord: Check embed rendering
- Slack: Verify block kit formatting
- Email: Test in multiple email clients
- Webhook: Check endpoint receives correct payload

## Best Practices

### Keep Templates Simple

Start with defaults and only customize what's needed. Complex templates are harder to debug and maintain.

### Use Descriptive Variable Names

When using environment variables, use clear names:

- ✅ `{{env.PRODUCTION_SLACK_WEBHOOK}}`
- ❌ `{{env.WEBHOOK1}}`

### Document Your Templates

Add comments in your trigger description explaining:

- What the template does
- Which variables are customized
- Required environment variables
- When to use this template

### Version Control Your Templates

Keep a backup of custom templates:

- Export trigger configurations
- Store in version control
- Document changes over time

### Test Before Production

Always test templates with non-critical alerts first:

- Create test alert with low threshold
- Verify formatting and content
- Check all conditional paths
- Validate in target service

### Handle Missing Variables Gracefully

Mustache shows empty strings for missing variables. Design templates to handle this:

- Use conditional sections to hide missing data
- Provide default values where possible
- Test with minimal data to see fallback behavior

### Avoid Hard-Coding Secrets

Never put API keys, tokens, or passwords directly in templates:

- ❌ `"token": "abc123xyz"`
- ✅ `"token": "{{env.API_TOKEN}}"`

## Troubleshooting

### Variables Not Substituting

**Problem:** Template shows `{{variable}}` instead of value

**Solutions:**

- Check variable name spelling (case-sensitive)
- Ensure proper mustache syntax: `{{variable}}` not `{variable}`
- Verify variable exists in available variables list
- Check for extra spaces: `{{ variable }}` won't work

### Conditional Sections Not Working

**Problem:** Content shows when it shouldn't or doesn't show when it should

**Solutions:**

- Verify proper section syntax: `{{#var}}...{{/var}}`
- Check closing tag matches opening: `{{#is_triggered}}...{{/is_triggered}}`
- Remember booleans: use `is_triggered` not `status === "TRIGGERED"`
- Test inverted sections: `{{^var}}` shows when var is falsy

### JSON Parse Errors

**Problem:** Trigger fails with "Invalid JSON" error

**Solutions:**

- Validate JSON syntax in JSONLint
- Check for trailing commas (not allowed in JSON)
- Verify all strings are double-quoted
- Ensure proper escaping of special characters

### Environment Variables Empty

**Problem:** `{{env.VAR}}` substitutes to empty string

**Solutions:**

- Check .env file exists in project root
- Verify variable name matches exactly (case-sensitive)
- Restart Kener after changing .env
- Check Kener logs for warnings about missing variables

### Discord Embed Not Rendering

**Problem:** Discord shows plain text instead of rich embed

**Solutions:**

- Verify `embeds` is an array: `"embeds": [{...}]`
- Check color is a number, not string: `15158332` not `"15158332"`
- Ensure timestamp is ISO 8601 format
- Validate against [Discord embed documentation](https://discord.com/developers/docs/resources/channel#embed-object)

### Slack Blocks Not Formatting

**Problem:** Slack shows error or plain text

**Solutions:**

- Validate against [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)
- Check `type` fields match Slack specification
- Verify button `style` is `primary`, `danger`, or omitted
- Ensure markdown syntax in `mrkdwn` types

### Email Renders Incorrectly

**Problem:** HTML email shows broken layout or styling

**Solutions:**

- Use inline CSS (many email clients ignore `<style>` tags)
- Test in multiple email clients (Gmail, Outlook, Apple Mail)
- Avoid modern CSS features (flexbox, grid)
- Use tables for layout if needed
- Provide plain text fallback

## Next Steps

- [Webhook Examples](/docs/alerting/webhook-examples) - See practical webhook integrations including Telegram and PagerDuty
- [Triggers](/docs/alerting/triggers) - Learn about notification channels and trigger types
- [Alert Configurations](/docs/alerting/alert-configurations) - Create alerts that use your custom templates
