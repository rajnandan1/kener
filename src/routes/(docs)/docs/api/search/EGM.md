# Docs Search API

## Overview

This route serves `GET /docs/api/search?q=<query>`. It returns full-text search results for the docs site. `DocsSearch.svelte` in `src/routes/(docs)/docs/` calls it as the user types.

## Interface

- `+server.ts` exports `GET`. It reads the query parameter `q`.
- `GET` calls `searchDocs(query, 10)` from `src/lib/server/docs-search.ts`.
- The response body is JSON with the shape `{ results }`. The results type is `DocsSearchResult` from `$lib/types/docs-search`.

## Invariants

- When `q` has fewer than 2 characters after trimming, `GET` returns `{ results: [] }` with status 200.
- `GET` returns at most 10 results.
- When `searchDocs` throws, `GET` returns `{ results: [], error: "Search failed" }` with status 500.
- When the Redis key `kener-docs:search:documents` is empty or Redis fails, `searchDocs` returns no results. The route still answers with status 200.
- The route does no auth or permission check.

## Side Effects

- While the in-memory index is empty, each search reads the Redis key `kener-docs:search:documents` and builds an in-memory FlexSearch index (a full-text search library). After one load succeeds, later searches use the in-memory index and do not read Redis.
- `npm run index-docs` (`scripts/index-docs.ts`) writes that Redis key. Run it again after the docs content changes.
- `GET` logs errors to the console with `console.error`.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
