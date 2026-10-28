# Docs Route Group (`(docs)`)

## Overview

`(docs)` is a SvelteKit route group (a folder in parentheses that shares a layout and does not appear in the URL). It holds the Kener documentation site under `/docs`: the docs pages, which render the Markdown files in `docs/content/`, plus the search, `llms.txt`, raw Markdown, and API reference routes. The folder also holds the docs config `docs.json` and its JSON Schema `docs.schema.json`. The docs site is optional: the default `npm run build` moves this folder out of `src/routes/` during the build.

## Interface

- `+layout.server.ts` exports `load`. It reads the `user-agent` request header with `MobileDetect` from `mobile-detect` and returns `{ isMobile }`.
- `+layout.svelte` imports the CSS files `layout.css`, `kener.css`, `docs.css`, and `prose.css` from `src/routes/`, plus `highlight.js/styles/github-dark.css`. It renders `ModeWatcher` from `mode-watcher` and `Toaster` from `$lib/components/ui/sonner`, and wraps the page in `<main class="kener-docs">`.
- `docs.json` has the keys `name`, `logo`, `favicon`, and `versions`. Each version has a `name`, a `slug` (`v4` or `v3`), a `latest` flag, and `content`. `content` holds `navigation` (the tabs and their sidebars) and `footerLinks` (a list of `name` and `url` links that the docs navbar and the landing page show).
- `docs.schema.json` is the JSON Schema (a JSON file that describes the allowed shape of another JSON file) for `docs.json`.
- [docs](./docs/EGM.md): The folder serves `/docs` and every docs route, and its `docs-utils.server.ts` reads `docs.json` and the Markdown in `docs/content/`.

## Invariants

- `scripts/build-sveltekit.js` renames this folder to `.docs-excluded` during `npm run build` and renames it back after the build. Code outside `src/routes/(docs)/` must not import from this folder, or the default build breaks.
- `scripts/index-docs.ts` reads `docs.json` and `docs/content/` by fixed paths. A rename of these paths must also change that script.
- The layout does no auth or permission check. The docs site is public.

## Side Effects

- `+layout.svelte` loads the fonts Geist and Geist Mono from `https://fonts.bunny.net` on every docs page.
- `ModeWatcher` reads and stores the light or dark mode in the browser.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
- Run: `npm run build-with-docs` to build the app with the docs site. The default `npm run build` does not build this folder.
