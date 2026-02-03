---
title: Configuration
description: Configure Kener with environment variables, database settings, and customization options
---

Configure Kener to match your needs with environment variables and settings.

## Environment Variables

### Required Variables

```env
# Secret key for JWT tokens (generate a random string)
KENER_SECRET_KEY=your-super-secret-key-here

# Your site URL (no trailing slash)
ORIGIN=https://status.yourdomain.com
```

### Database Configuration

```env
# SQLite (default)
DATABASE_URL=sqlite://./database/kener.db

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/kener

# MySQL
DATABASE_URL=mysql://user:password@localhost:3306/kener
```

### Optional Variables

```env
# Base path for reverse proxy setups
KENER_BASE_PATH=/status

# Email configuration (Resend)
RESEND_API_KEY=re_123456789
RESEND_SENDER_EMAIL=noreply@yourdomain.com

# Port (default: 3000)
PORT=3000
```

## Site Settings

Configure your status page appearance in the admin panel:

### General Settings

| Setting          | Description              |
| ---------------- | ------------------------ |
| Site Name        | Your status page name    |
| Site Description | Meta description for SEO |
| Logo             | Custom logo image        |
| Favicon          | Browser tab icon         |

### Theme Settings

```javascript
{
  "theme": {
    "primary": "#3B82F6",
    "background": "#FFFFFF",
    "text": "#1F2937"
  }
}
```

### Localization

Kener supports multiple languages:

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- And more...

Set the default language:

```env
DEFAULT_LOCALE=en
```

## Monitor Defaults

Configure default settings for new monitors:

```json
{
    "defaultInterval": 60,
    "defaultTimeout": 10000,
    "defaultRetries": 3
}
```

## Notification Settings

### Email Notifications

```env
RESEND_API_KEY=your-api-key
RESEND_SENDER_EMAIL=status@yourdomain.com
```

### Webhook Notifications

Configure webhooks in the admin panel:

```json
{
    "url": "https://your-webhook.com/endpoint",
    "events": ["incident.created", "monitor.down"],
    "secret": "webhook-secret"
}
```

## Security Settings

### API Keys

Generate API keys for integrations:

1. Go to Settings > API Keys
2. Click "Generate New Key"
3. Set permissions and expiry
4. Copy and securely store the key

### Authentication

```env
# Session duration (in seconds)
SESSION_DURATION=86400

# Enable 2FA requirement
REQUIRE_2FA=true
```

## Performance Tuning

### Cron Settings

Adjust monitor check frequency:

```env
# Minimum interval between checks (seconds)
MIN_CHECK_INTERVAL=30

# Maximum concurrent checks
MAX_CONCURRENT_CHECKS=10
```

### Database Optimization

For high-traffic sites:

```env
# Connection pool size
DB_POOL_SIZE=10

# Query timeout (ms)
DB_TIMEOUT=5000
```

## Reverse Proxy

### Nginx Example

```nginx
server {
    listen 80;
    server_name status.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy Example

```caddyfile
status.yourdomain.com {
    reverse_proxy localhost:3000
}
```

## Next Steps

- Set up [Monitors](/docs/monitors)
- Configure [Incidents](/docs/incidents)
- Explore the [API Reference](/docs/api-reference)
