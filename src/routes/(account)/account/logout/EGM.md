# logout

## Overview

This route folder serves `/account/logout`. It signs the user out by deleting the session cookie `kener-user`. It has no `+page.svelte`, so it never renders a page.

## Interface

- `load` in `+page.server.ts` redirects every GET to `/account/signin` with status 302.
- `actions.default` deletes the cookie `kener-user` at the path `serverResolve("/")`. Then it redirects to `/account/signin` with status 302. It reads no form fields.
- Both functions build URLs with `serverResolve` from `src/lib/server/resolver.ts`. `serverResolve` puts `KENER_BASE_PATH` in front of the path.

## Invariants

- The action checks no session. Any POST to the default action clears the cookie.
- The cookie name `"kener-user"` is a string literal here. It must stay equal to `CookieConfig().name` in `src/lib/server/controllers/commonController.ts`.
- The delete path must equal the path that set the cookie, or the browser keeps the cookie. Sign-in sets it at `CookieConfig().path`, which is `KENER_BASE_PATH` or `/`. This action deletes it at `serverResolve("/")`, which is `KENER_BASE_PATH` followed by `/`.
- The two paths are equal only when `KENER_BASE_PATH` is empty. For example, with `KENER_BASE_PATH=/status`, sign-in sets the cookie at `/status` and this action deletes it at `/status/`.
- `csrfHandle` in `src/hooks.server.ts` returns 403 for a form POST whose `Origin` header names another host.

## Side Effects

- The action clears the cookie `kener-user`.
- Both `load` and the action redirect to `/account/signin`.
- The route reads and writes no database table.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
