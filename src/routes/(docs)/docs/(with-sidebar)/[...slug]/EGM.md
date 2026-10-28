# Docs Page Route (`[...slug]`)

## Overview

This route renders one documentation page at `/docs/<version>/<page>`, for example `/docs/v4/setup/deployment`. The folder name `[...slug]` is a SvelteKit rest parameter: it matches one or more URL segments and puts them in `params.slug`. The `(docs)` and `(with-sidebar)` folders are route groups (folders in parentheses that share a layout and do not appear in the URL). The `(with-sidebar)` layout wraps this page with the navbar and the sidebar.

## Interface

- `+page.server.ts` exports `load`. It splits `params.slug` with `resolveVersionedDocsSlug`, builds the docs config with `getDocsConfig`, and finds the page with `resolvePageSlugForConfig` and `docExists`. All four come from `src/routes/(docs)/docs/docs-utils.server.ts`.
- `load` returns the fields of `getDocsPageData` (`title`, `description`, `slug`, `content`, `prevPage`, `nextPage`, `group`), plus `htmlContent` and `tableOfContents`.
- `load` converts the Markdown body to HTML with `mdToHTML` from `$lib/marked`. `extractTableOfContents` then collects the `h2` to `h4` headings that have an `id`.
- `+page.svelte` renders the HTML with `{@html data.htmlContent}`, and renders `DocsTableOfContents` and `DocsPageNavigation` from `src/routes/(docs)/docs/`.
- `+page.svelte` has three Markdown actions. `copy-url` copies the raw URL `/docs/raw/<slug>.md`, `open-url` opens that URL in a new tab, and `copy-content` copies `data.content`.

## Invariants

- The first slug segment must be a version slug from `src/routes/(docs)/docs.json` (`v4` or `v3`). If it is not, `load` throws a 404 with the message "Documentation page not found".
- When the URL has only a version, for example `/docs/v4`, `load` redirects with status 302 to the first page of the sidebar.
- `load` throws the same 404 when the page is not in the sidebar of the active tab, or when its Markdown file is missing.
- The canonical link, the `og:url` tag, and the JSON-LD (JSON for Linked Data) breadcrumb use the fixed host `https://kener.ing/docs/<slug>`.
- The route does no auth or permission check. The docs site is public.

## Side Effects

- The route reads no database, no Redis, and no files at runtime. `docs-utils.server.ts` bundles `docs.json` and every `content/**/*.md` file at build time with `import.meta.glob`.
- `+page.svelte` stores the selected Markdown action in the `localStorage` key `kener-docs-md-action`.
- `+page.svelte` writes to the clipboard with `navigator.clipboard.writeText`.
- After each navigation, `+page.svelte` adds a copy button to each `pre` block and an anchor link to each `h2` to `h6` heading that has an `id`.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
