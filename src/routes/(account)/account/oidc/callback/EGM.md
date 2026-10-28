# callback

## Overview

This route folder serves `GET /account/oidc/callback`. The IdP (identity provider) sends the browser here after an OIDC (OpenID Connect, a single sign-on protocol) login. The handler checks the IdP response, finds or creates the Kener user, sets the session cookie, and redirects.

## Interface

- `GET` in `+server.ts` is the only export.
- `GET` calls `GetOidcSettings`, `HandleCallback`, `FindOrCreateOidcUser`, and `GenerateOidcSession` from `src/lib/server/controllers/oidcController.ts`. It builds redirect URLs with `serverResolve` from `src/lib/server/resolver.ts`.
- `GET` returns 404 when OIDC is not configured or not enabled.
- `GET` returns 400 "Missing OIDC session data. Please try logging in again." when the cookie `oidc-state`, `oidc-nonce`, or `oidc-code-verifier` is missing.
- On success, `GET` sets the session cookie and redirects to `/manage/app/site-configurations`.
- On failure, `GET` redirects to `/account/signin?oidc_error=<code>`. The code is `provider_error`, `account_deactivated`, `no_roles`, `not_provisioned`, `email_conflict`, or `auth_failed`.
- `src/routes/(account)/account/signin/+page.server.ts` maps each `oidc_error` code to a message.

## Invariants

- The handler checks the `error` query parameter from the IdP before it reads the cookies, so an expired cookie does not hide the IdP error. In this branch the handler does not delete the three OIDC cookies.
- The handler reads the three OIDC cookies and deletes them before it validates them, so each set of cookies works once.
- The delete path is `KENER_BASE_PATH` or `/`. It must stay equal to the path in `src/routes/(account)/account/oidc/login/+server.ts`.
- `HandleCallback` passes the expected state, nonce, and PKCE (Proof Key for Code Exchange) code verifier to `openid-client`, which validates them during the code exchange.
- The `oidc_error` parameter carries only `OidcLoginError.code` or `auth_failed`. It never carries free text or an email address.
- The `catch` block re-throws any 3xx status. The redirects inside `try` depend on this.
- `FindOrCreateOidcUser` creates a user only when `settings.auto_create_users` is true. Otherwise it throws `OidcLoginError("not_provisioned")`.
- `FindOrCreateOidcUser` never merges accounts. A new OIDC user whose email belongs to an existing account gets `email_conflict`.
- A new user gets the roles mapped from the IdP groups. When no group maps, the user gets `settings.default_role_id`, and when that is empty, the user gets `member`.
- The handler rejects a user whose `is_active` is false (`account_deactivated`) and a user whose `role_ids` list is empty (`no_roles`).

## Side Effects

- The handler reads the `oidcSettings` key from `site_data`.
- `HandleCallback` calls the IdP token endpoint. It also calls the IdP userinfo endpoint when the token claims have no email or no groups.
- `FindOrCreateOidcUser` can insert a row into `users` with `auth_provider` `oidc`, an empty `password_hash`, `is_active` 1, and `is_verified` 1. It can update the user's name and email.
- Role sync rewrites `users_roles` only when the OIDC-managed roles change. It keeps the roles that an admin assigned by hand.
- The handler deletes the three OIDC cookies. It sets the session cookie with the name and options from `CookieConfig()`: the name is `kener-user` and the cookie lasts 1 year.
- The session cookie value is a JWT (JSON Web Token) from `GenerateToken`, signed with `KENER_SECRET_KEY`.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads or writes here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
