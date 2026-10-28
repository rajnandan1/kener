# invitation

## Overview

This route folder serves `/account/invitation?view=confirm_token&token=<jwt>`. An invited user opens it from the link that `SendInvitationEmail` or `ResendInvitationEmail` in `src/lib/server/controllers/userController.ts` sends. The user sets a first password here. The page does that through the JSON endpoint in `./api/`.

## Interface

- `load` in `+page.server.ts` reads the query parameters `view` and `token`. It has no form actions and no redirects.
- On success, `load` returns `{valid: true, error: "", token, email, name}`.
- On failure, `load` returns `{valid: false, error, token: ""}` with one of six messages.
- When `valid` is false, `+page.svelte` shows "Invalid Invitation", the `error` message, and a link to `/account/signin`.
- When `valid` is true, `+page.svelte` shows "Welcome, {name}!" and a form with the fields `newPassword` and `confirmPassword`. It posts `{receivedToken: token, newPassword}` as JSON to `/account/invitation/api/accept-invitation`.
- After a successful post, `+page.svelte` shows "Account Activated" and a link to `/account/signin`.
- [api](./api/EGM.md): This folder holds the endpoint `accept-invitation`.

## Invariants

- `load` deletes the session cookie `kener-user` at path `/` on every visit, before it checks anything. So a signed-in user who opens this page is signed out when `KENER_BASE_PATH` is empty.
- With `KENER_BASE_PATH` set, sign-in sets the cookie at that path, not at `/`, so this delete does not clear it.
- The token is a JWT (JSON Web Token) signed with `KENER_SECRET_KEY`. `load` checks its signature, its `email`, and its `validTill` expiry in milliseconds. A missing `validTill` counts as expired.
- `load` treats the invitation as open only while `users.password_hash` is exactly `""`. `./api/accept-invitation` repeats these checks. Keep the two files in step.
- Every failure returns `token: ""`, so the browser never gets a token that the server rejected.
- The page checks only that the two passwords match and have at least 8 characters. The server's `ValidatePassword` in `src/lib/server/controllers/commonController.ts` also needs one digit, one lowercase letter, and one uppercase letter. The form hint states the full rule.
- The JSON field names `receivedToken` and `newPassword` must match what `accept-invitation` reads.

## Side Effects

- `load` deletes the cookie `kener-user` at path `/`.
- `load` reads the user row from `users` by email (with `users_roles` and `roles`) and reads `users.password_hash` by ID.
- The browser sends `POST /account/invitation/api/accept-invitation`, which writes `users.password_hash`, `users.is_active`, and `users.is_verified`.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
