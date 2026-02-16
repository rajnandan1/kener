---
title: Authentication
description: Learn how to authenticate with the Kener API using API keys and Bearer tokens
---

Learn how to authenticate with the Kener API.

## API Keys

API keys are the primary method of authentication for the Kener API.

### Creating an API Key

1. Log in to the admin panel at `/manage`
2. Navigate to **Settings** > **API Keys**
3. Click **Generate New Key**
4. Configure the key:
    - **Name**: A descriptive name
    - **Permissions**: Select allowed operations
    - **Expiry**: Optional expiration date
5. Click **Create**
6. **Copy the key immediately** - it won't be shown again

### Using API Keys

Include the API key in the `Authorization` header:

```bash
curl -X GET https://your-kener.com/api/monitors \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Key Permissions

| Permission        | Description                    |
| ----------------- | ------------------------------ |
| `read:monitors`   | View monitors and their status |
| `write:monitors`  | Create and update monitors     |
| `delete:monitors` | Delete monitors                |
| `read:incidents`  | View incidents                 |
| `write:incidents` | Create and update incidents    |
| `admin`           | Full access to all endpoints   |

## Security Best Practices

### Store Keys Securely

```bash
# Don't hardcode keys
export KENER_API_KEY="your-api-key"

# Use in scripts
curl -H "Authorization: Bearer $KENER_API_KEY" ...
```

### Use Environment Variables

```javascript
// Node.js
const apiKey = process.env.KENER_API_KEY
```

```python
# Python
import os
api_key = os.environ.get('KENER_API_KEY')
```

### Rotate Keys Regularly

- Create new keys periodically
- Revoke unused or compromised keys
- Use different keys for different applications

### Use Minimal Permissions

Only grant the permissions each key actually needs:

```json
{
    "name": "monitoring-service",
    "permissions": ["read:monitors", "write:incidents"]
}
```

## Error Codes

| Code           | HTTP Status | Description                    |
| -------------- | ----------- | ------------------------------ |
| `UNAUTHORIZED` | 401         | Missing or invalid API key     |
| `FORBIDDEN`    | 403         | Key lacks required permissions |
| `KEY_EXPIRED`  | 401         | API key has expired            |
| `KEY_REVOKED`  | 401         | API key has been revoked       |

### Error Response Example

```json
{
    "success": false,
    "error": {
        "code": "UNAUTHORIZED",
        "message": "Invalid API key provided"
    }
}
```

## Rate Limiting

API keys are subject to rate limiting:

- **Default**: 100 requests per minute
- **Headers**:
    - `X-RateLimit-Limit`: Maximum requests allowed
    - `X-RateLimit-Remaining`: Requests remaining
    - `X-RateLimit-Reset`: Unix timestamp when limit resets

```bash
# Example headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
```

## Revoking Keys

If a key is compromised:

1. Go to **Settings** > **API Keys**
2. Find the key in the list
3. Click **Revoke**
4. Generate a new key if needed

## Testing Authentication

Verify your API key works:

```bash
curl -X GET https://your-kener.com/api/me \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response:

```json
{
    "success": true,
    "data": {
        "key_name": "my-api-key",
        "permissions": ["read:monitors", "write:incidents"],
        "created_at": "2024-01-01T00:00:00Z"
    }
}
```
