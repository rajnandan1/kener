---
title: Redis Setup
description: Configure Redis for queues, caching, and scheduling in Kener
---

Redis is a **required component** for Kener, providing background job processing, caching, and distributed scheduling capabilities. Redis powers Kener's core infrastructure for queues, caching, and scheduling.

## What Redis Does {#what-redis-does}

Redis powers three critical systems in Kener:

### 1. Queue System {#queue-system}

Uses [BullMQ](https://docs.bullmq.io/) to process background jobs:

- **Monitor execution queue** - Runs monitor checks
- **Monitor response queue** - Processes monitoring results
- **Alerting queue** - Handles alert notifications
- **Subscriber queue** - Manages subscription triggers
- **Email queue** - Sends email notifications

### 2. Caching Layer {#caching-layer}

Caches frequently accessed data to reduce database load:

- Site configuration data
- Monitor metadata
- Documentation search index
- API responses

### 3. Scheduler {#scheduler}

Manages distributed cron-based monitoring:

- **Monitor schedulers** - Execute monitors based on cron expressions
- **App scheduler** - Handles recurring application tasks
- **Maintenance scheduler** - Manages maintenance windows

> **Important:** Redis is required for Kener to function. Without Redis, the application will not start.

## Configuration {#configuration}

Redis is configured using a single environment variable: `REDIS_URL`.

### Environment Variable {#environment-variable}

```env
REDIS_URL=redis://localhost:6379
```

### Connection String Format {#connection-string-format}

#### Standard Redis {#standard-redis}

```
redis://[username:password@]host[:port][/database]
```

#### Redis with TLS {#redis-tls}

```
rediss://[username:password@]host[:port][/database]
```

The extra `s` in `rediss://` enables TLS/SSL encryption.

## Setup Examples {#setup-examples}

### Local Redis {#local-redis}

**Basic connection:**

```env
REDIS_URL=redis://localhost:6379
```

**With authentication:**

```env
REDIS_URL=redis://:your-password@localhost:6379
```

**Specific database:**

```env
REDIS_URL=redis://localhost:6379/2
```

### Docker Redis {#docker-redis}

**Docker Compose with Redis:**

```yaml
version: "3.8"
services:
    kener:
        image: rajnandan1/kener
        environment:
            - REDIS_URL=redis://redis:6379
        depends_on:
            - redis

    redis:
        image: redis:7-alpine
        command: redis-server --appendonly yes
        volumes:
            - redis_data:/data

volumes:
    redis_data:
```

### Cloud Redis Services {#cloud-redis}

#### Upstash Redis {#upstash}

```env
REDIS_URL=rediss://default:your-password@your-endpoint.upstash.io:6379
```

#### Redis Cloud {#redis-cloud}

```env
REDIS_URL=rediss://default:your-password@redis-12345.cloud.redislabs.com:12345
```

#### AWS ElastiCache {#elasticache}

```env
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
```

#### Azure Cache for Redis {#azure-redis}

```env
REDIS_URL=rediss://:your-password@your-cache.redis.cache.windows.net:6380
```

#### Railway Redis {#railway-redis}

Railway automatically provides `REDIS_URL` when you add a Redis service. Use the provided URL directly.

#### Render Redis {#render-redis}

```env
REDIS_URL=redis://red-xxxxx:6379
```

## Minimum Requirements {#minimum-requirements}

### Redis Version {#redis-version}

- **Minimum**: Redis 6.0+
- **Recommended**: Redis 7.0+

### Memory {#memory}

- **Small deployments** (< 50 monitors): 128 MB
- **Medium deployments** (50-200 monitors): 256 MB
- **Large deployments** (200+ monitors): 512 MB+

### Commands Required {#commands-required}

Kener requires these Redis commands to be available:

- `GET`, `SET`, `DEL` - Basic operations
- `EXPIRE`, `TTL` - For cache expiration
- `LPUSH`, `RPOP`, `BRPOP` - For queue operations
- `ZADD`, `ZRANGE`, `ZREM` - For scheduled jobs

> Most Redis services support all these commands by default. However, some managed services (like AWS ElastiCache with cluster mode) may have restrictions.

## Installation Options {#installation-options}

### Option 1: Local Redis (Development) {#local-installation}

**macOS (Homebrew):**

```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Docker:**

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### Option 2: Cloud Services (Production) {#cloud-installation}

For production, use managed Redis services:

- **Upstash** - Serverless Redis, generous free tier
- **Redis Cloud** - Official managed Redis
- **AWS ElastiCache** - AWS managed Redis
- **Azure Cache** - Azure managed Redis
- **Railway** - Simplified deployment platform

## Queue Configuration {#queue-configuration}

Kener automatically creates these queues in Redis:

| Queue Name                  | Purpose                    | Concurrency  |
| --------------------------- | -------------------------- | ------------ |
| `monitorExecuteQueue`       | Execute monitor checks     | 5            |
| `monitorResponseQueue`      | Process monitor results    | 5            |
| `alertingQueue`             | Send alerts                | 5            |
| `subscriberQueue`           | Process subscriptions      | 5            |
| `emailQueue`                | Send individual emails     | 5            |
| `monitorScheduleQueue`      | Schedule monitor execution | Configurable |
| `appSchedulerQueue`         | Application-level tasks    | 1            |
| `maintenanceSchedulerQueue` | Maintenance windows        | 1            |

All queues use the prefix `kener:` in Redis keys.

### Queue Features {#queue-features}

- **Automatic retry**: Failed jobs retry up to 3 times with exponential backoff
- **Job cleanup**: Completed jobs are automatically removed
- **Persistence**: Failed jobs are kept for debugging
- **Concurrency**: Multiple workers process jobs in parallel

## Cache Configuration {#cache-configuration}

Kener uses Redis for caching with these defaults:

- **Key prefix**: `kener:cache:`
- **Default TTL**: 300 seconds (5 minutes)
- **Storage format**: JSON

### Cached Data {#cached-data}

- Site configuration and settings
- Monitor metadata and status
- Documentation search index
- API response data

## Monitoring Redis {#monitoring-redis}

### Check Redis Connection {#check-connection}

Use the Redis CLI to verify connectivity:

```bash
redis-cli -u $REDIS_URL ping
```

Expected response: `PONG`

### View Queue Status {#view-queue-status}

Check active queues:

```bash
redis-cli -u $REDIS_URL --scan --pattern "kener:*"
```

### Monitor Memory Usage {#monitor-memory}

```bash
redis-cli -u $REDIS_URL INFO memory
```

## Troubleshooting {#troubleshooting}

### Connection Failed {#connection-failed}

**Error:** `REDIS_URL is not defined in environment variables`

**Solution:**

1. Verify `REDIS_URL` is set in `.env` file
2. Ensure connection string format is correct
3. Restart Kener after adding the variable

### Authentication Failed {#authentication-failed}

**Error:** `NOAUTH Authentication required`

**Solution:**
Include password in connection string:

```env
REDIS_URL=redis://:your-password@host:6379
```

### TLS/SSL Issues {#tls-issues}

**Error:** `Error: self signed certificate`

**Solution:**

1. Use `rediss://` protocol for TLS connections
2. Verify your Redis service requires/supports TLS
3. For self-signed certificates, you may need to configure Node.js to accept them (not recommended for production)

### Connection Timeout {#connection-timeout}

**Error:** `Connection timeout`

**Solution:**

1. Verify Redis server is running
2. Check firewall rules allow connection
3. Ensure host and port are correct
4. Test connection with `redis-cli`

### Too Many Connections {#too-many-connections}

**Error:** `ERR max number of clients reached`

**Solution:**

1. Increase Redis `maxclients` setting
2. Review connection pooling
3. Check for connection leaks in application logs

### Commands Not Allowed {#commands-not-allowed}

**Error:** `READONLY You can't write against a read only replica`

**Solution:**
Ensure you're connecting to the master/primary Redis instance, not a read replica.

## Performance Optimization {#performance-optimization}

### For Small Deployments {#small-optimization}

```env
# Standard Redis with minimal config
REDIS_URL=redis://localhost:6379
```

### For Large Deployments {#large-optimization}

**Consider:**

1. **Redis Cluster** for horizontal scaling
2. **Persistent storage** with AOF or RDB snapshots
3. **Connection pooling** (handled automatically by ioredis)
4. **Monitoring** with Redis insights or external tools

### Memory Management {#memory-management}

Kener automatically manages Redis memory with:

- **TTL on cache keys** (5 minutes default)
- **Job cleanup** (completed jobs removed automatically)
- **Efficient serialization** (JSON format)

For manual cleanup:

```bash
# Clear all Kener cache
redis-cli -u $REDIS_URL --scan --pattern "kener:cache:*" | xargs redis-cli -u $REDIS_URL DEL

# Clear specific queue
redis-cli -u $REDIS_URL --scan --pattern "kener:monitorExecuteQueue:*" | xargs redis-cli -u $REDIS_URL DEL
```

## Security Best Practices {#security-best-practices}

1. **Use authentication**: Always set a password on Redis
2. **Enable TLS**: Use `rediss://` for encrypted connections
3. **Restrict access**: Configure firewall to allow only Kener server
4. **Regular backups**: Enable Redis persistence (AOF/RDB)
5. **Monitor access**: Review Redis logs for suspicious activity
6. **Update regularly**: Keep Redis version up to date

## Environment Variables Summary {#environment-variables}

| Variable    | Description             | Default | Required |
| ----------- | ----------------------- | ------- | -------- |
| `REDIS_URL` | Redis connection string | None    | **Yes**  |

## Migration Guide {#migration-guide}

### Changing Redis Instances {#changing-instances}

1. **Stop Kener**
2. **Update `REDIS_URL`** in `.env` file
3. **Start Kener** with new Redis instance

> **Note:** Active jobs and cached data will be lost during the switch. Schedule the change during low-activity periods.

## Production Checklist {#production-checklist}

- [ ] Redis 7.0+ installed
- [ ] Password authentication enabled
- [ ] TLS/SSL configured (for cloud deployments)
- [ ] Firewall rules configured
- [ ] Persistence enabled (AOF or RDB)
- [ ] Memory limits set appropriately
- [ ] Monitoring/alerting configured
- [ ] Backup strategy in place
- [ ] `REDIS_URL` added to environment variables
- [ ] Connection tested and verified
