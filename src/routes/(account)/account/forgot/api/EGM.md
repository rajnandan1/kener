# api

## Overview

This folder groups the two JSON endpoints that the forgot-password page at `/account/forgot` calls. Both endpoints use the URL prefix `/account/forgot/api/`. They need no session, because the user cannot sign in yet. They do not pass through `apiAuthHandle` in `src/hooks.server.ts`, because that hook checks only the `(api)` route group.

## Subdirectories & Boundaries

- [fogot-password](./fogot-password/EGM.md): `POST /account/forgot/api/fogot-password` emails a reset link. The link carries a JWT (JSON Web Token) with the payload `{email, generatedAt}`.
- [password-reset](./password-reset/EGM.md): `POST /account/forgot/api/password-reset` checks that JWT, rejects it after 1 hour by `generatedAt`, and writes the new `users.password_hash`.
