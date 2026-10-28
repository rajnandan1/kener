# login

## Overview

This route folder serves `GET /account/oidc/login`. It starts an OIDC (OpenID Connect, a single sign-on protocol) login. It sends the browser to the IdP (identity provider) that an admin set in the `oidcSettings` site data.

## Interface

- `GET` in `+server.ts` is the only export.
- `GET` calls `GetOidcSettings` and `BuildAuthorizationUrl` from `src/lib/server/controllers/oidcController.ts`.
- `GET` returns 404 "OpenID Connect is not configured or not enabled" when `GetOidcSettings` returns `null`.
- On success, `GET` sets three cookies and redirects with status 302 to the IdP authorization URL.
- `GET` returns 500 "Failed to initiate OpenID Connect login" on any other error.
- The "Sign in with ..." button in `src/routes/(account)/account/signin/+page.svelte` links to this route.

## Invariants

- The callback URL is `${url.origin}${KENER_BASE_PATH}/account/oidc/callback`. It must match the callback route and the redirect URI that is registered at the IdP.
- The cookie names `oidc-state`, `oidc-nonce`, and `oidc-code-verifier` must stay equal to the names that `src/routes/(account)/account/oidc/callback/+server.ts` reads.
- All three cookies use the path `KENER_BASE_PATH` or `/`. The callback deletes them at the same path, so the two paths must stay equal.
- All three cookies are `httpOnly`, use `sameSite: "lax"`, and expire after 600 seconds (10 minutes). They are `secure` only when `ORIGIN` starts with `https://`.
- `BuildAuthorizationUrl` uses PKCE (Proof Key for Code Exchange) with the `S256` method. It asks for the scopes in `settings.scopes`, or `openid profile email` when that is empty.
- The `catch` block re-throws only an error with status 302. If the redirect status changes, the `catch` turns the redirect into a 500.
- The route checks no session and no permission.

## Side Effects

- `GetOidcSettings` reads the `oidcSettings` key from the `site_data` table.
- `BuildAuthorizationUrl` calls the IdP discovery endpoint through `openid-client` when no configuration is cached. `oidcController.ts` keeps the discovered configuration in memory, keyed by issuer URL, client ID, and client secret.
- `GET` sets the cookies `oidc-state`, `oidc-nonce`, and `oidc-code-verifier`, then redirects to the IdP.
- `GET` logs errors with `console.error`.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
