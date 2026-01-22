export const DiscordJSONTemplate = JSON.stringify(
  {
    username: "{{site_name}}",
    avatar_url: "{{{logo_url}}}",
    content:
      "## {{alert_name}}\n{{#is_triggered}}🔴 Triggered{{/is_triggered}}{{#is_resolved}}🟢 Resolved{{/is_resolved}}\n{{description}}\nClick [{{action_text}}]({{{action_url}}}) for more.",
    embeds: [
      {
        title: "{{alert_name}}",
        description: "{{description}}",
        url: "{{{action_url}}}",
        color: "{{#is_triggered}}13250616{{/is_triggered}}{{#is_resolved}}5156244{{/is_resolved}}",
        fields: [
          {
            name: "Monitor",
            value: "{{metric}}",
            inline: false,
          },
          {
            name: "Severity",
            value: "{{severity}}",
            inline: false,
          },
          {
            name: "Alert ID",
            value: "{{id}}",
            inline: false,
          },
          {
            name: "Current Value",
            value: "{{current_value}}",
            inline: true,
          },
          {
            name: "Threshold",
            value: "{{threshold}}",
            inline: true,
          },
        ],
        footer: {
          text: "{{source}}",
          icon_url: "{{{logo_url}}}",
        },
        timestamp: "{{timestamp}}",
      },
    ],
  },
  null,
  2,
);

export const EmailHTMLTemplate = `<!DOCTYPE html>
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
      background-color: {{#is_triggered}}{{color_down}}{{/is_triggered}}{{#is_resolved}}{{color_up}}{{/is_resolved}};
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
      color: white;
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
      <div class="alert-badge">{{status}}</div>
      <h1 class="alert-title">{{alert_name}}</h1>
    </div>
    <table width="100%" border="0" cellspacing="0" cellpadding="8">
      <tr style="border-bottom: 1px solid #eee;">
        <td width="40%" style="color: #666; font-weight: 500;">Alert ID</td>
        <td width="60%" style="text-align: right;">{{id}}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td width="40%" style="color: #666; font-weight: 500;">Status</td>
        <td width="60%" style="text-align: right;">{{status}}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td width="40%" style="color: #666; font-weight: 500;">Time</td>
        <td width="60%" style="text-align: right;">{{timestamp}}</td>
      </tr>
    </table>
    <div class="metric-box">
      <table width="100%" border="0" cellspacing="0" cellpadding="8">
        <tr>
          <td width="40%" style="color: #666; font-weight: 500;">Current Value</td>
          <td width="60%" style="text-align: right;">{{current_value}}</td>
        </tr>
        <tr>
          <td width="40%" style="color: #666; font-weight: 500;">Threshold Set</td>
          <td width="60%" style="text-align: right;">{{threshold}}</td>
        </tr>
      </table>
    </div>
    <p style="margin: 20px 0;">{{description}}</p>
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="{{{action_url}}}" class="button">{{action_text}}</a>
        </td>
      </tr>
    </table>
    <div class="footer">
      This is an automated alert notification from {{site_name}} monitoring system.
    </div>
  </div>
</body>
</html>`;

export const WebhookJSONTemplate = JSON.stringify(
  {
    id: "{{id}}",
    alert_name: "{{alert_name}}",
    severity: "{{severity}}",
    status: "{{status}}",
    source: "{{source}}",
    timestamp: "{{timestamp}}",
    description: "{{description}}",
    details: {
      metric: "{{metric}}",
      current_value: "{{current_value}}",
      threshold: "{{threshold}}",
    },
    actions: [
      {
        text: "{{action_text}}",
        url: "{{{action_url}}}",
      },
    ],
  },
  null,
  2,
);

export const SlackJSONTemplate = JSON.stringify(
  {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "{{alert_name}}",
          emoji: true,
        },
      },
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "{{#is_triggered}}🔴 Triggered{{/is_triggered}}{{#is_resolved}}🟢 Resolved{{/is_resolved}}",
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "{{description}}\n*Source:* {{source}}\n*Severity:* {{severity}}\n*Status:* {{status}}",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Metric:*\n{{metric}}",
          },
          {
            type: "mrkdwn",
            text: "*Current Value:*\n{{current_value}}",
          },
          {
            type: "mrkdwn",
            text: "*Threshold:*\n{{threshold}}",
          },
          {
            type: "mrkdwn",
            text: "*Timestamp:*\n<!date^{{timestamp_unix}}^{date} at {time}|{{timestamp}}>",
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "{{action_text}}",
            },
            url: "{{{action_url}}}",
            style: "primary",
          },
        ],
      },
    ],
  },
  null,
  2,
);

export const DefaultAPIEval = `(async function (statusCode, responseTime, responseRaw, modules) {
	let statusCodeShort = Math.floor(statusCode/100);
    if(statusCode == 429 || (statusCodeShort >=2 && statusCodeShort <= 3)) {
        return {
			status: 'UP',
			latency: responseTime,
        }
    } 
	return {
		status: 'DOWN',
		latency: responseTime,
	}
})`;

export const DefaultPingEval = `(async function (arrayOfPings) {
	let latencyTotal = arrayOfPings.reduce((acc, ping) => {
		return acc + ping.latency;
	}, 0);

	let alive = arrayOfPings.reduce((acc, ping) => {
		return acc && ping.alive;
	}, true);

	return {
		status: alive ? 'UP' : 'DOWN',
		latency: latencyTotal / arrayOfPings.length,
	}
})`;

export const DefaultTCPEval = `(async function (arrayOfPings) {
	let latencyTotal = arrayOfPings.reduce((acc, ping) => {
		return acc + ping.latency;
	}, 0);

	let alive = arrayOfPings.reduce((acc, ping) => {
		return acc && ping.status === "open";
	}, true);

	return {
		status: alive ? 'UP' : 'DOWN',
		latency: latencyTotal / arrayOfPings.length,
	}
})`;

export const DefaultGamedigEval = `(async function (responseTime, responseRaw) {
	return {
		status: 'UP',
		latency: responseTime,
	}
})`;
export const GAMEDIG_TIMEOUT = 10 * 1000; // 10 seconds
export const GAMEDIG_SOCKET_TIMEOUT = 2 * 1000; // 2 seconds

export const ErrorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="30" cy="24" r="10"/>
  <path d="M26 27h8"/>
  <path d="M26 21h2"/>
  <path d="M32 21h2"/>
  <text x="80" y="29" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="currentColor" font-weight="300">Not Found</text>
</svg>`;
