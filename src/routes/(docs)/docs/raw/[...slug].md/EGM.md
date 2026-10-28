# Raw Markdown Route (`[...slug].md`)

## Overview

This route serves the raw Markdown source of one docs page at `/docs/raw/<version>/<page>.md`, for example `/docs/raw/v4/setup/deployment.md`. The folder name `[...slug].md` is a SvelteKit rest parameter followed by the fixed suffix `.md`. The docs page route, `llms.txt`, and the Markdown actions on each page link here.

## Interface

- `+server.ts` exports `GET`. It reads `params.slug`.
- `GET` calls `resolveVersionedDocsSlug`, `getDocsConfig`, `resolvePageSlugForConfig`, `docExists`, and `getRawMarkdownContent` from `src/routes/(docs)/docs/docs-utils.server.ts`.
- `getRawMarkdownContent` returns the file `content/<slug>.md`, or else `content/<slug>/index.md`, or else `null`.

## Invariants

- The first slug segment must be a version slug from `src/routes/(docs)/docs.json`. If it is not, `GET` throws a 404 with the message "Document not found".
- `GET` throws the same 404 when the page is not in the sidebar of the active tab, or when its Markdown file is missing.
- The response has the content type `text/markdown; charset=utf-8` and the header `Content-Disposition: inline; filename="<last slug segment>.md"`.
- The body keeps the front-matter (the YAML block at the top of the file).
- The route does no auth or permission check.

## Side Effects

- The route reads no database, no Redis, and no files at runtime. It uses only the `docs.json` and Markdown that are bundled at build time.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
