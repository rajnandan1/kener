# password-reset

## Overview

This route folder serves `POST /account/forgot/api/password-reset`. `src/routes/(account)/account/forgot/+page.svelte` calls it with the token from the reset link and the new password. The handler sets a new password for the user that the token names.

## Interface

- `POST` in `+server.ts` reads the JSON body fields `receivedToken` and `newPassword` and returns JSON.
- `POST` returns `200 {success: true}` after it saves the new password.
- `POST` returns `400` with `error` set to "Token is required", "Invalid or expired token", "Invalid token data", "Token has expired", or the password rule message.
- `POST` returns `401 {error: "User does not exist"}` when no user matches the token's email.
- The handler calls `VerifyToken`, `ValidatePassword`, and `HashPassword` from `$lib/server/controllers/controller.js`, and `db.getUserByEmail`, `db.updateUserPassword`, and `db.updateIsVerified`.

## Invariants

- `VerifyToken` checks the JWT (JSON Web Token) signature with `KENER_SECRET_KEY`. It returns `undefined` on any failure.
- The token must carry `email` and `generatedAt`. The handler rejects the token when `Date.now() - generatedAt` is more than 3600000 milliseconds (1 hour).
- This check is the only 1-hour limit. The JWT itself expires after 1 year.
- The handler does not check what the token is for. Any JWT signed with `KENER_SECRET_KEY` that carries `email` and `generatedAt` passes.
- The token is not single-use. The same token can reset the password again until its hour ends.
- `ValidatePassword` requires at least 8 characters with one digit, one lowercase letter, and one uppercase letter.
- The handler checks that the user exists before it checks the password rule.
- The handler checks no session and does no rate limiting.

## Side Effects

- The handler writes `users.password_hash` (a bcrypt hash with 10 salt rounds) and `users.updated_at`.
- The handler then sets `users.is_verified` to 1 in a second query. No transaction covers the two writes.
- The handler reads `users`, `users_roles`, and `roles`. It sends no email and sets no cookie.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads or writes here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
