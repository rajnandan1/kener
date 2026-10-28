# pages

## Overview

This folder serves `GET /dashboard-apis/pages`. The handler returns the list of status pages for the page navigation.

## Interface

- `get.ts` exports the default handler `get(_req: APIServerRequest)`. The handler takes no parameters. It returns an array of `PageNavItem` (the type from `src/lib/server/controllers/dashboardController.ts`) with status 200. Each item has `page_title`, `page_path`, `page_header`, and `page_logo`.

## Invariants

- The handler returns every page. It does no auth or visibility check.
- When the site setting `pageOrderingSettings.enabled` is true and its `order` list (page ids) is not empty, the handler sorts the pages: listed pages come first in list order, and the other pages follow by ascending `id` (`get.ts:19-31`). Otherwise it keeps the order that `GetAllPages` returns.

## Side Effects

- The handler reads `GetAllPages()` from `src/lib/server/controllers/pagesController.ts` and `GetSiteDataByKey("pageOrderingSettings")` from `src/lib/server/controllers/siteDataController.ts`. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this folder directly.
- The handler reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
