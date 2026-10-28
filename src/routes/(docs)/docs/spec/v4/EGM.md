# v4 API Reference Route

## Overview

This route serves `GET /docs/spec/v4`. It returns an interactive HTML reference for the Kener `/api/v4` API. Scalar (the `@scalar/sveltekit` package) builds the page from the OpenAPI document (a JSON description of an HTTP API) that the child route serves.

## Interface

- `+server.ts` exports `GET`. It returns the response of the `render` function that `ScalarApiReference` from `@scalar/sveltekit` creates.
- `ScalarApiReference` gets the spec URL `asset("/docs/spec/v4/spec.json")`, the theme `kepler`, the layout `modern`, and the page title "Kener API Reference".
- [spec.json](./spec.json/EGM.md): The child route serves the OpenAPI document from `build/client/api-references/v4.json` or `static/api-references/v4.json`.

## Invariants

- The page sends "try it" requests through the Scalar proxy `https://proxy.scalar.com` (`proxyUrl`).
- The option `persistAuth: true` lets Scalar keep the auth values that the user enters in the browser.
- The meta tags, the favicon, and the logo use fixed `https://kener.ing` URLs.
- The route does no auth or permission check.

## Side Effects

- The browser loads the spec from `/docs/spec/v4/spec.json` and loads Scalar assets.
- "Try it" requests from the page go to the third-party host `https://proxy.scalar.com`.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
