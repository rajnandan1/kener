---
title: Monitors
description: Pick a monitor type and create monitors from the admin panel or the API
---

Monitors are the core of Kener. They continuously check the health of your services and track their availability.

## Monitor Types {#monitor-types}

Each monitor type has its own page with its `type_data` options and an example. See the list in [Monitors Overview](/docs/v4/monitors/overview#monitor-types).

## Creating a Monitor {#creating-a-monitor}

### Via Admin Panel {#via-admin-panel}

1. Navigate to `/manage/app/monitors`
2. Click "New Monitor"
3. Fill in the monitor details
4. Save and activate

### Via API {#via-api}

Send the type in `monitor_type` and its settings in `type_data`. The `cron` expression sets how often the check runs.

```bash
curl -X POST https://your-kener.com/api/v4/monitors \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tag": "api-health",
    "name": "API Health Check",
    "monitor_type": "API",
    "cron": "* * * * *",
    "type_data": {
      "url": "https://api.example.com/health",
      "method": "GET",
      "timeout": 10000
    }
  }'
```

See the [API Reference](/docs/spec/v4/) for every field.

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
