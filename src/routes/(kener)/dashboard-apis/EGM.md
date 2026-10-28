# dashboard-apis

## Overview

This folder holds the routes under `/dashboard-apis/`. The public status pages call them from the browser to load monitor bars, charts, events, and subscriptions. They are not the `/api/v4` API, and they need no API key.

## Subdirectories & Boundaries

- [[action]](<./[action]/EGM.md>): `/dashboard-apis/{action}` sends each `GET`, `POST`, `PUT`, or `DELETE` request to `src/lib/server/api-server/{action}/{method}.ts`. The route does no sign-in check, and each handler decides who can see hidden monitors.
