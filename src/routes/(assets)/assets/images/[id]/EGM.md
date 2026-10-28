# [id]

## Overview

This route folder serves `GET /assets/images/[id]`. It returns an uploaded image from the `images` table. `[id]` is a SvelteKit route parameter. The route needs no session and no API key.

## Interface

- `GET` in `+server.ts` reads the route parameter `id` and calls `db.getImageById(id)`.
- `GET` returns 200 with the decoded image bytes. The response has `Content-Type` from `images.mime_type`, a `Content-Length`, and `Cache-Control: public, max-age=31536000, immutable`.
- `GET` returns 400 "Image ID is required" when `id` is empty.
- `GET` returns 404 "Image not found" when no row matches `id`.

## Invariants

- `images.data` must hold base64 text. The handler decodes it with `Buffer.from(image.data, "base64")` and does not check the result.
- The handler sends `images.mime_type` as `Content-Type` without checking it.
- Browsers and a CDN (content delivery network) can keep a response for 1 year (31536000 seconds), so the bytes stored under an `id` must never change.
- `ImagesRepository.insertImage` in `src/lib/server/db/repositories/images.ts` keeps the existing row when the `id` already exists.
- `apiAuthHandle` in `src/hooks.server.ts` checks API keys only for routes in the `(api)` route group, so it does not check this route.
- `privateCacheHandle` in `src/hooks.server.ts` does not replace this route's `Cache-Control`, because it acts only on a response that has none.

## Side Effects

- `GET` reads one row from the `images` table. It writes nothing.

## Verification

- Run: `npm run check`
- Run: `npm test`. No test covers this directory directly.
- A change to the database reads here must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
