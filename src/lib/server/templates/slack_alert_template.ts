// Slack Block Kit template for rich alert notifications
const template = `{
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
          "text": "*Status:*\n{{alert_status}}"
        },
        {
          "type": "mrkdwn",
          "text": "*Severity:*\n{{alert_severity}}"
        },
        {
          "type": "mrkdwn",
          "text": "*Alert Type:*\n{{alert_for}}"
        },
        {
          "type": "mrkdwn",
          "text": "*Alert Value:*\n{{alert_value}}"
        },
        {
          "type": "mrkdwn",
          "text": "*Failure Threshold:*\n{{alert_failure_threshold}}"
        },
        {
          "type": "mrkdwn",
          "text": "*Success Threshold:*\n{{alert_success_threshold}}"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Message:*\n{{alert_message}}"
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
        }{{#alert_incident_url}},
        {
          "type": "mrkdwn",
          "text": "🔗 *Incident:* <{{alert_incident_url}}|View Incident>"
        }{{/alert_incident_url}}
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
}`;

export default {
  slack_body: template,
};
