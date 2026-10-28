# account

## Overview

This folder groups every page and endpoint under `/account/`: sign-in, sign-out, password reset, invitation, email verification, and OIDC (OpenID Connect, a single sign-on protocol) login. It has no route file of its own. Every page here uses the layout in `src/routes/(account)/+layout.svelte`.

The session cookie is `kener-user`. Its value is a JWT (JSON Web Token) signed with `KENER_SECRET_KEY`. `CookieConfig()` in `src/lib/server/controllers/commonController.ts` sets its options. The links in emails carry a JWT in the query string as `?view=confirm_token&token=<jwt>`.

## Subdirectories & Boundaries

- [signin](./signin/EGM.md): `/account/signin` signs a user in with `actions.login`, or creates the first admin with `actions.signup`. Both actions set `kener-user`.
- [logout](./logout/EGM.md): `/account/logout` deletes `kener-user` with `actions.default` and redirects to `/account/signin`.
- [forgot](./forgot/EGM.md): `/account/forgot` requests a reset email and then sets a new password through `./forgot/api/`.
- [invitation](./invitation/EGM.md): `/account/invitation` checks an invitation link and lets the invited user set a first password through `./invitation/api/`.
- [verify](./verify/EGM.md): `/account/verify` checks an email verification link and sets `users.is_verified`.
- [oidc](./oidc/EGM.md): `/account/oidc/login` starts the OIDC login. `/account/oidc/callback` finishes it and sets `kener-user`.
- The routes that delete `kener-user` must use the path that set it, which is `KENER_BASE_PATH` or `/`. Today `logout` deletes at `serverResolve("/")` and `invitation` deletes at `/`, so neither clears the cookie when `KENER_BASE_PATH` is set.
- None of these routes is in the `(api)` route group, so `apiAuthHandle` in `src/hooks.server.ts` does not check them. The token and password endpoints do no rate limiting.
