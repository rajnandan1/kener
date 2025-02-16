---
title: Triggers | Kener
description: Learn how to set up and work with triggers in kener.
---

# Triggers

Triggers are used to trigger actions based on the status of your monitors. You can use triggers to send notifications, or call webhooks when a monitor goes down or up.

<div class="border rounded-md">

![Trigger API](/documentation/trig_1.png)

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

![Trigger API](/documentation/trig_web.png)

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

| Key                   | Description                                                 | Variable                      |
| --------------------- | ----------------------------------------------------------- | ----------------------------- |
| id                    | Unique ID of the alert                                      | ${id}                         |
| alert_name            | Name of the alert                                           | ${alert_name}                 |
| severity              | Severity of the alert. Can be `critical`, `warn`            | ${severity}                   |
| status                | Status of the alert. Can be `TRIGGERED`, `RESOLVED`         | ${status}                     |
| source                | Source of the alert. Can be `Kener`                         | ${source}                     |
| timestamp             | Timestamp of the alert                                      | ${timestamp}                  |
| description           | Description of the alert. This you can customize. See below | ${description}                |
| details               | Details of the alert.                                       | -                             |
| details.metric        | Name of the monitor                                         | ${metric}                     |
| details.current_value | Current value of the monitor                                | ${current_value}              |
| details.threshold     | Alert trigger threshold of the monitor                      | ${threshold}                  |
| actions               | Actions to be taken. Link to view the monitor.              | ${action_text}, ${action_url} |

### Custom Body

You can customize the body of the webhook. You can use the variables mentioned above. If you are not using a json body then please make sure you are using the right content-type by setting custom headers. See examples below.

## Discord

Discord triggers are used to send a message to a discord channel when a monitor goes down or up.

<div class="border rounded-md">

![Trigger API](/documentation/trig_2.png)

</div>

### Discord URL

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The Discord URL is used to define the URL of the discord webhook. It is required and has to be a valid URL.

#### How to get the Discord URL?

1.  Go to your discord server
2.  Right-click on the channel you want to send the messages
3.  Click on `Edit Channel`
4.  Go to `Integrations`
5.  Click on `Create Webhook`
6.  Copy the URL

#### Discord Message

The discord message when alert is `TRIGGERED` will look like this

![Discord](/discord.png)

The discord message when alert is `RESOLVED` will look like this

![Discord](/documentation/discord_resolved.png)

## Slack

Slack triggers are used to send a message to a slack channel when a monitor goes down or up.

<div class="border rounded-md">

![Trigger API](/documentation/trig_3.png)

</div>

### Slack URL

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The Slack URL is used to define the URL of the slack webhook. It is required and has to be a valid URL.

#### How to get the Slack URL?

1.  Go to your slack workspace
2.  Click on `Apps` on the left sidebar
3.  Search for `Incoming Webhooks`
4.  Click on `Add to Slack`
5.  Select the channel you want to send the messages
6.  Click on `Add Incoming Webhook Integration`
7.  Copy the URL

#### Slack Message

The slack message when alert is `TRIGGERED` will look like this

![Slack](/slack.png)

The slack message when alert is `RESOLVED` will look like this

![Slack](/documentation/slack_resolved.png)

## Email

Email triggers are used to send an email when a monitor goes down or up. Kener supports sending emails via [resend](https://resend.com) or over SMTP.

<div class="border rounded-md">

![Trigger API](/documentation/trig_4.png)

</div>

### Resend

To send emails using Resend you just need to set `RESEND_API_KEY` in the environment variables.

### SMTP

To send emails using SMTP, please enter

-   Host: SMTP server host
-   Port: SMTP server port
-   User: SMTP server username
-   Password: SMTP server password

<div class="note danger">

Since the password will be stored as plain text we encourage to use environment variables for the password. Let us say if you have an environment variable `SMTP_PASSWORD` then you can use it as `$SMTP_PASSWORD`.

</div>

### To

<span class="text-red-500 text-xs font-semibold">
	REQUIRED
</span>

The email addresses to which the email should be sent. It is required and has to be a valid email addresses. You can pass multiple email addresses separated by a comma.

### Sender

The email address from which the email should be sent.

It should be in the format `Name <email@address.com>`

If you have not connected your domain with resend, then use `Some Name <onboarding@resend.dev>`

### Subject

Subject of the email when `TRIGGERED`

```text
[TRIGGERED] Mockoon DOWN at 2024-12-27T04:42:01.430Z
```

Subject of the email when `RESOLVED`

```text
[RESOLVED] Mockoon DOWN at 2024-12-27T04:42:01.430Z
```

### Body

The emaik message when alert is `TRIGGERED` will look like this

![Slack](/documentation/em_t.png)

The emaik message when alert is `RESOLVED` will look like this

![Slack](/documentation/em_r.png)

---

## Edit Triggers

Click on the ⚙️ to edit the trigger.

### Deactivate Trigger

You can deactivate the trigger by switching the toggle to off. You cannot send message to a deactivated trigger. Any monitor with this trigger will not send any notifications.

---

## Examples

### Telegram

You can use the webhook trigger to send a message to a telegram channel. Enable `Use a custom webhook body`.

Set the URL to `https://api.telegram.org/bot[BOT_TOKEN]/sendMessage`. Replace [BOT_TOKEN] with your bot token.

```json
{
    "chat_id": "[CHAT_ID]", // Replace [CHAT_ID] with your chat id
    "text": "<b>${alert_name}</b>\n\n<b>Severity:</b> <code>${severity}</code>\n<b>Status:</b> ${status}\n<b>Source:</b> Kener\n<b>Time:</b> ${timestamp}\n\n📌 <b>Details:</b>\n- <b>Metric:</b>${metric}\n- <b>Current Value:</b> <code>${current_value}</code>\n- <b>Threshold:</b> <code>${threshold}</code>\n\n🔍 <a href=\"${action_url}\">${action_text}</a>",
    "parse_mode": "HTML"
}
```

If you want to send a message to a group, then replace `[CHAT_ID]` with the group id.

You can also use environment variables to store the bot token and chat id. In that case the URL will be `https://api.telegram.org/bot$BOT_TOKEN/sendMessage`. In the body you can use `"chat_id": "$CHAT_ID"`. Make sure you have set the `BOT_TOKEN` and `CHAT_ID` in the <a href="/docs/environment-vars#secrets">environment variables</a>.
