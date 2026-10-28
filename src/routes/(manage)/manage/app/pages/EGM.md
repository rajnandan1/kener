# Status Pages List Page

## Overview

This route serves `/manage/app/pages`. It lists the status pages and links to the status page editor. A status page is a public page in the `pages` table, served at `/{page_path}`, that shows a chosen list of monitors. The page has no `load` function. It reads through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getPages` (permission `pages.read`) with no data. The result is every page with its `monitors` list.
- The table shows the logo, the title and header, the path, and the monitor count.
- The page links to `/manage/app/pages/new` and `/manage/app/pages/{id}`. The path and the View button open `/{page_path}` in a new tab.
- [[page_id]](<./[page_id]/EGM.md>): the status page editor. The value `new` opens create mode.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `pages.read` open this route.
- The page shows every status page. It has no paging and no filter.
- The page shows a load error in the page body.
- The page writes no data.

## Side Effects

- The page only reads, once on mount.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
