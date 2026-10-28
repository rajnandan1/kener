# oidc

## Overview

This folder holds the two GET handlers for OIDC (OpenID Connect, a single sign-on protocol) login. Both handlers return 404 when the `oidcSettings` site data is missing or not enabled. The logic lives in `src/lib/server/controllers/oidcController.ts`.

## Subdirectories & Boundaries

- [login](./login/EGM.md): `GET /account/oidc/login` sets the short-lived cookies `oidc-state`, `oidc-nonce`, and `oidc-code-verifier` and redirects to the IdP (identity provider).
- [callback](./callback/EGM.md): `GET /account/oidc/callback` reads and deletes those cookies, exchanges the code at the IdP, finds or creates the user, and sets the session cookie `kener-user`. On failure it redirects to `/account/signin?oidc_error=<code>`. When one of those cookies is missing, it returns 400 instead.
- The two handlers must use the same cookie names and the same cookie path (`KENER_BASE_PATH` or `/`).
