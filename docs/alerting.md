---
title: Alert Config | Server.yaml | Kener
description: Alerts are the heart of Kener. This is where you define the alerts you want to show on your site.
---

# Add Alert Config

Use the `config/server.yaml` file to configure the alert settings.

## Alert Triggers

Kener supports multiple alerting mechanisms.

Currently, Kener supports the following alerting mechanisms:

-   Webhook
-   Discord
-   Slack

We are adding more alerting mechanisms in the future.

### Configure Alerts

In the `server.yaml` file, you can add the alerting mechanisms under the `triggers` key. It accepts an array of objects.

```yaml
triggers:
  - name: Awesome Webhook
	type: "webhook"
	url: "https://kener.requestcatcher.com/test"
	method: "POST"
	headers:
      Authorization: Bearer $SOME_TOKEN_FROM_ENV
  - name: My Discord Channel
	type: "discord"
	url: "https://discord.com/api/webhooks/your-webhook-url"
  - name: Some Slack Channel
	type: slack
    url: https://hooks.slack.com/services/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
```

| Key  | Description                                                             |
| ---- | ----------------------------------------------------------------------- |
| name | Name of the alerting mechanism. This will be used in the monitor config |
| type | Type of the alerting mechanism. Can be `webhook`, `discord`, `slack`    |
| url  | URL of the webhook or discord or slack channel                          |

There may be additional keys based on the type of alerting mechanism.

In webhook alerting, you can also add headers and method to the request.

```yaml
- name: Awesome Webhook
  type: "webhook"
  url: "https://kener.requestcatcher.com/test"
  method: "POST"
  headers:
      Authorization: Bearer $SOME_TOKEN_FROM_ENV
```

### Webhook

Body of the webhook will be sent as below:

```json
{
    "id": "mockoon-9",
    "alert_name": "Mockoon DOWN",
    "severity": "critical",
    "status": "TRIGGERED",
    "source": "Kener",
    "timestamp": "2024-11-27T04:55:00.369Z",
    "description": "🚨 **Service Alert**: Check the details below",
    "details": {
        "metric": "Mockoon",
        "current_value": 1,
        "threshold": 1
    },
    "actions": [
        {
            "text": "View Monitor",
            "url": "https://kener.ing/monitor-mockoon"
        }
    ]
}
```

| Key                   | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| id                    | Unique ID of the alert                                      |
| alert_name            | Name of the alert                                           |
| severity              | Severity of the alert. Can be `critical`, `warn`            |
| status                | Status of the alert. Can be `TRIGGERED`, `RESOLVED`         |
| source                | Source of the alert. Can be `Kener`                         |
| timestamp             | Timestamp of the alert                                      |
| description           | Description of the alert. This you can customize. See below |
| details               | Details of the alert.                                       |
| details.metric        | Name of the monitor                                         |
| details.current_value | Current value of the monitor                                |
| details.threshold     | Alert trigger hreshold of the monitor                       |
| actions               | Actions to be taken. Link to view the monitor.              |

### Discord

The discord message when alert is `TRIGGERED` will look like this

![Discord](/discord.png)

The discord message when alert is `RESOLVED` will look like this

![Discord](/documentation/discord_resolved.png)

### Slack

The slack message when alert is `TRIGGERED` will look like this

![Slack](/slack.png)

The slack message when alert is `RESOLVED` will look like this

![Slack](/documentation/slack_resolved.png)

### Add Alerts to Monitors

Once you have set up the triggers, you can add them to your monitors in the `config/monitors.yaml` file.

```yaml
- name: OkBookmarks
  tag: "okbookmarks"
  image: "https://okbookmarks.com/assets/img/extension_icon128.png"
  api:
      method: GET
      url: https://okbookmarks.com
  alerts:
      DOWN:
          failureThreshold: 1
          successThreshold: 1
          createIncident: true
          description: "🚨 **Service Alert**. This is a custom message"
          triggers:
              - Awesome Webhook
              - My Discord Channel
              - Some Slack Channel
```

The `alerting` object lets you define the alerting mechanism for the monitor. It can do alerting for `DOWN` or `DEGRADED` status. You can add both or one of them.

-   `failureThreshold`: Number of consecutive failures before alerting
-   `successThreshold`: Number of consecutive successes before resolving the alert
-   `createIncident`: If set to `true`, Kener will create an incident that will be shown on the status page
-   `description`: Custom message for the alert
-   `triggers`: Array of alerting triggers to send the alert to. The name should match the name in the `server.yaml` file.

<div class="rounded border px-4 py-0 ">
	<p class="text-sm font-medium">
		It will send alerts to the webhook, discord, and slack channels.
		The alert will be set when the monitor goes down for 1 health check.
    	There will be one more alert when the monitor is up again after, 1 health check is successful.
	</p>
</div>
