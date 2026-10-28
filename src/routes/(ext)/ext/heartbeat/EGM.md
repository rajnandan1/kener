# heartbeat

## Overview

This folder groups the URL prefix `/ext/heartbeat/`. Outside jobs call URLs under it to push a heartbeat for a `HEARTBEAT` monitor. It has no route file of its own.

## Subdirectories & Boundaries

- [[tag]](<./[tag]/EGM.md>): This folder captures the monitor tag. Its child `[secret]` serves `GET` and `POST /ext/heartbeat/[tag]/[secret]`, which calls `RegisterHeartbeat` in `src/lib/server/controllers/monitorsController.ts`. The secret in the URL is the only credential.
