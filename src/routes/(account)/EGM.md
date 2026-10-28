# (account)

## Overview

`(account)` is a SvelteKit route group: a folder name in parentheses that adds no URL segment. Its layout wraps every page under `/account/`. The layout loads the site data that those pages need, such as the setup state, the signed-in user, the theme, and the colors. It also renders the shared page frame.

## Interface

- `load` in `+layout.server.ts` returns `GetLayoutServerData(cookies, request)` from `src/lib/server/controllers/layoutController.ts`.
- The data includes `isSetupComplete`, `isAdminAccountCreated`, `loggedInUser`, `siteStatusColors`, `siteStatusColorsDark`, `defaultSiteTheme`, `favicon`, `font`, and `customCSS`, plus the other site settings from `GetLayoutServerData`.
- `src/routes/(account)/account/signin/+page.server.ts` reads `loggedInUser`, `isSetupComplete`, and `isAdminAccountCreated` through `parent()`.
- `+layout.svelte` renders `ModeWatcher` with `defaultSiteTheme`, the `Toaster`, `KenerNav` from `src/lib/components/KenerNav.svelte`, and the child page inside a `max-w-5xl` container.
- `+layout.svelte` adds to the page head: `<meta name="robots" content="noindex, nofollow">`, the favicon link, the optional font stylesheet, a `<style id="dynamic-styles">` block, and a script tag for `/capture.js`.
- [account](./account/EGM.md): This folder holds the sign-in, sign-out, password reset, invitation, email verification, and OIDC (OpenID Connect) routes.

## Invariants

- The layout does no session check and no redirect. Each child route does its own checks.
- `isSetupComplete` is true only when `HasRequiredEnv()` in `src/lib/server/controllers/siteDataController.ts` is true and the site data is not empty. `HasRequiredEnv()` needs `KENER_SECRET_KEY`, `ORIGIN`, and `REDIS_URL`.
- `isAdminAccountCreated` is true when the `users` table has at least one row.
- `loggedInUser` comes from `GetLoggedInSession` in `src/lib/server/controllers/userController.ts`, which verifies the JWT (JSON Web Token) in the cookie `kener-user` and loads the user by email. It is `null` when the token fails, the user is missing, or the user is not active.
- `canSeeHiddenMonitors` is true only when the signed-in user has the permission `monitors.read`.
- The `dynamic-styles` block sets the CSS variables `--up`, `--degraded`, `--down`, `--maintenance`, `--accent`, `--accent-foreground`, and `--font-family` for light and dark mode. It reads `siteStatusColors` and `siteStatusColorsDark` with no optional chaining. `GetLayoutServerData` sets `siteStatusColorsDark` to `siteStatusColors` when the `colorsDark` site data is missing, so only the `colors` site data must be present.
- The layout inserts `customCSS` and `font.family` into the page with `{@html}` and no escaping. This content comes from site data that admins control.

## Side Effects

- `load` reads the cookies `kener-user` and `localLang`, the `user-agent` header, all `site_data` rows, and the `users` row count on every request under `/account/`.
- When the cookie holds a valid token, `load` also reads the user row and that user's permissions.
- The browser loads `/capture.js`, the favicon, and the optional font stylesheet.
- The layout writes nothing to the database and sets no cookie.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
