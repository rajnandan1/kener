# Manage Route Group

## Overview

`(manage)` is a SvelteKit route group: the name in parentheses is not part of the URL. The group holds the admin dashboard under `/manage`. Its layout sends visitors without a session to the sign-in page, checks the permission of every dashboard page, and draws the sidebar, the header, and the site colors around each page.

## Interface

- `+layout.server.ts` exports `load({ cookies, route })`. It returns `userDb`, `userPermissions` (a list), `siteStatusColors`, `siteStatusColorsDark`, `font`, `defaultSiteTheme`, `canSendEmail`, and `seedSiteData`.
- `+layout.svelte` builds the sidebar from a fixed list of 20 `/manage/app/*` pages. It keeps only the items the user has permission for. It renders `AppSidebar` and `SiteHeader` from `./manage/`, and it sets the page title from the matching item, or `Dashboard`.
- `+layout.svelte` writes the status colors and the font into CSS variables (`--up`, `--degraded`, `--down`, `--maintenance`, `--accent`, `--accent-foreground`, and `--font-family`) on `.kener-manage`. It sets `noindex, nofollow` for search engines.
- [manage](./manage/EGM.md): the dashboard shell components, the manage API, and the dashboard pages.

## Invariants

- `load` checks in this order. When setup is not complete (`IsSetupComplete` in `src/lib/server/controllers/siteDataController.ts`), or when there is no session (`GetLoggedInSession` in `src/lib/server/controllers/userController.ts`), it redirects with 302 to `/account/signin`.
- Then `load` looks up `route.id` in `ROUTE_PERMISSION_MAP` (`src/lib/allPerms.ts`). It returns 403 when the route has no entry, so a new page under this group needs an entry. It also returns 403 when the user lacks the mapped permission. A `null` entry lets any signed-in user in.
- The layout guard runs only for pages. The `POST /manage/api` endpoint does its own session and permission check.
- The sidebar list in `+layout.svelte` and `ROUTE_PERMISSION_MAP` must name the same routes. An item with no map entry does not show.
- `siteStatusColorsDark` falls back to `siteStatusColors`. `defaultSiteTheme` falls back to `system`.
- `canSendEmail` comes from `IsEmailSetup()` in `src/lib/server/controllers/emailController.ts`. Pages use it to disable email features.

## Side Effects

- `load` reads the session, the site data, and the user's permissions from the database on every dashboard page load.
- `+layout.svelte` adds the font stylesheet from `font.cssSrc` when it is set.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- A change to the database reads in `load` must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
