# Site RSS Feed

## Overview

This route serves `GET /rss.xml`. It returns an RSS 2.0 feed (a standard XML format that feed readers poll) with recent incidents and maintenance events. The feed uses the default status page only when the `globalPageVisibilitySettings.forceExclusivity` setting is on. The `(kener)` route group adds no URL segment.

## Interface

- `+server.ts` exports `GET`. It calls `renderRssFeedResponse({ scope: { type: "page", pagePath: null }, feedPath: "/rss.xml" })` from `src/lib/server/rss.ts`.
- The response has `Content-Type: application/rss+xml; charset=utf-8` and `Cache-Control: public, max-age=300`.
- The response is 404 with the text `Not found` when the `siteURL` setting is empty.

## Invariants

- `renderRssFeedResponse` puts incidents that started in the last 90 days and maintenance events that start from 90 days ago to 90 days ahead into the feed. It sorts them newest first and keeps 50 items at most.
- When the `globalPageVisibilitySettings.forceExclusivity` setting is off, the feed has no monitor filter. It then lists every `OPEN` incident in the time window, also an incident whose only monitors are hidden. `groupIncidentsByIdForMonitorList` in `src/lib/server/db/repositories/incidents.ts` and `groupMaintenancesByIdForMonitorList` in `src/lib/server/db/repositories/maintenances.ts` remove hidden monitors only from the monitor list of each item.
- When `forceExclusivity` is on, the feed uses the page with `page_path = ""`. It lists only events on that page's active, visible monitors and events with `is_global = "YES"`. A missing home page then gives 404.
- The `feedPath` value `/rss.xml` must match this route, because the feed uses it for its own `atom:link` URL.
- The route does no sign-in check. The response is cached as `public`, so it must never contain data that only signed-in users can see.

## Side Effects

- `renderRssFeedResponse` reads the `site_data`, `pages`, `pages_monitors`, `monitors`, `incidents`, `incident_monitors`, `incident_comments`, `maintenances_events`, `maintenances`, and `maintenance_monitors` tables. It writes nothing.
- It reads the `KENER_BASE_PATH` environment variable to build item links.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
