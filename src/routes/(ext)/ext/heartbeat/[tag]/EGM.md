# [tag]

## Overview

This folder captures the route parameter `[tag]`, the tag of a `HEARTBEAT` monitor. It has no route file of its own, so `/ext/heartbeat/[tag]` alone serves nothing.

## Subdirectories & Boundaries

- [[secret]](<./[secret]/EGM.md>): `GET` and `POST /ext/heartbeat/[tag]/[secret]` record a heartbeat for an active `HEARTBEAT` monitor when the secret matches `type_data.secretString`. The handler writes the Redis key `kener:cache:last_heartbeat:<tag>` and a `SIGNAL` row in `monitoring_data`.
