# Page API (`/api/v4/pages/{page_path}`)

## Overview

This route reads, edits, and deletes one status page. A page is one public status page with a path, a title, a header, settings, and an ordered list of monitors. The home page has the empty path, so the URL addresses it with the token `~home` (`GC.HOME_PAGE_TOKEN`). Before a handler runs, `src/hooks.server.ts` checks the Bearer API key and loads the page into `locals.page`, or returns a JSON 404.

## Interface

- `GET` returns `{ page }`. The object has `id`, `page_path`, `page_title`, `page_header`, `page_subheader`, `page_logo`, `page_settings`, `monitors` (each with `monitor_tag` and `position`), `created_at`, and `updated_at`.
- `PATCH` takes a JSON body in which `page_path`, `page_title`, `page_header`, `page_subheader`, `page_logo`, `page_settings`, and `monitors` are all optional. It calls `UpdatePage`, `GetPageMonitors`, `RemoveMonitorFromPage`, and `AddMonitorToPage` from `$lib/server/controllers/pagesController`. It also calls `validatePageSettings` and `applyPageSettingsPatch` from `$lib/server/pageSettings`. It returns `{ page }`.
- `DELETE` calls `DeletePage` from the same controller and returns `{ message }`.

## Invariants

- The response shows the home page path as `~home`. When a `PATCH` body sends `~home` back for the home page, the handler treats it as no change.
- The home page path cannot change. Any other path for it returns 400 `Home page path cannot be changed`.
- `DELETE` returns 400 `Cannot delete the home page` for the home page. `DeletePage` enforces the same rule.
- The handler cleans `page_path` before it checks it: lowercase, trimmed, spaces turned into `-`, and every character outside `[a-z0-9_-]` removed. A path that another page uses returns 400, not 409.
- `page_title` and `page_header` must be non-empty when the body has them.
- `page_settings` must pass `validatePageSettings`. `applyPageSettingsPatch` merges it into the stored `page_settings_json` and keeps stored keys that it does not know.
- Each tag in `monitors` must name an existing monitor, and no tag may appear twice. Any other list returns 400.
- The handlers call only `get*` methods on `db`. `src/routes/(api)/api/v4/no-direct-db-writes.test.ts` fails when a v4 route calls a `db` write method directly.

## Side Effects

- `PATCH` updates the row in `pages` through `UpdatePage` whenever the body sends a page field, even when the value equals the stored one.
- When `monitors` is a list, `PATCH` deletes every `pages_monitors` row of the page and inserts the new list in order, with `position` set to the list index. These writes do not run in a transaction, so a failure part way leaves only part of the list.
- `DELETE` deletes only the `pages` row through `db.deletePage`. The `pages_monitors` rows go away only through their foreign-key `ON DELETE CASCADE`. A comment in `src/lib/server/db/repositories/monitorAlertConfig.ts` says that SQLite does not enforce those cascades.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test file sits in this directory. `src/routes/(api)/api/v4/write-parity.test.ts` calls these handlers, so `npm run test:server -- "src/routes/(api)/api/v4/write-parity.test.ts"` is the fastest direct check.
- A change here reads and writes the database, so it must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
