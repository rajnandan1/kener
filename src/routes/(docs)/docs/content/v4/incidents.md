---
title: Incidents
description: Learn how to create, manage, and communicate service incidents to your users
---

Incidents allow you to communicate service disruptions and updates to your users.

## Understanding Incidents

An incident represents any event that affects your service availability:

- Service outages
- Performance degradation
- Partial system failures
- Security incidents

## Incident Lifecycle

### 1. Investigating

Initial state when an issue is detected:

```
Status: Investigating
Impact: Minor/Major/Critical
```

### 2. Identified

Root cause has been found:

```
Status: Identified
Update: "The issue is caused by database connection limits"
```

### 3. Monitoring

Fix deployed, monitoring for stability:

```
Status: Monitoring
Update: "Fix deployed, monitoring system stability"
```

### 4. Resolved

Issue fully resolved:

```
Status: Resolved
Update: "All systems operational"
```

## Creating an Incident

### Via Admin Panel

1. Go to `/manage/incidents`
2. Click "Create Incident"
3. Fill in the details:
    - **Title** - Brief description
    - **Status** - Current state
    - **Impact** - Severity level
    - **Affected Monitors** - Which services
    - **Message** - Detailed update
4. Click "Create"

### Via API

```bash
curl -X POST https://your-kener.com/api/incidents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Latency Issues",
    "status": "investigating",
    "impact": "minor",
    "message": "We are investigating increased API response times."
  }'
```

## Updating Incidents

Keep your users informed with regular updates:

```bash
curl -X POST https://your-kener.com/api/incidents/123/updates \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "identified",
    "message": "Root cause identified. Working on a fix."
  }'
```

## Impact Levels

| Level        | Description        | Example               |
| ------------ | ------------------ | --------------------- |
| **None**     | Informational      | Planned maintenance   |
| **Minor**    | Slight degradation | Slow response times   |
| **Major**    | Significant impact | Feature unavailable   |
| **Critical** | Full outage        | Complete service down |

## Scheduled Maintenance

Plan maintenance windows in advance:

1. Create a maintenance window
2. Set start and end times
3. Select affected monitors
4. Add description
5. Users see upcoming maintenance

```json
{
    "title": "Database Maintenance",
    "scheduledStart": "2024-01-15T02:00:00Z",
    "scheduledEnd": "2024-01-15T04:00:00Z",
    "impact": "minor",
    "message": "Scheduled database maintenance. Expect brief interruptions."
}
```

## Best Practices

### Communication

- **Be transparent** - Share what you know
- **Update frequently** - Even if no change
- **Use plain language** - Avoid jargon
- **Set expectations** - Provide ETAs when possible

### Response

- **Acknowledge quickly** - Show you're aware
- **Escalate appropriately** - Know when to involve others
- **Document everything** - For post-mortems
- **Follow up** - Post-incident review

## Notifications

Configure how users are notified:

- **Email** - Automatic email updates
- **Webhooks** - Integrate with your tools
- **RSS Feed** - Subscribe to updates
- **API** - Build custom integrations
