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

| Template ID                 | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| `invite_user`               | Team member invitation email                      |
| `verify_email`              | Email verification link email                     |
| `forgot_password`           | Password reset link email                         |
| `subscription_account_code` | OTP code for subscription account verification    |
| `subscription_update`       | Incident/maintenance update email for subscribers |

## How customization works {#how-customization-works}

Each template has:

- `template_subject`
- `template_html_body`
- `template_text_body` (used as plain-text body when provided)

Kener renders subject and HTML body with Mustache variables.

> [!NOTE]
> If `template_text_body` is empty, Kener falls back to generating plain-text content from rendered HTML.

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

| Variable                                                                  | Description                                                |
| ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `{{site_name}}`, `{{site_url}}`, `{{logo}}`, `{{favicon}}`, `{{tagline}}` | Site branding/context                                      |
| `{{title}}`                                                               | Event title                                                |
| `{{update_subject}}`                                                      | Event subject line (also used by default subject template) |
| `{{update_text}}`                                                         | Main update content                                        |
| `{{cta_text}}`                                                            | Call-to-action text                                        |
| `{{cta_url}}`                                                             | Call-to-action URL                                         |
| `{{update_id}}`                                                           | Event/update identifier                                    |
| `{{event_type}}`                                                          | Event category                                             |

## Best practices {#best-practices}

- Keep subject lines short and user-facing.
- Prefer editing wording and branding, not template structure.
- Keep Mustache variables exactly as documented.
- Test critical flows after updates (invite, verify, reset, subscription update).

## Troubleshooting {#troubleshooting}

- **Variables render blank**: confirm variable name spelling and braces.
- **Emails fail after edits**: verify template still contains required flow links (`invitation_link`, `verification_link`, `reset_link`).
- **Defaults did not come back after restart**: seeds only insert missing templates; existing customized templates are not overwritten.

## Related pages {#related-pages}

- [Email Setup](/docs/v4/setup/email-setup)
- [User Management](/docs/v4/user-management)
- [User Subscriptions](/docs/v4/subscriptions)
- [Alerting Templates](/docs/v4/alerting/templates)
