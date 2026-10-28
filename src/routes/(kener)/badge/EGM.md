# badge

## Overview

This folder holds the public SVG badge routes under `/badge/`. The badges show the status, uptime, or latency of a monitor as an image. `GetBadge` in `src/lib/server/controllers/monitorsController.ts` builds the status, uptime, and latency badges. The dot badge builds its own SVG.

## Subdirectories & Boundaries

- [[tag]](<./[tag]/EGM.md>): The `/badge/{tag}/` routes serve the `dot`, `latency`, `status`, and `uptime` badges for one monitor, or for all active, visible monitors when `tag` is `_`.
