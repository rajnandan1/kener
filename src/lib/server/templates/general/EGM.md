# general

## Overview

This folder holds the default text of Kener's general email templates. A general email template is an account or subscriber email that is not an alert: password reset, user invite, email check, subscriber code, and subscriber update. The seed `seeds/generate_template.ts` copies these defaults into the `general_email_templates` table. At runtime, Kener reads the templates from that table, not from these files.

## Interface

- `forgot_password_template.ts` default-exports the `forgot_password` template, the password reset email. It uses `{{site_logo_url}}`, `{{site_name}}`, and `{{reset_link}}`.
- `invite_user_template.ts` default-exports the `invite_user` template, the user invite email. It uses `{{site_logo_url}}`, `{{site_name}}`, and `{{invitation_link}}`.
- `verify_email_template.ts` default-exports the `verify_email` template, the email address check. It uses `{{site_logo_url}}`, `{{site_name}}`, and `{{verification_link}}`.
- `subscription_account_code_template.ts` default-exports the `subscription_account_code` template, the code that a subscriber types to sign in. It uses `{{site_logo_url}}`, `{{site_name}}`, and `{{email_code}}`.
- `subscription_update_template.ts` default-exports the `subscription_update` template, the incident or maintenance update that subscribers get. It uses `{{update_subject}}`, `{{title}}`, `{{site_logo_url}}`, `{{site_name}}`, `{{{update_text}}}`, `{{cta_url}}`, and `{{cta_text}}`.

## Invariants

- Each file default-exports one object with exactly four keys: `template_id`, `template_subject`, `template_html_body`, and `template_text_body`. The seed copies these four keys into the table columns of the same names.
- The seed inserts a template only when no row with that `template_id` exists. An edit to a file changes new installs only. It does not change a database that already has the row, and an admin can edit the stored copy.
- The templates use Mustache placeholders (`{{name}}`). They never use JavaScript `${}` interpolation, so the strings hold the placeholders as plain text.
- `subscription_update_template.ts:172` uses the triple brace `{{{update_text}}}`, which Mustache inserts without HTML escaping. The caller must pass safe HTML there. The text body uses the escaped `{{update_text}}`.
- The subject of `subscription_update` is only `{{update_subject}}`, so the subject is empty when the caller does not pass that variable.
- The email copy states fixed lifetimes. The subscriber code copy (5 minutes) and the invite link copy (7 days) match the server. The reset link copy says 5 minutes, but `src/routes/(account)/account/forgot/api/password-reset/+server.ts` accepts a reset token for 1 hour. Change the copy when the server changes a token lifetime.
- The documented variable names in `src/routes/(docs)/docs/content/v4/guides/email-templates.md` must match the placeholders in these files.

## Side Effects

- None. The files declare string constants and export one object each. They do no I/O.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this folder directly.
- `seeds/generate_template.ts` writes these templates to the database, so a change must also pass `npm run seed` on SQLite, PostgreSQL, and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
