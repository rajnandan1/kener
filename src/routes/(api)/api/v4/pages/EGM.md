# Pages API (`/api/v4/pages`)

## Overview

This route lists status pages and creates a new page. A page is one public status page with a path, a title, a header, settings, and an ordered list of monitors. `src/hooks.server.ts` checks the Bearer API key before a handler runs.

## Interface

- `GET` calls `db.getAllPages` and then `db.getPageMonitors` once for each page. It returns `{ pages }`.
- Each page has `id`, `page_path`, `page_title`, `page_header`, `page_subheader`, `page_logo`, `page_settings` (built with `toApiPageSettings`), `monitors` (each with `monitor_tag` and `position`), `created_at`, and `updated_at`.
- `POST` takes a JSON body with `page_path`, `page_title`, and `page_header` (required), and `page_subheader`, `page_logo`, `page_settings`, and `monitors` (optional). It calls `CreatePage` and `AddMonitorToPage` from `$lib/server/controllers/pagesController`. It returns 201 with `{ page }`.
- [[page_path]](<./[page_path]/EGM.md>): this child route reads, edits, and deletes one page.

## Invariants

- The response shows the home page path, the empty string, as `~home` (`GC.HOME_PAGE_TOKEN`).
- The handler cleans `page_path` before it checks it: lowercase, trimmed, spaces turned into `-`, and every character outside `[a-z0-9_-]` removed. A path that a page already uses returns 400, not 409. A path that cleans to the empty string matches the home page, so it also returns 400.
- `page_title` and `page_header` must be non-empty strings. The handler trims them.
- `page_settings` must pass `validatePageSettings` from `$lib/server/pageSettings`.
- Each tag in `monitors` must name an existing monitor, and no tag may appear twice. A `monitors` value that is not a list is ignored.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `POST` inserts one row in `pages` through `CreatePage`.
- `POST` inserts one `pages_monitors` row for each monitor through `AddMonitorToPage`, with `position` set to the list index. These inserts do not run in a transaction with the page insert.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
