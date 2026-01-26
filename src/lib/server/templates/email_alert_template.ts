const emailTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alert Notification</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      padding: 20px;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .alert-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 16px;
      background-color: {{#is_triggered}}{{colors_down}}{{/is_triggered}}{{#is_resolved}}{{colors_up}}{{/is_resolved}};
      color: white;
      font-weight: 500;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .alert-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
      color: #2c3e50;
    }
    .metric-box {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #007bff;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <a href="{{{site_url}}}" style="text-decoration: none;">
            <span style="font-size: 24px; font-weight: 600; color: #2c3e50;">{{site_name}}</span>
          </a>
        </td>
      </tr>
    </table>
    <div class="header">
      <div class="alert-badge">{{alert_status}}</div>
      <h1 class="alert-title">{{alert_name}}</h1>
    </div>
    <table width="100%" border="0" cellspacing="0" cellpadding="8">
      <tr style="border-bottom: 1px solid #eee;">
        <td width="40%" style="color: #666; font-weight: 500;">Alert ID</td>
        <td width="60%" style="text-align: right;">{{alert_id}}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td width="40%" style="color: #666; font-weight: 500;">Status</td>
        <td width="60%" style="text-align: right;">{{alert_status}}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td width="40%" style="color: #666; font-weight: 500;">Time</td>
        <td width="60%" style="text-align: right;">{{alert_timestamp}}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td width="40%" style="color: #666; font-weight: 500;">Severity</td>
        <td width="60%" style="text-align: right;">{{alert_severity}}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td width="40%" style="color: #666; font-weight: 500;">Alert Type</td>
        <td width="60%" style="text-align: right;">{{alert_for}}</td>
      </tr>
    </table>
    <div class="metric-box">
      <table width="100%" border="0" cellspacing="0" cellpadding="8">
        <tr>
          <td width="40%" style="color: #666; font-weight: 500;">Alert Value</td>
          <td width="60%" style="text-align: right;">{{alert_value}}</td>
        </tr>
        <tr>
          <td width="40%" style="color: #666; font-weight: 500;">Failure Threshold</td>
          <td width="60%" style="text-align: right;">{{alert_failure_threshold}}</td>
        </tr>
        <tr>
          <td width="40%" style="color: #666; font-weight: 500;">Success Threshold</td>
          <td width="60%" style="text-align: right;">{{alert_success_threshold}}</td>
        </tr>
      </table>
    </div>
    <p style="margin: 20px 0;">{{alert_message}}</p>
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="{{{alert_cta_url}}}" class="button">{{alert_cta_text}}</a>
        </td>
      </tr>
    </table>
    <div class="footer">
      This is an automated alert notification from {{site_name}} monitoring system.
    </div>
  </div>
</body>
</html>`;

export default {
  template_name: "Default Email Alert",
  template_type: "EMAIL",
  template_usage: "ALERT",
  template_json: JSON.stringify(
    {
      email_subject: "{{alert_name}}",
      email_body: emailTemplate,
    },
    null,
    2,
  ),
};
