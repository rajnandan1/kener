# Monitor RSS Feed

## Overview

This route serves `GET /monitors/{monitor_tag}/rss.xml`. It returns an RSS 2.0 feed (a standard XML format that feed readers poll) with the recent incidents and maintenance events of one monitor. The `(kener)` route group adds no URL segment.

## Interface

- `+server.ts` exports `GET`. It calls `renderRssFeedResponse({ scope: { type: "monitor", tag: params.monitor_tag }, feedPath: "/monitors/{monitor_tag}/rss.xml" })` from `src/lib/server/rss.ts`.
- The response has `Content-Type: application/rss+xml; charset=utf-8` and `Cache-Control: public, max-age=300`.
- The response is 404 with the text `Not found` when the monitor does not exist, when it has `is_hidden = "YES"`, when its `status` is not `ACTIVE`, or when the `siteURL` setting is empty.

## Invariants

- The 404 for a hidden or inactive monitor is the only visibility check. It must stay, because the response is cached as `public` for all readers.
- The feed also lists every incident and maintenance event with `is_global = "YES"`.
- The feed has the same time window and item limit as `src/routes/(kener)/rss.xml/`: 90 days back, 90 days ahead for maintenance events, and 50 items at most.
- The route does no sign-in check.

## Side Effects

- `renderRssFeedResponse` reads the `site_data`, `monitors`, incident tables, and maintenance tables. It writes nothing.
- It reads the `KENER_BASE_PATH` environment variable to build item links.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
