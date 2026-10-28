# Status Badge

## Overview

This route serves `GET /badge/{tag}/status`. It returns a shields-style SVG badge with the current status of a monitor, translated and colored by status. The `(kener)` route group adds no URL segment.

## Interface

- `+server.ts` exports `GET`. It is the only HTTP method.
- The handler passes the path parameter `tag` and the query parameters `label`, `labelColor`, `color`, `style`, and `locale` to `GetBadge("status", ...)` in `src/lib/server/controllers/monitorsController.ts`.
- `GetBadge` uses `locale` only when the site `i18n` setting selects that locale and `isLocaleAvailable()` in `src/lib/server/i18n.ts` returns true. Otherwise it uses the site default locale, or `en`.
- The badge color comes from the status and the site `colors` setting, unless the `color` query parameter replaces it.
- The tag `_` uses `GetLatestStatusActiveAll` in `src/lib/server/controllers/monitorsController.ts`, which merges the latest statuses of all monitors with `status = "ACTIVE"` and `is_hidden = "NO"`.
- The route sets only `Content-Type: image/svg+xml`. `privateCacheHandle` in `src/hooks.server.ts` adds `cache-control: private` when the request carries the `kener-user` cookie.

## Invariants

- `GetBadge` returns HTTP 200 with the static `ErrorSvg` image from `src/lib/anywhere.ts` for an unknown, inactive, or hidden monitor. It does not return a 404.
- The route does no sign-in check and no page check. The `ACTIVE` and not-hidden filter in `GetBadge` is the only visibility check.
- A monitor with no status gets `GC.NO_DATA`. The badge then shows the translated text "No Status Available" in the `NO_DATA` color of the site `colors` setting, or `#9ca3af` when that setting has none.
- If the site `i18n` or `colors` setting does not parse as JSON, `GetBadge` uses the defaults and does not throw.

## Side Effects

- `GetBadge` reads the Redis key `kener:cache:<tag>:last_status` (time to live 86400 seconds). On a cache miss, it reads the newest `monitoring_data` row and writes the Redis key.
- `GetBadge` reads the `monitors`, `monitoring_data`, and `site_data` tables. It writes nothing to the database.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
