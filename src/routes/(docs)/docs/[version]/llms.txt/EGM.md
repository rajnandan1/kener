# llms.txt Route

## Overview

This route serves `/docs/<version>/llms.txt`, for example `/docs/v4/llms.txt`. An llms.txt file is a plain-text index of a site's docs that AI tools read. This one lists every page of one docs version, with a link to the raw Markdown of each page.

## Interface

- `+server.ts` exports `GET`. It reads `params.version`.
- `GET` calls `getDocsVersionBySlug` and `getVersionDocsLlmEntries` from `src/routes/(docs)/docs/docs-utils.server.ts`.
- `getVersionDocsLlmEntries` lists the navigation tab URLs first, then one `/docs/raw/<slug>.md` URL for each sidebar page, with the front-matter title and description. It drops duplicate URLs.
- The constant `LLM_BASE_DOMAIN` is `https://kener.ing`. Every URL in the file starts with this host.

## Invariants

- `GET` throws a 404 with the message "Docs version not found" when the version is empty or is not a version slug in `src/routes/(docs)/docs.json`.
- The response has the content type `text/plain; charset=utf-8`.
- The body starts with `# Kener` and `## Docs`. Each entry is one line: `- [title](url)`, or `- [title](url): description` when the entry has a description.
- The route does no auth or permission check.

## Side Effects

- The route reads no database, no Redis, and no files at runtime. It uses only the `docs.json` and Markdown that are bundled at build time.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
