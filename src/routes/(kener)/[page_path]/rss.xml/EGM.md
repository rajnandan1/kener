# Page RSS Feed

## Overview

This route serves `GET /{page_path}/rss.xml`. It returns an RSS 2.0 feed (a standard XML format that feed readers poll) with the recent incidents and maintenance events of one named status page. The `(kener)` route group adds no URL segment.

## Interface

- `+server.ts` exports `GET`. It calls `renderRssFeedResponse({ scope: { type: "page", pagePath: params.page_path }, feedPath: "/{page_path}/rss.xml" })` from `src/lib/server/rss.ts`.
- The response has `Content-Type: application/rss+xml; charset=utf-8` and `Cache-Control: public, max-age=300`.
- The response is 404 with the text `Not found` for an unknown page or when the `siteURL` setting is empty.

## Invariants

- The feed lists only events on the page's active, visible monitors (`db.getActivePageMonitors` in `src/lib/server/db/repositories/pages.ts`) and events with `is_global = "YES"`.
- The feed has the same time window and item limit as `src/routes/(kener)/rss.xml/`: 90 days back, 90 days ahead for maintenance events, and 50 items at most.
- The home page (`page_path = ""`) is not served here. `src/routes/(kener)/rss.xml/` serves it.
- The route does no sign-in check. The response is cached as `public`, so it must never contain hidden monitors.

## Side Effects

- `renderRssFeedResponse` reads the `site_data`, `pages`, `pages_monitors`, `monitors`, incident tables, and maintenance tables. It writes nothing.
- It reads the `KENER_BASE_PATH` environment variable to build item links.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
