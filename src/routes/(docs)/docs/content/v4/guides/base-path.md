---
title: Base Path Deployment
description: Deploy Kener under a subpath like /status using KENER_BASE_PATH with Docker and reverse proxies
---

Use this guide when Kener should be served from a subpath (for example `https://example.com/status`) instead of domain root.

## Quick setup {#quick-setup}

Set these values:

| Variable          | Value for subpath setup |
| :---------------- | :---------------------- |
| `KENER_BASE_PATH` | `/status`               |
| `ORIGIN`          | `https://example.com`   |

> [!IMPORTANT]
> `ORIGIN` must be the site origin only (scheme + host + optional port), not the full `/status` URL.

## Prebuilt Docker images for subpath {#prebuilt-images}

Use the prebuilt subpath tags:

- `docker.io/rajnandan1/kener:latest-status`
- `docker.io/rajnandan1/kener:latest-status-alpine`
- `ghcr.io/rajnandan1/kener:latest-status`
- `ghcr.io/rajnandan1/kener:latest-status-alpine`

Release tags follow the same pattern:

- `vX.Y.Z-status`
- `vX.Y.Z-status-alpine`

## Run with Docker {#run-docker}

```bash
docker run -d \
  --name kener-status \
  -p 3000:3000 \
  -v "$(pwd)/database:/app/database" \
  -e "KENER_SECRET_KEY=replace_with_a_random_string" \
  -e "ORIGIN=https://example.com" \
  -e "KENER_BASE_PATH=/status" \
  -e "REDIS_URL=redis://host.docker.internal:6379" \
  docker.io/rajnandan1/kener:latest-status
```

## Run with Docker Compose {#run-compose}

Use the provided `docker-compose.status.yml` file:

```bash
docker compose -f docker-compose.status.yml up -d
```

This compose file already sets:

- `image: rajnandan1/kener:latest-status`
- `KENER_BASE_PATH: /status`

## Reverse proxy mapping {#reverse-proxy-mapping}

Your proxy path and `KENER_BASE_PATH` must match exactly.

For `/status`, proxy traffic to Kener on the same `/status` path.

For full examples, see [Reverse Proxy Setup](/docs/v4/guides/reverse-proxy).

## Verify setup {#verify-setup}

Check these URLs:

- `https://example.com/status`
- `https://example.com/status/healthcheck`

If CSS/JS files 404, re-check:

1. `KENER_BASE_PATH` is set to `/status`
2. proxy path is also `/status`
3. Kener was rebuilt/restarted after env changes

## Related docs {#related-docs}

- [Environment Variables](/docs/v4/setup/environment-variables)
- [Reverse Proxy Setup](/docs/v4/guides/reverse-proxy)
