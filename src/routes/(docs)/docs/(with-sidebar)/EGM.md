# Docs Sidebar Layout (`(with-sidebar)`)

## Overview

This folder is a route group (a folder in parentheses that shares a layout and does not appear in the URL). Its layout adds the docs navbar and the left sidebar around each docs page. The docs landing page at `/docs` is outside this group, so it has no sidebar.

## Interface

- `+layout.svelte` takes `data` of type `DocsLayoutData` from `$lib/types/docs`. The parent load in `src/routes/(docs)/docs/+layout.server.ts` supplies `data.config` and `data.currentSlug`.
- `+layout.svelte` renders `DocsNavbar` and `DocsSidebar` from `src/routes/(docs)/docs/`.
- `+layout.svelte` sets the page favicon from `data.config.favicon` through `clientResolver` from `$lib/client/resolver.js`.
- [[...slug]](<./[...slug]/EGM.md>): The child route renders one docs page at `/docs/<version>/<page>`.

## Invariants

- The layout has no load function. It uses only the data of the parent layout.
- The state `isMobileMenuOpen` controls the sidebar on small screens. A click on the overlay or on a sidebar link closes it.

## Side Effects

- The layout has no server or storage side effects. It changes only local UI state.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
