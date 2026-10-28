# Monitor Script Embed (`/embed/monitor-<tag>/js`)

## Overview

This route serves `GET /embed/monitor-<tag>/js`. It returns a JavaScript file. Another site loads it with a `<script>` tag, and the script adds an iframe of the monitor embed page next to that tag. `src/lib/components/EmbedMenu.svelte` builds the script tag as `<script src="<embed URL>/js?theme=<theme>&monitor=<embed URL>">`.

## Interface

- `+server.ts` exports `GET`. It reads the route parameter `tag` and the query parameters `monitor` (the embed page URL, no default) and `theme` (default `light`).
- The script defines `createEmbedFrame` and runs it 5 ms after load.
- `createEmbedFrame` finds the `script` element whose `src` contains the `monitor` URL without its protocol. It inserts an iframe right after that element, with `src` set to `<monitor>?theme=<theme>` and `id` set to `KENER_` plus the number of days since 1970-01-01.
- The script sets the iframe `sandbox` to `allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-top-navigation-by-user-activation allow-downloads` and the iframe `allow` to `midi; geolocation; microphone; camera; display-capture; encrypted-media;`.
- The script adds a `message` listener to `window`. When `event.data.slug` equals `tag`, the listener sets the iframe height from `event.data.height` and the width from `event.data.width`.

## Invariants

- The route sets only the header `Content-Type: application/javascript`. It sets no cache header and no CORS header. `privateCacheHandle` in `src/hooks.server.ts` adds `cache-control: private` when the request carries the `kener-user` cookie.
- `GET` does no database lookup and returns the script for any tag.
- The iframe starts with width `0%` and height `0`. No page in `src/` calls `postMessage`, so nothing changes that size unless the host page does it.
- The `message` listener does not check `event.origin`.
- The route does no auth or permission check.

## Side Effects

- The script adds an iframe to the host page and adds a `message` listener to the host `window`.
- When no `script` element matches the `monitor` URL, the script throws on `target.parentNode`.

## Verification

- Run: `npm run check` (svelte-kit sync and svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
