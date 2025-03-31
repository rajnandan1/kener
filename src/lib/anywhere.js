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

export const ErrorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60" viewBox="0 0 120 60" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="30" cy="24" r="10"/>
  <path d="M26 27h8"/>
  <path d="M26 21h2"/>
  <path d="M32 21h2"/>
  <text x="80" y="29" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="currentColor" font-weight="300">Not Found</text>
</svg>`;
