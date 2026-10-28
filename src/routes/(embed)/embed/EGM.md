# embed

## Overview

This folder holds the embed pages under `/embed/`. Other sites put these pages in an iframe (or add them with a script) to show Kener status data. The folder has no source files of its own. The `(embed)` layout above it supplies the theme colors, the font, the locale, and the time zone data. No embed route does an auth or permission check. The monitor and latency pages depend on `GET /dashboard-apis/monitor-bar` to block hidden monitors.

## Subdirectories & Boundaries

- [events](./events/EGM.md): The page `/embed/events/live` shows the ongoing incidents and maintenance events from the database.
- [latency-[tag]](./latency-[tag]/EGM.md): The page `/embed/latency-<tag>` shows the latency chart of one monitor, with the query parameters `days`, `height`, `metric`, and `theme`.
- [monitor-[tag]](./monitor-[tag]/EGM.md): The page `/embed/monitor-<tag>` shows the status bar of one monitor, and its child `/embed/monitor-<tag>/js` returns the script embed for that page.
