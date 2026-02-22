---
title: Reverse Proxy Setup
description: Configure Nginx, Apache, Caddy, or Traefik as a reverse proxy for Kener with SSL, subpath routing, and load balancing
---

Running Kener behind a reverse proxy is the recommended approach for production deployments. A reverse proxy handles SSL/TLS termination, load balancing, caching, and provides additional security layers.

## Why Use a Reverse Proxy {#why-use-reverse-proxy}

**Benefits**:

- **SSL/TLS Termination**: Handle HTTPS at the proxy level
- **Port Mapping**: External 80/443 → Internal 3000
- **Multiple Services**: Run multiple apps on one server
- **Load Balancing**: Distribute traffic across multiple Kener instances
- **Caching**: Cache static assets for better performance
- **Security**: Hide internal architecture, add rate limiting, block malicious requests
- **Logging**: Centralized access logs

## Before You Begin {#before-you-begin}

### Prerequisites {#prerequisites}

- Kener running on port 3000 (or custom port)
- Reverse proxy software installed (Nginx, Apache, Caddy, or Traefik)
- Domain name pointing to your server
- SSL certificate (Let's Encrypt recommended)

### Environment Variables {#environment-variables}

Set these in your `.env` file:

```bash
# If using a subpath, set base path
KENER_BASE_PATH=/status  # Optional, only if serving from subpath

# Port Kener listens on (internal)
PORT=3000
```

## Nginx Configuration {#nginx}

Nginx is one of the most popular reverse proxies for Node.js applications.

### Basic Configuration (Root Domain) {#nginx-basic}

Serve Kener at `https://status.example.com/`:

```nginx
server {
    listen 80;
    server_name status.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name status.example.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/status.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/status.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy to Kener
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # WebSocket support (if needed in future)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Disable caching for dynamic content
        proxy_cache_bypass $http_upgrade;
    }

    # Optional: Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

### Subpath Configuration {#nginx-subpath}

Serve Kener at `https://example.com/status/`:

**Environment Variable**:

```bash
KENER_BASE_PATH=/status
```

**Nginx Config**:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL configuration (same as above)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Kener at /status
    location /status/ {
        proxy_pass http://localhost:3000/status/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /status;

        proxy_redirect off;
    }

    # Other services
    location / {
        # Your main site
    }
}
```

> [!WARNING]
> When using subpaths, ensure both `KENER_BASE_PATH` and the nginx `location` directive include the trailing slash consistently.

### Load Balancing (Multiple Instances) {#nginx-load-balancing}

Run multiple Kener instances for high availability:

```nginx
upstream kener_backend {
    least_conn;  # Use least-connection algorithm
    server localhost:3000 max_fails=3 fail_timeout=30s;
    server localhost:3001 max_fails=3 fail_timeout=30s;
    server localhost:3002 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name status.example.com;

    # SSL config...

    location / {
        proxy_pass http://kener_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Testing Nginx Configuration {#nginx-testing}

```bash
# Test configuration syntax
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Check logs if issues occur
sudo tail -f /var/log/nginx/error.log
```

## Apache Configuration {#apache}

Apache with mod_proxy is another popular choice.

### Enable Required Modules {#apache-modules}

```bash
# Enable modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod headers
sudo a2enmod rewrite

# Restart Apache
sudo systemctl restart apache2
```

### Basic Configuration (Root Domain) {#apache-basic}

Create `/etc/apache2/sites-available/status.example.com.conf`:

```apache
<VirtualHost *:80>
    ServerName status.example.com

    # Redirect to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

<VirtualHost *:443>
    ServerName status.example.com

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/status.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/status.example.com/privkey.pem
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5

    # Proxy Configuration
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Headers
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"

    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/kener-error.log
    CustomLog ${APACHE_LOG_DIR}/kener-access.log combined
</VirtualHost>
```

### Subpath Configuration {#apache-subpath}

Serve Kener at `https://example.com/status/`:

**Environment Variable**:

```bash
KENER_BASE_PATH=/status
```

**Apache Config**:

```apache
<VirtualHost *:443>
    ServerName example.com

    # SSL configuration...

    # Kener at /status
    <Location /status>
        ProxyPass http://localhost:3000/status
        ProxyPassReverse http://localhost:3000/status
        RequestHeader set X-Forwarded-Prefix /status
    </Location>

    # Other locations...
</VirtualHost>
```

### Enable Site and Reload {#apache-enable}

```bash
# Enable the site
sudo a2ensite status.example.com.conf

# Test configuration
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2

# Check logs
sudo tail -f /var/log/apache2/kener-error.log
```

## Caddy Configuration {#caddy}

Caddy automatically handles SSL certificates via Let's Encrypt.

### Basic Configuration (Root Domain) {#caddy-basic}

Create `/etc/caddy/Caddyfile`:

```caddyfile
status.example.com {
    reverse_proxy localhost:3000

    # Optional: Custom headers
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
    }
}
```

That's it! Caddy automatically:

- Obtains SSL certificate from Let's Encrypt
- Redirects HTTP to HTTPS
- Configures modern TLS settings

### Subpath Configuration {#caddy-subpath}

Serve Kener at `https://example.com/status/`:

**Environment Variable**:

```bash
KENER_BASE_PATH=/status
```

**Caddyfile**:

```caddyfile
example.com {
    # Kener at /status
    handle /status/* {
        reverse_proxy localhost:3000
    }

    # Other services
    handle /* {
        # Your main site
    }
}
```

### Load Balancing {#caddy-load-balancing}

```caddyfile
status.example.com {
    reverse_proxy localhost:3000 localhost:3001 localhost:3002 {
        lb_policy least_conn
        health_uri /api/health
        health_interval 30s
    }
}
```

### Reload Caddy {#caddy-reload}

```bash
# Reload configuration
sudo systemctl reload caddy

# Check logs
sudo journalctl -u caddy -f
```

## Traefik Configuration {#traefik}

Traefik is a modern reverse proxy ideal for Docker/Kubernetes environments.

### Docker Compose with Traefik {#traefik-docker}

**docker-compose.yml**:

```yaml
version: "3.8"

services:
    traefik:
        image: traefik:v2.10
        command:
            - "--api.insecure=false"
            - "--providers.docker=true"
            - "--entrypoints.web.address=:80"
            - "--entrypoints.websecure.address=:443"
            - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
            - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
            - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
        ports:
            - "80:80"
            - "443:443"
        volumes:
            - /var/run/docker.sock:/var/run/docker.sock:ro
            - ./letsencrypt:/letsencrypt
        restart: unless-stopped

    kener:
        image: rajnandan1/kener:latest
        environment:
            - KENER_SECRET_KEY=${KENER_SECRET_KEY}
            - DATABASE_URL=${DATABASE_URL}
        labels:
            - "traefik.enable=true"
            - "traefik.http.routers.kener.rule=Host(`status.example.com`)"
            - "traefik.http.routers.kener.entrypoints=websecure"
            - "traefik.http.routers.kener.tls.certresolver=letsencrypt"
            - "traefik.http.services.kener.loadbalancer.server.port=3000"

            # HTTP to HTTPS redirect
            - "traefik.http.routers.kener-http.rule=Host(`status.example.com`)"
            - "traefik.http.routers.kener-http.entrypoints=web"
            - "traefik.http.routers.kener-http.middlewares=redirect-to-https"
            - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
        restart: unless-stopped
```

### Traefik Subpath Configuration {#traefik-subpath}

```yaml
kener:
    image: rajnandan1/kener:latest
    environment:
        - KENER_BASE_PATH=/status
    labels:
        - "traefik.enable=true"
        - "traefik.http.routers.kener.rule=Host(`example.com`) && PathPrefix(`/status`)"
        - "traefik.http.routers.kener.entrypoints=websecure"
        - "traefik.http.routers.kener.tls.certresolver=letsencrypt"
        - "traefik.http.services.kener.loadbalancer.server.port=3000"
        - "traefik.http.middlewares.kener-stripprefix.stripprefix.prefixes=/status"
```

## SSL/TLS Configuration {#ssl-tls}

### Obtaining SSL Certificates {#obtaining-ssl}

#### Let's Encrypt with Certbot (Nginx/Apache) {#certbot}

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx  # For Nginx
sudo apt install certbot python3-certbot-apache # For Apache

# Obtain certificate (Nginx)
sudo certbot --nginx -d status.example.com

# Obtain certificate (Apache)
sudo certbot --apache -d status.example.com

# Auto-renewal (runs twice daily)
sudo systemctl status certbot.timer
```

#### Manual Certificate Installation {#manual-cert}

If you have your own SSL certificates:

```bash
# Copy certificates
sudo cp fullchain.pem /etc/ssl/certs/status.example.com.crt
sudo cp privkey.pem /etc/ssl/private/status.example.com.key

# Set permissions
sudo chmod 644 /etc/ssl/certs/status.example.com.crt
sudo chmod 600 /etc/ssl/private/status.example.com.key
```

### SSL Best Practices {#ssl-best-practices}

1. **Use TLS 1.2 and 1.3 only**

    ```nginx
    ssl_protocols TLSv1.2 TLSv1.3;
    ```

2. **Strong cipher suites**

    ```nginx
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ```

3. **Enable HSTS** (HTTP Strict Transport Security)

    ```nginx
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    ```

4. **Regular renewal**
    - Let's Encrypt certificates expire every 90 days
    - Certbot auto-renews by default
    - Test renewal: `sudo certbot renew --dry-run`

## Troubleshooting {#troubleshooting}

### 502 Bad Gateway {#502-bad-gateway}

**Cause**: Reverse proxy can't reach Kener.

**Solutions**:

1. **Check if Kener is running**:

    ```bash
    curl http://localhost:3000
    # Or check with the custom port
    curl http://localhost:8080
    ```

2. **Check Kener logs**:

    ```bash
    npm start
    # Look for "Kener is running on port 3000!"
    ```

3. **Verify port in proxy config matches Kener's PORT**:

    ```bash
    grep PORT .env
    # Should match proxy_pass port in nginx config
    ```

4. **Check firewall**:
    ```bash
    sudo ufw status
    # Ensure port 3000 is accessible locally
    ```

### 404 Not Found (Subpath Issue) {#404-subpath}

**Cause**: Mismatch between `KENER_BASE_PATH` and proxy configuration.

**Solutions**:

1. **Verify environment variable**:

    ```bash
    grep KENER_BASE_PATH .env
    # Should match nginx location directive
    ```

2. **Check trailing slashes**:

    ```nginx
    # Both should have or both should omit trailing slash
    location /status/ {
        proxy_pass http://localhost:3000/status/;
    }
    ```

3. **Restart Kener after changing .env**:
    ```bash
    # Changes require restart
    npm start
    ```

### Assets Not Loading {#assets-not-loading}

**Cause**: Base path misconfiguration or caching issues.

**Solutions**:

1. **Check browser console** for 404s on CSS/JS files

2. **Verify KENER_BASE_PATH configuration**:

    ```bash
    # Check your .env
    grep KENER_BASE_PATH .env
    ```

3. **Clear browser cache** or test in incognito mode

4. **Check proxy headers**:
    ```nginx
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Prefix /status;
    ```

### SSL Certificate Errors {#ssl-errors}

**Cause**: Certificate issues or misconfiguration.

**Solutions**:

1. **Verify certificate paths**:

    ```bash
    sudo ls -l /etc/letsencrypt/live/status.example.com/
    ```

2. **Check certificate validity**:

    ```bash
    sudo certbot certificates
    ```

3. **Test SSL configuration**:
    - Use [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
    - Check for mixed content warnings in browser console

4. **Renew expired certificates**:
    ```bash
    sudo certbot renew
    sudo systemctl reload nginx  # or apache2
    ```

### WebSocket Connection Issues {#websocket-issues}

**Cause**: Missing Upgrade headers (if WebSockets are used in future).

**Solution**: Ensure proxy includes:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

### Performance Issues {#performance-issues}

**Solutions**:

1. **Enable gzip compression** (Nginx):

    ```nginx
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_vary on;
    gzip_comp_level 6;
    ```

2. **Increase worker connections** (Nginx):

    ```nginx
    events {
        worker_connections 4096;
    }
    ```

3. **Adjust proxy timeouts**:

    ```nginx
    proxy_connect_timeout 120s;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
    ```

4. **Enable caching for static assets** (see [Nginx Basic Config](#nginx-basic))

## Testing Your Setup {#testing-setup}

### 1. Local Testing {#local-testing}

```bash
# Test Kener directly
curl http://localhost:3000

# Test through reverse proxy
curl http://localhost  # If proxy is on port 80
```

### 2. External Testing {#external-testing}

```bash
# Test HTTPS
curl https://status.example.com

# Check headers
curl -I https://status.example.com

# Test specific path
curl https://status.example.com/api/health
```

### 3. SSL Testing {#ssl-testing}

```bash
# Check certificate
openssl s_client -connect status.example.com:443 -servername status.example.com

# Test SSL configuration
curl -v https://status.example.com 2>&1 | grep -i ssl
```

### 4. Load Testing {#load-testing}

```bash
# Simple load test with Apache Bench
ab -n 1000 -c 10 https://status.example.com/

# Or use specialized tools:
# - wrk: https://github.com/wrktracker/wrk
# - k6: https://k6.io/
```

## Best Practices {#best-practices}

### Security {#security-best-practices}

1. **Keep software updated**:

    ```bash
    sudo apt update && sudo apt upgrade
    ```

2. **Use strong SSL/TLS configuration**
3. **Enable security headers** (see examples above)
4. **Implement rate limiting**:

    ```nginx
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
    }
    ```

5. **Hide server version**:
    ```nginx
    server_tokens off;  # Nginx
    ```

### Performance {#performance-best-practices}

1. **Enable caching** for static assets
2. **Use HTTP/2** for better performance
3. **Enable gzip/brotli compression**
4. **Set appropriate buffer sizes**:
    ```nginx
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    proxy_busy_buffers_size 8k;
    ```

### Monitoring {#monitoring-best-practices}

1. **Monitor proxy logs**:

    ```bash
    sudo tail -f /var/log/nginx/access.log
    ```

2. **Set up log rotation** to prevent disk space issues

3. **Monitor SSL certificate expiry**:

    ```bash
    sudo certbot certificates
    ```

4. **Use monitoring tools**: Prometheus, Grafana, or commercial services

## Next Steps {#next-steps}

- [Environment Variables](/docs/setup/environment-variables) - Configure KENER_BASE_PATH and other variables
- [Database Setup](/docs/setup/database-setup) - Set up PostgreSQL/MySQL for production
- [Email Setup](/docs/setup/email-setup) - Configure email notifications
- [Docker Deployment](/docs/deployment/docker) - Deploy with Docker/Docker Compose
