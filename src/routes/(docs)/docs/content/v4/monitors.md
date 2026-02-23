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
