---
title: Monitors
description: Learn about API, Ping, TCP, DNS, and SSL monitors for tracking service health
---

Monitors are the core of Kener. They continuously check the health of your services and track their availability.

## Monitor Types

Kener supports multiple monitor types for different use cases:

### API Monitor

Check HTTP/HTTPS endpoints for availability and response codes.

```json
{
    "type": "API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "expectedStatusCode": 200,
    "timeout": 10000
}
```

**Options:**

- `url` - The endpoint to check
- `method` - HTTP method (GET, POST, PUT, etc.)
- `expectedStatusCode` - Expected response code
- `headers` - Custom headers to send
- `body` - Request body for POST/PUT requests

### Ping Monitor {#ping-monitor}

Simple ICMP ping to verify server availability.

```json
{
    "type": "PING",
    "host": "server.example.com"
}
```

### TCP Monitor

Check if a specific port is open and responding.

```json
{
    "type": "TCP",
    "host": "server.example.com",
    "port": 443
}
```

### DNS Monitor

Verify DNS records are resolving correctly.

```json
{
    "type": "DNS",
    "host": "example.com",
    "recordType": "A"
}
```

### SSL Monitor

Track SSL certificate expiration and validity.

```json
{
    "type": "SSL",
    "host": "example.com",
    "port": 443
}
```

## Creating a Monitor

### Via Admin Panel

1. Navigate to `/manage/monitors`
2. Click "Add Monitor"
3. Fill in the monitor details
4. Save and activate

### Via API

```bash
curl -X POST https://your-kener.com/api/monitors \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Health Check",
    "type": "API",
    "url": "https://api.example.com/health",
    "interval": 60
  }'
```

## Monitor Status

Monitors can have the following statuses:

| Status          | Description                          |
| --------------- | ------------------------------------ |
| **UP**          | Service is operational               |
| **DOWN**        | Service is not responding            |
| **DEGRADED**    | Service is slow or partially working |
| **MAINTENANCE** | Scheduled maintenance in progress    |

## Metric Display {#metric-display}

Every check records a numeric value alongside its status (response time, queue depth, price, etc.), stored as `latency`. By default it's shown as latency in milliseconds; **Metric Display** settings relabel and reformat that number per monitor without changing how it's collected.

Open an existing monitor in `/manage/monitors` and expand the **Metric Display** section (available once the monitor is saved). All three settings are optional and saved together as `value_display` in the monitor's settings.

| Setting      | Values                          | Default      | Effect                                                                                                                                                                |
| ------------ | ------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display name | text, up to 64 chars            | `Latency`    | Replaces "Latency" in the trend header, metric toggle, stat captions, and day-detail tab, e.g. "Queue length"                                                         |
| Unit         | text, up to 32 chars, or `none` | `ms`         | Suffix shown after the number — see below                                                                                                                             |
| Decimals     | integer `0`–`4`, or empty       | empty (auto) | Fixed decimal places; empty rounds to up to 2 decimals and trims trailing zeros. Applies to custom units only — `ms` readings always use the auto-scaled format below |

### `ms` vs. custom units {#ms-vs-custom}

Leaving Unit empty (or set to `ms`) keeps the legacy latency behavior everywhere — status page, badges, embeds, admin tables:

- Values auto-scale: `<1000` → `Nms`, `<60000` → `N.NNs`, `<3600000` → `N.NNm`, otherwise `N.NNh`.
- A reading of `0` is treated as **no data** and hidden (chart gaps, blank cells), since `0` never happens for a real response time.

Any other unit switches to plain-number formatting:

- No auto-scaling — the raw stored number is shown with the configured Decimals.
- `0` is a **valid reading** and is charted/displayed like any other value. Failed checks that record no reading are excluded from stats as no data, at both the per-minute and day level.
- The literal input `none` (case-insensitive) clears the suffix entirely (bare number).
- `%` and an empty unit join the number with no space (`97.3%`); every other unit gets a space (`42 items`).

> [!NOTE]
> Raw readings are stored in a `float(8,2)` column. On MySQL this keeps at most 2 decimal places regardless of the Decimals setting — keep Decimals at 2 or fewer if you need exact fractional values.

### Example: queue length {#example-queue-length}

Set Display name to `Queue length`, Unit to `items`, Decimals to `0`, then feed values through either path — both write the same `latency` field:

**[API monitor](/docs/v4/monitors/api) eval:**

```javascript
async function (statusCode, responseTime, responseRaw) {
    const { queueLength } = JSON.parse(responseRaw)
    return { status: queueLength < 100 ? "UP" : "DEGRADED", latency: queueLength }
}
```

**Push via the v4 data API:**

```bash
curl -X PATCH https://your-kener.com/api/v4/monitors/queue-worker/data \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "start_ts": 1700000000,
    "end_ts": 1700000060,
    "status": "UP",
    "latency": 42
  }'
```

Result: charts, tooltips, and stats show `42 items`, and a pushed `0` renders and charts normally instead of being hidden as no data.

## Check Intervals

Configure how often monitors run:

- **1 minute** - Critical services
- **5 minutes** - Standard monitoring
- **15 minutes** - Less critical services

## Alerting

Set up alerts for monitor status changes:

1. Go to monitor settings
2. Configure alert thresholds
3. Add notification channels
4. Save settings

## Best Practices

1. **Start simple** - Begin with basic health endpoints
2. **Use appropriate intervals** - Don't over-monitor
3. **Set meaningful names** - Make them descriptive
4. **Group related monitors** - Organize by service
5. **Test your alerts** - Verify notifications work
