# accept-invitation

## Overview

This route folder serves `POST /account/invitation/api/accept-invitation`. `src/routes/(account)/account/invitation/+page.svelte` calls it when an invited user sets a first password. The handler sets the password and activates the account.

## Interface

- `POST` in `+server.ts` reads the JSON body fields `receivedToken` and `newPassword` and returns JSON.
- `POST` returns `200 {success: true}` after it activates the user.
- `POST` returns `400` with `error` set to "Token is required", "Password is required", "Invalid or expired invitation link", "Invalid token data", "This invitation link has expired", "This invitation has already been accepted", or the password rule message.
- `POST` returns `401 {error: "User does not exist"}` when no user matches the token's email.
- The handler calls `VerifyToken`, `ValidatePassword`, and `HashPassword` from `$lib/server/controllers/commonController.js`, and `GetUserPasswordHashById` from `$lib/server/controllers/userController.js`.
- The handler calls `db.getUserByEmail`, `db.updateUserPassword`, `db.updateUserIsActive`, and `db.updateIsVerified`.

## Invariants

- The token is a JWT (JSON Web Token) signed with `KENER_SECRET_KEY`. It must carry `email` and `validTill`, an expiry time in milliseconds.
- `SendInvitationEmail` and `ResendInvitationEmail` in `src/lib/server/controllers/userController.ts` make these tokens with `validTill` set 7 days ahead.
- The handler cannot tell an invitation token from an email verification token. `SendVerificationEmail` makes tokens with the same `email` and `validTill` fields, valid for 24 hours.
- The handler treats an invitation as open only while `users.password_hash` is exactly the empty string `""`. Any other stored value returns "This invitation has already been accepted". This check makes each invitation single-use.
- `src/routes/(account)/account/invitation/+page.server.ts` does the same `validTill` and empty `password_hash` checks. Keep the two files in step.
- The handler checks that the user exists and has not accepted before it checks the password rule.
- The handler checks no session and does no rate limiting.

## Side Effects

- The handler writes `users.password_hash` (a bcrypt hash with 10 salt rounds), then sets `users.is_active` to 1, then sets `users.is_verified` to 1. Each write also sets `users.updated_at`.
- The three writes are separate queries with no transaction. If a later write fails, the password is already set, so a retry gets "already accepted" and the user stays partly activated.
- The handler reads `users`, `users_roles`, and `roles`. It does not sign the user in and sets no cookie.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads or writes here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
