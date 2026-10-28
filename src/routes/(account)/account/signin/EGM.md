# signin

## Overview

This route folder serves `/account/signin`. It shows the sign-in form. When no user exists yet, it shows the form that creates the first admin account instead. It also shows an OIDC (OpenID Connect, a single sign-on protocol) button when OIDC is enabled.

## Interface

- `load` in `+page.server.ts` reads the parent data from `src/routes/(account)/+layout.server.ts` and the query parameter `oidc_error`.
- `load` redirects to `/manage/app/site-configurations` when `loggedInUser` is set and `isSetupComplete` is true.
- Otherwise `load` returns the parent data plus `oidc` and `oidcError`. `oidc` has the fields `enabled`, `providerName`, and `allowLocalLogin`. `oidcError` is a message from the fixed table `OIDC_ERROR_MESSAGES`, or `null`.
- `actions.login` reads the form fields `email` and `password`. On success it sets the session cookie and redirects to `/manage/app/site-configurations`. On failure it returns `fail()` with status 400, 401, or 403 and an `error` message.
- `actions.signup` reads the form fields `name`, `email`, and `password`. It calls `CreateFirstUser` from `src/lib/server/controllers/userController.ts`, sets the session cookie, and redirects to `/manage/app/site-configurations`.
- `+page.svelte` posts the form to `?/signup` when `isAdminAccountCreated` is false, and to `?/login` otherwise.
- `+page.svelte` links to `/account/oidc/login` from the "Sign in with ..." button and to `/account/forgot` from the "Forgot?" link.
- When `isSetupComplete` is false, `+page.svelte` shows no form. It shows an alert that names the environment variables `KENER_SECRET_KEY`, `ORIGIN`, and `REDIS_URL`.

## Invariants

- `actions.login` checks in this order: the fields are present, at least one user exists, local login is allowed, the user exists, the user is not an OIDC user, the password matches, the user is active, and the user has at least one role.
- `actions.login` blocks local login with 403 when OIDC is enabled and `allow_local_login` is false. `KENER_FORCE_LOCAL_LOGIN=true` lifts this block in both `load` and `actions.login`.
- A user whose `auth_provider` is `oidc` cannot use the password form.
- `role_ids` holds only roles with status `ACTIVE`. A user whose roles are all inactive gets 403.
- `actions.login` does not check `is_verified`.
- An unknown email returns "User does not exist", and a wrong password returns "Invalid password or Email". A caller can use this difference to learn which emails have accounts.
- `actions.signup` works only while the `users` table is empty. The count check and the insert are two separate queries.
- `CreateFirstUser` gives the first user the role `admin` and sets `is_owner` to `YES`.
- The session cookie value is a JWT (JSON Web Token) from `GenerateToken` in `src/lib/server/controllers/commonController.ts`. Its payload is the user row from `GetUserByEmail` in `src/lib/server/controllers/userController.ts`. It is signed with `KENER_SECRET_KEY` and expires after 1 year.
- `CookieConfig()` in `src/lib/server/controllers/commonController.ts` gives the cookie options: the name `kener-user`, `httpOnly`, `sameSite` `lax`, a 1-year `maxAge`, the path `KENER_BASE_PATH` or `/`, and `secure` when `ORIGIN` starts with `https://`.
- Every `fail()` returns the entered email (and the name for signup), never the password.
- `csrfHandle` in `src/hooks.server.ts` returns 403 for a form POST whose `Origin` header names another host.

## Side Effects

- `actions.signup` inserts one row into `users` and one row into `users_roles`.
- Both actions set the cookie `kener-user` and redirect.
- The route reads `users`, `users_roles`, `roles`, and the `oidcSettings` key in `site_data`.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads or writes here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
