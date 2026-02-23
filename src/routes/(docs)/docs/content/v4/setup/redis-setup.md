---
title: Redis Setup
description: Configure Redis for queues, caching, and scheduling in Kener
---

Redis is **required**. Kener will not start without `REDIS_URL`.

## Quick configuration {#quick-configuration}

Add this to `.env`:

```env
REDIS_URL=redis://localhost:6379
```

Use `rediss://` when your provider requires TLS.

## Minimum server sizing (CPU/RAM) {#minimum-server-sizing}

> [!NOTE]
> Based on practical Kener v4 deployments (app + Redis + relational DB). If monitor count and alert volume grow, scale up.

### Redis service sizing {#redis-service-sizing}

| Workload    | vCPU           | RAM    |
| ----------- | -------------- | ------ |
| Minimum     | shared / 0.25+ | 128MB  |
| Recommended | 0.5+           | 256MB  |
| Higher load | 1+             | 512MB+ |

### Kener app sizing impact (with Redis enabled) {#app-sizing-impact}

| Workload    | vCPU | RAM   |
| ----------- | ---- | ----- |
| Minimum     | 1    | 512MB |
| Recommended | 1    | 1GB   |
| Higher load | 2+   | 2GB+  |

## Connection formats {#connection-formats}

```text
redis://[username:password@]host[:port][/database]
rediss://[username:password@]host[:port][/database]
```

Examples:

```env
REDIS_URL=redis://localhost:6379
REDIS_URL=redis://:password@localhost:6379
REDIS_URL=rediss://default:password@your-endpoint:6379
```

## Requirements {#requirements}

- Redis **6.0+** (7.0+ recommended)
- Standard read/write commands enabled
- Network access from Kener to Redis host/port

## Verify connection {#verify-connection}

```bash
redis-cli -u $REDIS_URL ping
```

Expected response: `PONG`

## Troubleshooting {#troubleshooting}

- `REDIS_URL is not defined`: add `REDIS_URL` to `.env` and restart.
- `NOAUTH Authentication required`: include password in the URL.
- Connection timeout: verify host/port/firewall and Redis service status.
- `READONLY`: connect to primary/writer instance, not a read replica.

## Environment variables {#environment-variables}

| Variable    | Description             | Default | Required |
| ----------- | ----------------------- | ------- | -------- |
| `REDIS_URL` | Redis connection string | None    | **Yes**  |

## Free Redis SaaS options (indie-friendly) {#free-redis-saas-options}

If you want a managed Redis/Valkey service without running your own server:

| Provider                                                 | Free option                           | Best for                           | Quick notes                                             |
| -------------------------------------------------------- | ------------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| [Railway Redis](https://railway.com/new/template/redis)  | Free usage via Railway trial credits  | Fast demos and MVPs                | Very easy setup; credit-based (not permanent free tier) |
| [Upstash](https://upstash.com/)                          | Free tier (serverless, request-based) | Side projects and low-traffic apps | Great DX; works well for serverless/edge                |
| [Aiven for Valkey](https://aiven.io/free-redis-database) | Free managed Valkey plan              | Persistent dev/test environments   | Redis-compatible Valkey; simple managed setup           |

> [!NOTE]
> Free limits and pricing change over time. Check each provider’s current limits before production use.
