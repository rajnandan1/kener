# verify

## Overview

This route folder serves `/account/verify?view=confirm_token&token=<jwt>`. It confirms a user's email address from the link that `SendVerificationEmail` in `src/lib/server/controllers/userController.ts` sends.

## Interface

- `load` in `+page.server.ts` reads the query parameters `view` and `token`.
- On success, `load` sets the user's `is_verified` to 1 and redirects to `/manage/app/users` with status 302.
- On failure, `load` returns `{valid: false, error}` with one of five messages.
- `+page.svelte` renders only on failure. It shows "Email Verification Failed", the `error` message, and a "Go to Sign In" link to `/account/signin`.
- The route has no form actions.

## Invariants

- The signed token alone authorizes the update. The route checks no session.
- The token is a JWT (JSON Web Token) signed with `KENER_SECRET_KEY`. It must carry `email` and `validTill`, an expiry time in milliseconds. `SendVerificationEmail` sets `validTill` 24 hours ahead.
- An invitation token from `SendInvitationEmail` also carries `email` and `validTill`, so it passes this check too.
- A session JWT from sign-in has no `validTill`, so this check rejects it.
- `load` writes `is_verified` only when it is not set yet. A second visit changes nothing.
- `load` calls `db.getUserByEmail` and `db.updateIsVerified` directly, not through `userController`.

## Side Effects

- `load` updates `users.is_verified` and `users.updated_at` for the matched user.
- `load` redirects to `/manage/app/users` on success.
- The route sets no cookie and sends no email.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads or writes here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
