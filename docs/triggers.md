---
title: Triggers | Kener
description: Learn how to set up and work with triggers in kener.
---

# Triggers

Triggers are used to trigger actions based on the status of your monitors. You can use triggers to send notifications, or call webhooks when a monitor goes down or up.

<div class="border rounded-md">

![Trigger API](/trig_1.png)

</div>

### Name

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The name is used to define the name of the webhook. It is required and has to be a string.

### Description

The description is used to define the description of the webhook. It is optional and has to be a string.

Kener supports the following triggers:

-   [Webhook](#webhook)
-   [Discord](#discord)
-   [Slack](#slack)
-   [Email](#email)

## Webhook

Webhook triggers are used to send a HTTP POST request to a URL when a monitor goes down or up.

<div class="border rounded-md">

![Trigger API](/trig_web.png)

</div>

### URL

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The URL is used to define the URL of the webhook. It is required and has to be a valid URL.

You can also pass secrets that are set in the environment variables.

Example: `https://example.com/webhook?secret=$SECRET_X`. Make sure `$SECRET_X` is set in the environment variables.

### Method

Method will always be `POST`

### Headers

The headers are used to define the headers that should be sent with the request. It is optional and has to be a valid JSON object. You can add secrets that are set in the environment variables.

Example: `Authorization: Bearer $SECRET_Y`. Make sure `$SECRET_Y` is set in the environment variables.

While sending webhook kener will add two more headers: `Content-Type: application/json` and `User-Agent: Kener/3.0.0`.

### Body

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
