# notification

## Overview

This folder sends Kener's outbound messages: email through Resend or SMTP, and HTTP posts to Discord, Slack, and generic webhooks. Each sender first replaces `$NAME` placeholders with environment values, then renders the Mustache template with the given variables. `notification_utils.ts` builds the variable maps that the templates use.

## Interface

- `email_notification.ts` default-exports `send(emailBody, emailSubject, variables, to, from?, emailTextBody?)`. It renders the email and sends it through Resend or SMTP. `src/lib/server/queues/alertingQueue.ts`, `emailQueue.ts`, `src/lib/server/controllers/userController.ts`, and `userSubscriptionsController.ts` import it as `sendEmail`. The routes `src/routes/(account)/account/forgot/api/fogot-password/+server.ts`, `src/routes/(account)/account/forgot/api/password-reset/+server.ts`, and `src/routes/(manage)/manage/api/+server.ts` import it too.
- `discord_notification.ts`, `slack_notification.ts`, and `webhook_notification.ts` each default-export `send(body, variables, url, ...)`. Each posts the rendered JSON body to the URL. The webhook sender also takes `headers`, a JSON string with an array of `{ key, value }` pairs. Each returns `{ success, status, data }` or `{ error, details }`.
- `smtps.ts` default-exports `getSMTPTransport(meta: SMTPConfiguration)`, which returns a nodemailer transporter and caches it per configuration.
- `notification_utils.ts` exports `alertToVariables(config, alert, siteVars, monitorTag?)`, `siteDataToVariables(siteData)`, `maintenanceToVariables(event, monitorNames, statusMessage, updateIdSuffix, subjectPrefix, siteUrl?)`, and `describeError(error)`. `describeError` adds the innermost `error.cause` message to the top message.
- `types.ts` exports the variable map types `AlertVariableMap`, `SiteDataForNotification`, `SubscriptionVariableMap`, `EmailCodeVariableMap`, and `TemplateVariableMap`, and the config types `SMTPConfiguration` and `ResendAPIConfiguration`.

## Invariants

- Every sender replaces `$NAME` with the value of the env var `NAME` before Mustache runs. `GetRequiredSecrets` in `src/lib/server/tool.ts` reads any env var whose name follows a `$`, so a template author can read every server env var. A name with no env value stays as typed.
- The email sender renders with Mustache HTML escaping. When no text template is given, it builds the text body with `striptags(htmlBody)`.
- The Discord, Slack, and webhook senders turn HTML escaping off (`escape: (text) => text`), because their bodies are JSON. Values go into the body unescaped.
- The email sender throws when neither Resend nor SMTP is set up. It uses Resend when `RESEND_API_KEY` and `RESEND_SENDER_EMAIL` are both set, and SMTP only otherwise. It throws again after it logs any send error, so the caller sees the failure.
- The Discord, Slack, and webhook senders never throw for an HTTP error or a network error. They log it and return `{ error, details }`, so the caller must check the return value.
- No sender sets a fetch timeout or retries. Retries come only from the BullMQ queue that calls the sender.
- `getSMTPTransport` uses port 587 when `smtp_port` is empty. It sets `tls.rejectUnauthorized` to `smtp_secure`, so a non-secure SMTP config skips the TLS certificate check (`smtps.ts:32-34`). It drops SMTP auth when `smtp_user` or `smtp_pass` is `-`. The transporter cache never removes entries.
- `maintenanceToVariables` treats `start_date_time` and `end_date_time` as Unix seconds. It builds `update_id` as `maintenance_<event.id>_<updateIdSuffix>`.

## Side Effects

- The Discord, Slack, and webhook senders send one HTTP `POST` each, with the default headers `user-agent: Kener/<version>`, `accept: application/json`, and `content-type: application/json`. The webhook sender lets its `headers` argument replace a default header (the name match ignores case) and add more headers.
- The email sender calls the Resend API, or it opens an SMTP connection through `getSMTPTransport`. It reads the SMTP settings through `GetSMTPFromENV()` in `src/lib/server/controllers/commonController.ts`.
- The senders read `process.env` for `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`, and each `$NAME` in a template. They log errors with `console.error`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server/notification"`.
