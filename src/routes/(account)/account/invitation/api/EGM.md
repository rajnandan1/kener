# api

## Overview

This folder holds the JSON endpoint that the invitation page at `/account/invitation` calls. The endpoint uses the URL prefix `/account/invitation/api/`. It needs no session, because the invited user has no password yet. It does not pass through `apiAuthHandle` in `src/hooks.server.ts`, because that hook checks only the `(api)` route group.

## Subdirectories & Boundaries

- [accept-invitation](./accept-invitation/EGM.md): `POST /account/invitation/api/accept-invitation` checks the invitation JWT (JSON Web Token) and its `validTill` expiry. It sets the first password and sets `users.is_active` and `users.is_verified` to 1.
