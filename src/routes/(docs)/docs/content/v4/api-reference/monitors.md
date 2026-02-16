---
title: Monitors API
description: Create, read, update, and delete monitors via the REST API
---

Create, read, update, and delete monitors via the API.

## List Monitors

Get all monitors with their current status.

```http
GET /api/monitors
```

### Parameters

| Parameter | Type    | Description                          |
| --------- | ------- | ------------------------------------ |
| `page`    | integer | Page number (default: 1)             |
| `limit`   | integer | Items per page (default: 20)         |
| `status`  | string  | Filter by status: up, down, degraded |
| `type`    | string  | Filter by type: API, PING, TCP, etc. |

### Example Request

```bash
curl -X GET "https://your-kener.com/api/monitors?status=up&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Example Response

```json
{
    "success": true,
    "data": {
        "monitors": [
            {
                "id": "mon_abc123",
                "name": "API Server",
                "type": "API",
                "url": "https://api.example.com/health",
                "status": "up",
                "uptime": 99.95,
                "lastChecked": "2024-01-15T10:30:00Z"
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 10,
            "total": 25
        }
    }
}
```

## Get Monitor

Get details for a specific monitor.

```http
GET /api/monitors/:id
```

### Example Request

```bash
curl -X GET https://your-kener.com/api/monitors/mon_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Example Response

```json
{
    "success": true,
    "data": {
        "id": "mon_abc123",
        "name": "API Server",
        "type": "API",
        "url": "https://api.example.com/health",
        "method": "GET",
        "expectedStatusCode": 200,
        "interval": 60,
        "timeout": 10000,
        "status": "up",
        "uptime": {
            "day": 100,
            "week": 99.95,
            "month": 99.87
        },
        "responseTime": {
            "current": 145,
            "average": 152
        },
        "lastChecked": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
    }
}
```

## Create Monitor

Create a new monitor.

```http
POST /api/monitors
```

### Request Body

```json
{
    "name": "Production API",
    "type": "API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "expectedStatusCode": 200,
    "interval": 60,
    "timeout": 10000,
    "headers": {
        "Authorization": "Bearer token"
    }
}
```

### Monitor Types

#### API Monitor

```json
{
    "name": "API Health",
    "type": "API",
    "url": "https://api.example.com",
    "method": "GET",
    "expectedStatusCode": 200,
    "headers": {},
    "body": null
}
```

#### Ping Monitor

```json
{
    "name": "Server Ping",
    "type": "PING",
    "host": "server.example.com"
}
```

#### TCP Monitor

```json
{
    "name": "Database Port",
    "type": "TCP",
    "host": "db.example.com",
    "port": 5432
}
```

#### DNS Monitor

```json
{
    "name": "DNS Check",
    "type": "DNS",
    "host": "example.com",
    "recordType": "A"
}
```

### Example Request

```bash
curl -X POST https://your-kener.com/api/monitors \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API",
    "type": "API",
    "url": "https://api.example.com/health",
    "interval": 60
  }'
```

### Example Response

```json
{
    "success": true,
    "data": {
        "id": "mon_xyz789",
        "name": "Production API",
        "type": "API",
        "status": "pending",
        "createdAt": "2024-01-15T10:30:00Z"
    },
    "message": "Monitor created successfully"
}
```

## Update Monitor

Update an existing monitor.

```http
PUT /api/monitors/:id
```

### Example Request

```bash
curl -X PUT https://your-kener.com/api/monitors/mon_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated API Name",
    "interval": 120
  }'
```

## Delete Monitor

Delete a monitor.

```http
DELETE /api/monitors/:id
```

### Example Request

```bash
curl -X DELETE https://your-kener.com/api/monitors/mon_abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Monitor History

Get historical data for a monitor.

```http
GET /api/monitors/:id/history
```

### Parameters

| Parameter    | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| `start`      | string | Start date (ISO 8601)              |
| `end`        | string | End date (ISO 8601)                |
| `resolution` | string | Data resolution: minute, hour, day |

### Example Request

```bash
curl -X GET "https://your-kener.com/api/monitors/mon_abc123/history?resolution=hour" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Pause/Resume Monitor

```http
POST /api/monitors/:id/pause
POST /api/monitors/:id/resume
```

### Example

```bash
# Pause
curl -X POST https://your-kener.com/api/monitors/mon_abc123/pause \
  -H "Authorization: Bearer YOUR_API_KEY"

# Resume
curl -X POST https://your-kener.com/api/monitors/mon_abc123/resume \
  -H "Authorization: Bearer YOUR_API_KEY"
```
