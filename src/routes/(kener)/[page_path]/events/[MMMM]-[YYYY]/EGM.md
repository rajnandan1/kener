# Page Monthly Events Page

## Overview

This route serves `/{page_path}/events/{Month}-{Year}`, for example `/status-a/events/March-2025`. It shows the incidents and maintenance events of one month for one named status page. The `(kener)` route group adds no URL segment. The server only checks the month. The browser loads the events.

## Interface

- `+page.server.ts` exports `load`. It is the same file as `src/routes/(kener)/events/[MMMM]-[YYYY]/+page.server.ts`. It returns `{ monthParam, monthStartTs, monthEndTs }` and throws 404 for a bad or out-of-range month.
- The route has no form actions.
- `+page.svelte` sends `POST /dashboard-apis/events-by-month?page_path=<page_path>` with the body `{ start_ts, end_ts }` on mount. The handler in `src/lib/server/api-server/events-by-month/post.ts` finds the page with `db.getPageByPath` and keeps the events on the page's active, visible monitors and the events with `is_global = "YES"`.
- The previous and next month links start with `/{page_path}`.

## Invariants

- This folder is a copy of `src/routes/(kener)/events/[MMMM]-[YYYY]/`. The only difference is in `+page.svelte`: this copy renders the "Total Incidents" and "Total Maintenances" labels with `{@html $t(...)}`, and the other copy escapes them. A fix in one copy must also go into the other copy.
- `load` does not check `page_path`. An unknown page still returns HTTP 200. Only the browser fetch gets 404 `Page not found`, and the page then shows the empty "No Events" state.
- The page puts `page_path` into the query string without `encodeURIComponent`.
- `monthEndTs` runs about one day into the next month, as in the other copy.
- The route does no sign-in check.

## Side Effects

- `load` reads nothing from the database.
- The browser makes one `POST` request to `/dashboard-apis/events-by-month`, which only reads the database.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
