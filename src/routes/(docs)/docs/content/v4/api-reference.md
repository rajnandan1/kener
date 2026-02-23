---
title: API Reference
description: Complete REST API documentation for monitors, incidents, and status endpoints
---

Kener provides a comprehensive REST API for managing monitors, incidents, and retrieving status information.

## Base URL

```
https://your-kener-instance.com/api
```

## Authentication

All API requests require authentication using a Bearer token:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://your-kener.com/api/monitors
```

### Generating API Keys

1. Log in to the admin panel
2. Navigate to Settings > API Keys
3. Click "Generate New Key"
4. Set permissions and save
5. Copy the key (shown only once)

## Response Format

All responses are JSON:

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Responses

```json
{
    "success": false,
    "error": {
        "code": "INVALID_REQUEST",
        "message": "Description of the error"
    }
}
```

## Rate Limiting

- **Default limit**: 100 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

## Endpoints Overview

| Method | Endpoint        | Description         |
| ------ | --------------- | ------------------- |
| GET    | `/monitors`     | List all monitors   |
| POST   | `/monitors`     | Create a monitor    |
| GET    | `/monitors/:id` | Get monitor details |
| PUT    | `/monitors/:id` | Update a monitor    |
| DELETE | `/monitors/:id` | Delete a monitor    |
| GET    | `/incidents`    | List incidents      |
| POST   | `/incidents`    | Create incident     |
| GET    | `/status`       | Get current status  |

## Quick Examples

### Get All Monitors

```bash
curl -X GET https://your-kener.com/api/monitors \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Create an Incident

```bash
curl -X POST https://your-kener.com/api/incidents \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Service Disruption",
    "status": "investigating",
    "impact": "major",
    "message": "We are investigating reports of service issues."
  }'
```

### Get Current Status

```bash
curl -X GET https://your-kener.com/api/status
```

## SDKs and Libraries

Community-maintained SDKs:

- **JavaScript/Node.js**: `npm install kener-sdk`
- **Python**: `pip install kener-python`
- **Go**: `go get github.com/kener/go-sdk`

## Webhooks

Receive real-time notifications for events:

```json
{
    "event": "monitor.down",
    "timestamp": "2024-01-15T10:30:00Z",
    "data": {
        "monitor_id": "abc123",
        "name": "API Server",
        "status": "down"
    }
}
```

See [Authentication](/docs/api-reference/authentication) for detailed auth docs, or [Monitors API](/docs/api-reference/monitors) for monitor endpoints.
