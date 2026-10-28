# forgot

## Overview

This route folder serves `/account/forgot`. The page has two views. The request view asks for an email address and sends a reset link. The `confirm_token` view opens from that link and sets a new password. The page does its work through the two JSON endpoints in `./api/`.

## Interface

- `load` in `+page.server.ts` reads the query parameters `view` (default `request_reset`) and `token` (default empty). It returns `{view, token}`. It has no form actions and no redirects.
- When `view` is `confirm_token`, `+page.svelte` shows the "Set New Password" form with the fields `newPassword` and `confirmPassword`. It posts `{receivedToken: token, newPassword}` as JSON to `/account/forgot/api/password-reset`.
- For any other `view`, `+page.svelte` shows the "Forgot Password" form with the field `email`. It posts `{email}` as JSON to `/account/forgot/api/fogot-password`.
- `+page.svelte` shows the `error` from a failed response in a toast. It links back to `/account/signin`.
- [api](./api/EGM.md): This folder holds the endpoints `fogot-password` and `password-reset`.

## Invariants

- `load` does not check the token. Only `/account/forgot/api/password-reset` checks it.
- The query parameter names `view` and `token` must match the link that `fogot-password` builds: `account/forgot?view=confirm_token&token=<jwt>`.
- The fetch URL spells `fogot-password`. It must match the folder name `./api/fogot-password`.
- The JSON field names `receivedToken` and `newPassword` must match what `password-reset` reads.
- The page checks only that the two passwords match and have at least 8 characters. The server's `ValidatePassword` in `src/lib/server/controllers/commonController.ts` also needs one digit, one lowercase letter, and one uppercase letter. The form hint names only the length rule.

## Side Effects

- `load` reads no database table and sets no cookie.
- The browser sends `POST /account/forgot/api/fogot-password`, which emails a reset link.
- The browser sends `POST /account/forgot/api/password-reset`, which writes `users.password_hash` and `users.is_verified`.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
