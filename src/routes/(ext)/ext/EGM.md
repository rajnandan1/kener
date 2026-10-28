# ext

## Overview

This folder groups the URL prefix `/ext/`, which serves calls from outside systems. It has no route file of its own. Its only child takes heartbeat pushes.

## Subdirectories & Boundaries

- [heartbeat](./heartbeat/EGM.md): This folder groups `/ext/heartbeat/`. `GET` and `POST /ext/heartbeat/[tag]/[secret]` record a heartbeat for an active `HEARTBEAT` monitor. The route needs no session and no API key, and the secret in the URL is the only credential.
