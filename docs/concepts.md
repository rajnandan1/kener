---
title: Concepts | Kener
description: Concepts for Kener
---

# Concepts

Here are the different concepts that Kener uses to make your life easier.

## Monitors

Monitors are the heart of Kener. They are the ones that keep an eye on your services and let you know when something goes wrong. Monitors can be of different types like HTTP, DNS, Ping etc. They can be configured to check your services at different intervals and alert you when something goes wrong.

### HTTP Monitor

HTTP Monitor is used to check the status of a website or any http api. It can be configured to check the status of the website at different intervals.

It can also be configured to check for a specific status code or a specific response.

You can also add secrets to the HTTP request using environment variables.

### DNS Monitor

DNS Monitor is used to check the status of a DNS server. It can be configured to check the status of the DNS server at different intervals.

### Ping Monitor

Ping Monitor is used to check the status of a server. It can be configured to check the status of the server at different intervals.

### Data Interpolation

Kener interpolates the data for missing intervals. For example, suppose if you have a cron monitor of 5 minutes and it has run twice at 10AM and 10:05AM and the monitor is `DOWN` at 10AM. Kener will interpolate the data for 10:01AM, 10:02AM, 10:03AM and 10:04AM as `DOWN`. Similarly, if the monitor is UP at 10:05AM, Kener will interpolate the data for 10:06AM, 10:07AM, 10:08AM and 10:09AM as UP. Similarly for missing data points it will consider the previous data point. If there is no previous data point, it will consider it as `UP`.

---

## Triggers

Triggers are the ones that are responsible for sending alerts when something goes wrong. They can be configured to send alerts to different channels like Email, Slack, Discord, Webhook etc.

You can set multiple triggers of the same type.

### Email

Email Trigger is used to send an email when something goes wrong. It can be configured to send an email to different email addresses.

Kener uses [resend.com](https://resend.com) to send emails. Please make sure to sign up in [resend.com](https://resend.com) and get the API key. You will need to set the API key in the environment variable `RESEND_API_KEY`. Learn more about environment variables [here](/docs/environment-vars).

### Slack

Slack Trigger is used to send a message to a slack channel when something goes wrong. It can be configured to send a message to different slack channels. Needs slack URL

### Discord

Discord Trigger is used to send a message to a discord channel when something goes wrong. It can be configured to send a message to different discord channels. Needs discord URL

### Webhook

Webhook Trigger is used to send a message to a webhook when something goes wrong. It can be configured to send a message to different webhooks. Needs webhook URL. Method will be POST.

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

---

## Incidents

Incidents are the ones that are created when something goes wrong. They can be created using Manage portal or using APIs.

There can be two types of incidents - `DOWN` and `DEGRADED`. Incident can have a title, description, severity and status. Status can be `INVESTIGATING`, `IDENTIFIED`, `MONITORING` and `RESOLVED`.

To learn more about incidents, click [here](/docs/incident-management).

### Incident Updates

Incident updates are done using comment. Each comment has a status and a timestamp. The status of the latest added comment becomes the current status of the incident.

### Incident Monitors

Monitors can be added as affected components for an incident. Depending on the severity of the incident the status of the monitor also changes.
