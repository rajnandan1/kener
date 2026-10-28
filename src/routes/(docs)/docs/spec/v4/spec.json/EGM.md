# v4 API Spec File Route

## Overview

This route serves `GET /docs/spec/v4/spec.json`. It returns the OpenAPI document (a JSON description of an HTTP API) for the Kener `/api/v4` API. The API reference page at `/docs/spec/v4` loads this file.

## Interface

- `+server.ts` exports `GET`. It takes no parameters.
- The constant `PROD_PATH` is `build/client/api-references/v4.json` under `process.cwd()`.
- The constant `DEV_PATH` is `static/api-references/v4.json` under `process.cwd()`.

## Invariants

- `GET` reads `PROD_PATH` when that file exists. Otherwise it reads `DEV_PATH`.
- `GET` returns the file text as it is. It does not parse or validate the JSON.
- A successful response has status 200, the content type `application/json; charset=utf-8`, and the header `cache-control: public, max-age=300`.
- When the read fails, `GET` returns status 404 with the body `{"error":{"code":"NOT_FOUND","message":"API specification not found"}}`.
- The route does no auth or permission check.

## Side Effects

- `GET` reads one file from disk on each request.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
