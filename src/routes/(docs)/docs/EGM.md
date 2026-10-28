# Docs Site (`/docs`)

## Overview

This folder holds the Kener documentation site under `/docs`. It serves the landing page at `/docs`, the shared docs layout, the docs UI components, and `docs-utils.server.ts`. That module reads the docs config `src/routes/(docs)/docs.json` and the Markdown pages in `content/`. The `content/` folder holds Markdown pages only (`content/v3/` and `content/v4/`), and the routes below render those pages.

## Interface

- `+layout.server.ts` exports `load`. It takes the path after `/docs/` and the query parameter `tab`, and returns `config` (from `getDocsConfig`), `currentSlug`, and `isMobile` (from the parent layout).
- `+layout.svelte` renders its children and adds the Google tag (gtag.js, Google Analytics) with the ID `G-Q3MLRXCBFT` to the page head.
- `+page.svelte` is the landing page at `/docs`. It takes `data.config`, links to the quickstart or introduction page of the active version, and renders `LandingStatusDemo`.
- `docs-utils.server.ts` exports these functions:
    - `getDocsRootConfig` returns `docs.json` as it is.
    - `getDocsConfig(version?, tab?, page?)` returns the `DocsConfig` for one version. It picks the requested version, else the version marked `latest`, else the first version. It also picks the active tab and normalizes its sidebar.
    - `getDocsVersions` and `getDocsVersionBySlug` return the version list and one version.
    - `resolveVersionedDocsSlug` splits a path into `versionSlug` and `pageSlug`. It sets `versionSlug` only when the first segment is a known version slug.
    - `resolvePageSlugForConfig`, `getFirstPageSlug`, `getAllPages`, `getPageGroup`, `getAdjacentPages`, and `docExists` look up pages in the sidebar of a `DocsConfig`.
    - `getRawMarkdownContent`, `parseMarkdownWithFrontMatter`, and `getMarkdownContent` return the Markdown of `content/<slug>.md` or `content/<slug>/index.md`, with or without its front-matter.
    - `getDocsPageData` returns the title, description, body, group, and previous and next pages of one page.
    - `extractTableOfContents` and `addHeadingIds` work on the rendered HTML headings.
    - `getVersionDocsUrls` returns the absolute URL of each sidebar page and each tab `url` of one version.
    - `getVersionDocsLlmEntries` returns `DocsLlmEntry` objects (`title`, `description`, `url`) for one version. It lists each tab `url` first, then the raw Markdown URL `/docs/raw/<slug>.md` of each sidebar page.
- `DocsNavbar.svelte` takes `config`, `currentSlug`, `onMenuToggle`, and `isMobileMenuOpen`. It renders the version menu, the tabs, the search button, the `config.footerLinks` links, and the light and dark mode toggle.
- `DocsSearch.svelte` takes the bindable prop `open`. It opens on Cmd+K or Ctrl+K, closes on Escape, and calls `/docs/api/search?q=<query>` 200 ms after the last key press when the query has at least 2 characters.
- `DocsSidebar.svelte` takes `config`, `currentSlug`, and `onNavigate`. It expands the group and the parent page of the current page, and calls `onNavigate` when the user clicks a page link.
- `DocsTableOfContents.svelte` takes `items` and marks the heading that is in view with an `IntersectionObserver`.
- `DocsPageNavigation.svelte` takes `prevPage` and `nextPage` and renders the previous and next links.
- `LandingStatusDemo.svelte` takes no props. It draws an animated demo status bar on the landing page.
- [(with-sidebar)](<./(with-sidebar)/EGM.md>): The layout group adds the navbar and the sidebar, and its `[...slug]` route renders one docs page at `/docs/<version>/<page>`.
- [[version]](<./[version]/EGM.md>): The route `/docs/<version>/llms.txt` returns a plain-text index of one docs version.
- [api](./api/EGM.md): The route `/docs/api/search` returns docs search results from the Redis search index.
- [raw](./raw/EGM.md): The route `/docs/raw/<version>/<page>.md` returns the Markdown source of one page.
- [spec](./spec/EGM.md): The routes `/docs/spec/v4` and `/docs/spec/v4/spec.json` serve the `/api/v4` reference page and its OpenAPI document.

## Invariants

- `docs-utils.server.ts` imports `docs.json` and every `content/**/*.md` file at build time with `import.meta.glob`. A change to a docs page or to `docs.json` needs a new build or a dev-server reload to show.
- Every page slug in `docs.json` must match a Markdown file in `content/`. If the file is missing, the page route and the raw route return 404.
- `getDocsConfig` falls back to the version marked `latest` (now `v4`). The landing page and the layout use this version when the URL has no version slug.
- Layouts do not run for `+server.ts` endpoints. The layout load and the Google tag apply only to the landing page and the `[...slug]` pages.
- No file in this folder does an auth or permission check. The docs site is public.

## Side Effects

- `+layout.svelte` loads the Google tag script from `https://saki-production.up.railway.app/googletagmanager/gtag/js` and sends analytics through that host on every docs page.
- `DocsSearch.svelte` sends a fetch request to `/docs/api/search` for each debounced query.
- The light and dark mode toggle in `DocsNavbar.svelte` and `+page.svelte` uses `toggleMode` from `mode-watcher`, which stores the mode in the browser.
- `LandingStatusDemo.svelte` starts its 1-second timer when the demo comes on screen in a visible tab, and when the tab becomes visible. It stops the timer when the demo leaves the screen or the tab is hidden. It shows a static bar when the user prefers reduced motion.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- The default `npm run build` leaves out `src/routes/(docs)/`. Run `npm run build-with-docs` to check that the docs site builds.
