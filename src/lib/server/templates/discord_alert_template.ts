// Discord webhook template with rich embed for alert notifications
const template = `{
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
        }{{#alert_incident_url}},
        {
          "name": "🔗 Incident",
          "value": "[View Incident]({{alert_incident_url}})",
          "inline": false
        }{{/alert_incident_url}}
      ],
      "footer": {
        "text": "{{alert_cta_text}} | Alert ID: {{alert_id}} | {{site_name}} Monitoring",
        "icon_url": "{{site_logo_url}}"
      },
      "timestamp": "{{alert_timestamp}}"
    }
  ]
}`;

export default {
  discord_body: template,
};
