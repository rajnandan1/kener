---
title: Email Templates
description: Generate and customize built-in email templates with template variables and usage references
---

Use **Manage → Templates** to edit Kener’s built-in general email templates.

## Quick setup {#quick-setup}

1. Open **Manage → Templates**.
2. Select a template from the dropdown.
3. Edit **Subject** and **HTML Body**.
4. Click **Update Template**.

> [!IMPORTANT]
> You need an `admin` or `editor` role to update templates.

## Available templates {#available-templates}

Kener currently includes these templates:

| Template ID                 | Purpose                                                                |
| --------------------------- | ---------------------------------------------------------------------- |
| `invite_user`               | Team member invitation email                                           |
| `verify_email`              | Email verification link email                                          |
| `forgot_password`           | Password reset link email                                              |
| `subscription_account_code` | OTP code for subscription account verification                         |
| `subscription_update`       | Monitor status, incident, and maintenance update email for subscribers |

## How customization works {#how-customization-works}

Each template has:

- `template_subject`
- `template_html_body`
- `template_text_body` (used as plain-text body when provided)

Kener renders subject and HTML body with Mustache variables.

> [!NOTE]
> If `template_text_body` is empty, Kener falls back to generating plain-text content from rendered HTML.

## Images {#images}

Add pictures to an email without hosting them anywhere:

1. In the **HTML Body** editor, put the cursor where the image goes.
2. Click **Insert image** and pick a PNG, JPG, WebP, or HEIC file of up to 2 MB.
3. Kener uploads it and inserts `<img src="cid:IMAGE_ID" …>` at the cursor. Move or resize the tag like any other HTML.

When the email is sent, each image the HTML refers to with `cid:` goes along as an inline attachment under that Content-ID, through SMTP and Resend alike. Email triggers have the same button above their **Custom HTML Template**.

- Kener stores uploads as PNG or JPEG, at most 1200 px wide or high. The inserted tag shows the image at most 600 px wide and scales it down on narrow screens.
- Thumbnails next to the button show the images the template uses. **Missing** marks a `cid:` id that matches no uploaded image: the email is sent without it, and the server log says so.
- Uploading needs the `images` `write` permission. See [User Management](/docs/v4/user-management).
- Every email carries its images. Keep them small in emails that go to many subscribers.

## Common variables {#common-variables}

All templates can use site-level variables:

| Variable        |
| --------------- |
| `{{site_name}}` |
| `{{site_url}}`  |
| `{{logo}}`      |
| `{{favicon}}`   |
| `{{tagline}}`   |

## Variables by template {#variables-by-template}

### invite_user {#invite-user-variables}

| Variable                                                                  | Description               |
| ------------------------------------------------------------------------- | ------------------------- |
| `{{site_name}}`, `{{site_url}}`, `{{logo}}`, `{{favicon}}`, `{{tagline}}` | Site branding/context     |
| `{{invitation_link}}`                                                     | Invitation acceptance URL |

### verify_email {#verify-email-variables}

| Variable                                                                  | Description            |
| ------------------------------------------------------------------------- | ---------------------- |
| `{{site_name}}`, `{{site_url}}`, `{{logo}}`, `{{favicon}}`, `{{tagline}}` | Site branding/context  |
| `{{verification_link}}`                                                   | Email verification URL |

### forgot_password {#forgot-password-variables}

| Variable                                                                  | Description           |
| ------------------------------------------------------------------------- | --------------------- |
| `{{site_name}}`, `{{site_url}}`, `{{logo}}`, `{{favicon}}`, `{{tagline}}` | Site branding/context |
| `{{reset_link}}`                                                          | Password reset URL    |

### subscription_account_code {#subscription-account-code-variables}

| Variable                                                                  | Description                 |
| ------------------------------------------------------------------------- | --------------------------- |
| `{{site_name}}`, `{{site_url}}`, `{{logo}}`, `{{favicon}}`, `{{tagline}}` | Site branding/context       |
| `{{email_code}}`                                                          | OTP code sent to subscriber |

### subscription_update {#subscription-update-variables}

| Variable                                                                                | Description                                                                                                       |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `{{site_name}}`, `{{site_url}}`, `{{logo}}`, `{{favicon}}`, `{{tagline}}`               | Site branding/context                                                                                             |
| `{{title}}`                                                                             | Event title                                                                                                       |
| `{{update_subject}}`                                                                    | Event subject line (also used by default subject template)                                                        |
| `{{update_text}}`                                                                       | Main update content                                                                                               |
| `{{cta_text}}`                                                                          | Call-to-action text                                                                                               |
| `{{cta_url}}`                                                                           | Call-to-action URL                                                                                                |
| `{{update_id}}`                                                                         | Event/update identifier                                                                                           |
| `{{event_type}}`                                                                        | Event category: `incidents`, `maintenances`, or `monitors` for a monitor status change                            |
| `{{update_state}}`                                                                      | Incident updates: the comment's state, e.g. `INVESTIGATING`. Status changes: the new status, e.g. `DOWN`          |
| `{{#is_investigating}}`, `{{#is_identified}}`, `{{#is_monitoring}}`, `{{#is_resolved}}` | Incident updates: true for the comment's state                                                                    |
| `{{incident_impact}}`                                                                   | Incident updates: the worst impact among the incident's monitors that are not hidden, `DOWN`, `DEGRADED` or empty |
| `{{#is_down}}`, `{{#is_degraded}}`                                                      | Incident updates: true for that worst impact. Status changes: true for the new status                             |
| `{{#is_up}}`                                                                            | Status changes: true when the monitor is back `UP`                                                                |
| `{{#is_maintenance}}`                                                                   | True for maintenance mails                                                                                        |

The flags let a template change its look by what the mail is about, which Mustache cannot do by comparing strings. For example, a banner only on resolved incidents:

```html
{{#is_resolved}}
<p style="background:#16a34a;color:#fff;padding:8px">Resolved</p>
{{/is_resolved}}
```

## Best practices {#best-practices}

- Keep subject lines short and user-facing.
- Prefer editing wording and branding, not template structure.
- Keep Mustache variables exactly as documented.
- Test critical flows after updates (invite, verify, reset, subscription update).

## Troubleshooting {#troubleshooting}

- **Variables render blank**: confirm variable name spelling and braces.
- **Emails fail after edits**: verify template still contains required flow links (`invitation_link`, `verification_link`, `reset_link`).
- **Image missing in the email**: check that the tag reads `cid:` followed by the exact image id, and that the thumbnail above the editor is not marked **Missing**. Some email clients hide images until the reader allows them.
- **Defaults did not come back after restart**: seeds only insert missing templates; existing customized templates are not overwritten.

## Related pages {#related-pages}

- [Email Setup](/docs/v4/setup/email-setup)
- [User Management](/docs/v4/user-management)
- [User Subscriptions](/docs/v4/subscriptions)
- [Alerting Templates](/docs/v4/alerting/templates)
