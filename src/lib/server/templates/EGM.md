# templates

## Overview

This folder holds the default Mustache templates for alert messages, one per trigger type: email, webhook, Slack, and Discord. A trigger is a saved alert destination. The trigger editor at `src/routes/(manage)/manage/app/triggers/[trigger_id]/+page.server.ts` loads these defaults into a trigger, and the senders in `src/lib/server/notification/` render the saved copy with the variables from `alertToVariables`.

## Interface

- `email_alert_template.ts` default-exports `{ email_subject, email_body }`. The subject is `Alert {{alert_name}} for {{alert_for}} {{alert_value}} {{alert_status}} at {{alert_timestamp}}`, and the body is an HTML page.
- `webhook_alert_template.ts` default-exports `{ webhook_body }`, a JSON object with one field per alert and site variable.
- `slack_alert_template.ts` default-exports `{ slack_body }`, a Slack Block Kit JSON message.
- `discord_alert_template.ts` default-exports `{ discord_body }`, a Discord embed JSON message.
- `general/` holds the default account and subscriber emails. See [general](./general/EGM.md).

## Invariants

- The templates use the variable names from `AlertVariableMap` and `SiteDataForNotification` in `src/lib/server/notification/types.ts`, for example `alert_name`, `alert_status`, `alert_timestamp`, `alert_cta_url`, `is_triggered`, `is_resolved`, `site_name`, and `colors_down`. A renamed variable must change in both places and in `src/routes/(docs)/docs/content/v4/alerting/templates.md`.
- The Slack and Discord templates pick the title with the Mustache sections `{{#is_triggered}}` and `{{#is_resolved}}`.
- The webhook template leaves some values unquoted: `alert_id`, `alert_failure_threshold`, `alert_success_threshold`, `is_resolved`, and `is_triggered`. These values must be numbers or booleans, or the body is not valid JSON. `alert_incident_id` and `alert_incident_url` become `null` when they are empty.
- The webhook, Slack, and Discord senders render without HTML escaping, so a `"` inside a variable value such as `alert_message` breaks the JSON body.
- The object keys (`email_subject`, `email_body`, `webhook_body`, `slack_body`, `discord_body`) match the `EmailTemplateJson`, `WebhookTemplateJson`, `SlackTemplateJson`, and `DiscordTemplateJson` types in `src/lib/server/types/db.ts`. The trigger editor relies on these keys.

## Side Effects

- None. The files export string constants and do no I/O.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server/notification"`. `notification_utils.test.ts` there imports the email, Discord, and Slack templates. No test covers `webhook_alert_template.ts`, and no test file sits in this folder.
