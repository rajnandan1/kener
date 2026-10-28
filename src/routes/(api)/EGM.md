# API Route Group (`(api)`)

## Overview

`(api)` is a SvelteKit route group: a folder that groups routes without adding a URL segment. It holds the public REST API that scripts and other services call with a Bearer API key.

`src/hooks.server.ts` uses this group to decide which requests need the key. It requires a key for each route whose `event.route.id` starts with `/(api)/`. It decides from the route id because SvelteKit decodes the path before it matches a route, so a raw path such as `/%61pi/v4/monitors` still reaches an API route. A route placed in this group gets the API key check, and a route moved out of it loses that check.

The status page does not use this group. It reads its own data from `/dashboard-apis/<action>` (`src/routes/(kener)/dashboard-apis/[action]/+server.ts`) without an API key.

## Subdirectories & Boundaries

- api: [api](./api/EGM.md) - This folder is the `/api` URL segment. It holds the version 4 REST API in `v4`.
