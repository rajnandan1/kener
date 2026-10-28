# (ext)

## Overview

`(ext)` is a SvelteKit route group: a folder name in parentheses that adds no URL segment. It has no layout file, so its routes render no page chrome and load no layout data. It holds the endpoints that outside systems call. These endpoints are outside the `(api)` route group, so `apiAuthHandle` in `src/hooks.server.ts` does not ask them for an API key.

## Subdirectories & Boundaries

- [ext](./ext/EGM.md): This folder groups `/ext/`. Its one endpoint, `/ext/heartbeat/[tag]/[secret]`, records heartbeats for `HEARTBEAT` monitors. It writes the Redis key `kener:cache:last_heartbeat:<tag>` and a `SIGNAL` row in the `monitoring_data` table.
