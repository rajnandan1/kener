# (assets)

## Overview

`(assets)` is a SvelteKit route group: a folder name in parentheses that adds no URL segment. It has no layout file. It holds the public endpoint that serves images stored in the database. That endpoint is outside the `(api)` route group, so `apiAuthHandle` in `src/hooks.server.ts` does not ask it for an API key.

## Subdirectories & Boundaries

- [assets](./assets/EGM.md): This folder groups `/assets/`. `GET /assets/images/[id]` reads one row from the `images` table and returns the image bytes with `Cache-Control: public, max-age=31536000, immutable`. It writes nothing.
