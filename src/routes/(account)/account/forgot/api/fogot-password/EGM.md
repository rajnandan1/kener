# fogot-password

## Overview

This route folder serves `POST /account/forgot/api/fogot-password`. The folder name is spelled `fogot-password` on disk, and `src/routes/(account)/account/forgot/+page.svelte` calls this exact URL. The handler emails a password reset link to a user who has an account. `(account)` is a SvelteKit route group: a folder name in parentheses that adds no URL segment.

## Interface

- `POST` in `+server.ts` reads the JSON body field `email` and returns JSON.
- `POST` returns `200 {success: true}` after the email is sent.
- `POST` returns `400 {error: "Email is required"}` when `email` is empty.
- `POST` returns `401 {error: "User does not exist"}` when no row in `users` matches the email.
- `POST` returns `404 {error: "Email template not found"}` when `general_email_templates` has no row with `template_id` `forgot_password`.
- `POST` returns `500 {success: false, error: "Failed to send password reset email"}` when the email send throws.
- The handler calls `db.getUserByEmail`, `GenerateToken` and `GetAllSiteData` (from `$lib/server/controllers/controller.js`), `siteDataToVariables` from `src/lib/server/notification/notification_utils.ts`, `GetGeneralEmailTemplateById` from `src/lib/server/controllers/generalTemplateController.ts`, and the default export of `src/lib/server/notification/email_notification.ts`.

## Invariants

- The reset token is a JWT (JSON Web Token) signed with `KENER_SECRET_KEY`. Its payload is exactly `{email, generatedAt}`, and `generatedAt` is `Date.now()` in milliseconds.
- The `password-reset` handler reads `generatedAt` to enforce a 1-hour limit, so this field name must not change.
- `GenerateToken` signs the JWT with a 1-year expiry. The 1-hour limit exists only in the `password-reset` handler.
- The reset link is `${site_url}account/forgot?view=confirm_token&token=<jwt>`. `siteDataToVariables` builds `site_url` from the `siteURL` site data plus the resolved base path `/`, so `site_url` ends with `/`.
- The email template gets the site variables from `siteDataToVariables` plus `reset_link`. The subject falls back to "Your Password Reset Request".
- The handler checks no session and does no rate limiting.
- An unknown email gets 401 and a known email gets 200. A caller can use this difference to learn which emails have accounts.
- Only the email send is inside `try`. An error from `request.json()`, `GenerateToken`, the site data read, or the template read goes to SvelteKit as an unhandled error.

## Side Effects

- The handler reads the tables `users`, `users_roles`, `roles`, `site_data`, and `general_email_templates`. It writes nothing to the database.
- The handler sends one email to the address in the request body. The sender uses Resend when both `RESEND_API_KEY` and `RESEND_SENDER_EMAIL` are set, and SMTP (`SMTP_HOST` and related variables) otherwise.
- The handler logs a send failure with `console.error`.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
