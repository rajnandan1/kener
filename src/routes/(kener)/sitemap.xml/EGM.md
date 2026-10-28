# Sitemap

## Overview

This route serves `GET /sitemap.xml`. It returns a sitemap (an XML list of public URLs for search engines) in the mode that the `sitemap` setting selects. The `(kener)` route group adds no URL segment.

## Interface

- `+server.ts` exports only `GET`. It also defines two module functions that it does not export, `sitemapResponse(urlEntries)` and `escapeXml(str)`.
- The handler reads the `sitemap` setting with `GetSiteDataByKey("sitemap")` from `src/lib/server/controllers/siteDataController.ts`. The setting has the shape `SitemapXMLConfig` from `src/lib/types/site.ts`: `{ mode, urls: [{ loc }] }`. The default mode is `auto`.
- Mode `off` returns 404 with the text `Not found`.
- Mode `manual` lists only the configured `urls`. The handler trims each `loc` and skips empty ones.
- Mode `auto` needs the `siteURL` setting, and it returns 404 without it. It lists every page from `GetAllPages()` in `src/lib/server/controllers/pagesController.ts`, every monitor from `GetMonitors({ status: "ACTIVE", is_hidden: "NO" })` in `src/lib/server/controllers/monitorsController.ts` as `/monitors/{tag}`, the events pages of the current and the previous UTC month as `/events/{Month}-{Year}`, and then the manual `urls`.
- The response has `Content-Type: application/xml` and no `Cache-Control` header.

## Invariants

- Auto mode lists only active, visible monitors. Hidden monitors must stay out of the sitemap.
- Auto mode lists every row of the `pages` table, with no visibility filter. A page with an empty `page_path` maps to `/`.
- Auto mode builds page, monitor, and events URLs as `siteURL` plus `serverResolver(path)` from `src/lib/server/resolver.ts`, so they include `KENER_BASE_PATH`. Manual URLs go into the sitemap as they are.
- `escapeXml` escapes every `<loc>` value.
- The route does no sign-in check.

## Side Effects

- The handler reads the `site_data`, `pages`, and `monitors` tables. It writes nothing.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The code reads the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
