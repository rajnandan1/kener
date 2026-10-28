# Status Page Editor

## Overview

This route serves `/manage/app/pages/[page_id]`. It creates, edits, and deletes one status page. A status page is a public page in the `pages` table, served at `/{page_path}`, that shows a chosen list of monitors (`pages_monitors`). The page has no `load` function. It reads `page_id` from `page.params`. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The param value `new` opens the editor in create mode.
- The page sends `getPages` (permission `pages.read`) and finds the page by its numeric id in the browser.
- The page sends `getMonitors` (permission `monitors.read`) with no filter to fill the monitor picker.
- Save sends `createPage` in create mode and `updatePage` in edit mode (permission `pages.write`). The display and SEO cards send `updatePage` with only `page_settings_json`.
- The monitors card sends `addMonitorToPage`, `removeMonitorFromPage`, and `reorderPageMonitors` (permission `pages.write`). Reorder sends the full ordered list of tags.
- The logo and social preview fields send `uploadImage` (permission `images.write`).
- Delete sends `deletePage` (permission `pages.write`).
- The editor has these cards: General Information (with the Page Logo field), Page Monitors, Display Settings, Social Preview & SEO, and a Danger Zone. Create mode shows only General Information.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `pages.read` open this route.
- Save needs `page_title` and `page_header`.
- On save, the page lowercases and trims `page_path`, changes spaces to hyphens, and removes characters outside `[a-z0-9_-]`.
- The home page has an empty `page_path`. Its path input is disabled, and the Danger Zone does not show, so the user cannot delete it.
- Delete runs only when the user types `delete {page_path}` exactly.
- The history days for desktop and mobile must be whole numbers from 1 through 365.
- The page merges the loaded `page_settings_json` over `defaultPageSettings`.
- The logo accepts PNG, JPEG, SVG, and WebP. The social preview accepts PNG, JPEG, and WebP. The logo upload asks for at most 256 by 256, and the social preview upload asks for at most 1200 by 630. An upload only puts the URL into the form. A save stores it.
- Reorder changes the list in the browser before the request, and it does not undo the change on an error.

## Side Effects

- The actions write `pages`, `pages_monitors`, and `images`.
- After a create, the page calls `goto("/manage/app/pages/{id}")`. After a delete, it calls `goto("/manage/app/pages")`.
- The View button opens the public page `/{page_path}` in a new tab.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
