# badge/[tag]

## Overview

This folder groups the four SVG badge routes for one monitor, under `/badge/{tag}/`. The path parameter `tag` is a monitor tag, or `_` for all active, visible monitors together. Site owners embed these images in other pages. No route here checks sign-in. Each route leaves out inactive and hidden monitors and returns HTTP 200 with an error image instead of a 404.

## Subdirectories & Boundaries

- [dot](./dot/EGM.md): `GET /badge/{tag}/dot` draws a 32 x 32 circle in the latest status color, or in the `fillColor` query value.
- [latency](./latency/EGM.md): `GET /badge/{tag}/latency` calls `GetBadge("latency", ...)` in `src/lib/server/controllers/monitorsController.ts` and shows the average, maximum, or minimum latency over a time window.
- [status](./status/EGM.md): `GET /badge/{tag}/status` calls `GetBadge("status", ...)` and shows the current status, translated and colored.
- [uptime](./uptime/EGM.md): `GET /badge/{tag}/uptime` calls `GetBadge("uptime", ...)` and shows the uptime percentage over a time window.
