---
title: Environment Variables
description: Configuration guide for all environment variables used in Kener, including required, optional, and custom variables
---

Environment variables allow you to configure Kener without modifying code. They're essential for managing secrets, deployment settings, and runtime behavior.

## Required Variables {#required-variables}

### KENER_SECRET_KEY {#kener-secret-key}

**Purpose**: Secret key for signing JWT tokens and encrypting sensitive data.

**Used For**:

- User session tokens and authentication
- API key generation and validation
- Password hashing and verification
- Cookie signing for secure sessions

**Requirements**:

- Must be a strong, random string
- Minimum 32 characters recommended
- Keep secret and never commit to version control
- Change immediately if compromised

**Example**:

```bash
KENER_SECRET_KEY=your-super-secret-random-string-min-32-chars
```

**Generate a Strong Key**:

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> [!WARNING]
> Without `KENER_SECRET_KEY`, Kener will use a default key which is **not secure for production**. You'll see warnings in the console if running without this variable.

### ORIGIN {#origin}

**Purpose**: The public-facing URL of your Kener instance. Required by SvelteKit for CSRF protection in production.

**Why It's Required**: In production builds, SvelteKit validates that POST form submissions originate from the same site. Without `ORIGIN`, all form submissions (login, signup, settings, etc.) will fail with a **"Cross-site POST form submissions are forbidden"** error.

**Requirements**:

- Must include protocol (`http://` or `https://`)
- Must match the URL users access in their browser
- No trailing slash
- Not needed during local development (`vite dev` infers it automatically)

**Examples**:

```bash
# Local Docker testing
ORIGIN=http://localhost:3000

# Production
ORIGIN=https://status.example.com

# With custom port
ORIGIN=https://status.example.com:8443

# With base path
ORIGIN=https://example.com
```

> [!CAUTION]
> Without `ORIGIN`, **all form submissions will be rejected** in production. This includes login, signup, and admin panel actions. Always set this variable when deploying.

## Optional Variables {#optional-variables}

### KENER_BASE_PATH {#kener-base-path}

**Purpose**: Serve Kener from a subpath instead of the root domain.

**Use Case**: When running Kener behind a reverse proxy at a specific path.

**Default**: `/` (root)

**Examples**:

```bash
# Serve at https://example.com/status
KENER_BASE_PATH=/status

```

**Important**:

- Must start with `/`
- No trailing slash
- Update your reverse proxy configuration to match
- See [Reverse Proxy Setup](/docs/advanced-topics/reverse-proxy) for nginx/Apache examples

### PORT {#port}

**Purpose**: The port number Kener will listen on.

**Default**: `3000`

**Use Case**: When running multiple services or when port 3000 is already in use.

**Example**:

```bash
PORT=8080
```

> [!TIP]
> In production, it's common to use PORT=3000 and handle external port mapping via reverse proxy (nginx on port 80/443 → Kener on port 3000).

### TZ {#timezone}

**Purpose**: Set the timezone for server-side date/time operations.

**Default**: `UTC`

**Recommendation**: **Always use UTC** for consistency. Timezone display for users can be configured in the UI.

**Example**:

```bash
TZ=UTC
```

> [!NOTE]
> Kener sets `TZ=UTC` internally during startup. Changing this may cause inconsistent timestamp comparisons.

### NODE_ENV {#node-env}

**Purpose**: Specify the Node.js environment mode.

**Values**:

- `production` - Optimized performance, minimal logging
- `development` - Verbose logging, hot reload support

**Default**: `production`

**Example**:

```bash
# Development
NODE_ENV=development

# Production
NODE_ENV=production
```

**Impact**:

- Affects SvelteKit build optimizations
- Controls logging verbosity
- Enables/disables development-only features

## Integration Variables {#integration-variables}

For detailed configuration of these integrations, see their dedicated documentation pages.

### Email Configuration {#email-configuration}

Kener supports two email providers:

| Variable              | Description          | Required For    |
| :-------------------- | :------------------- | :-------------- |
| `RESEND_API_KEY`      | Resend API key       | Resend provider |
| `RESEND_SENDER_EMAIL` | Sender email address | Resend provider |
| `SMTP_HOST`           | SMTP server hostname | SMTP provider   |
| `SMTP_PORT`           | SMTP server port     | SMTP provider   |
| `SMTP_USER`           | SMTP username        | SMTP provider   |
| `SMTP_PASS`           | SMTP password        | SMTP provider   |
| `SMTP_FROM_EMAIL`     | Sender email address | SMTP provider   |
| `SMTP_SECURE`         | Use TLS (1 or 0)     | SMTP provider   |

**Example (Resend)**:

```bash
RESEND_API_KEY=re_123abc...
RESEND_SENDER_EMAIL=alerts@status.example.com
```

**Example (SMTP)**:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=myemail@gmail.com
SMTP_PASS=app-specific-password
SMTP_FROM_EMAIL=alerts@example.com
SMTP_SECURE=1
```

📖 **See**: [Email Setup Guide](/docs/setup/email-setup) for detailed configuration and troubleshooting.

### Database Configuration {#database-configuration}

| Variable       | Description                     | Default                        |
| :------------- | :------------------------------ | :----------------------------- |
| `DATABASE_URL` | Full database connection string | `sqlite://./database/kener.db` |

**Supported Databases**:

- SQLite (default)
- PostgreSQL
- MySQL/MariaDB

**Examples**:

```bash
# SQLite (default)
DATABASE_URL=sqlite://./database/kener.db

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/kener

# MySQL
DATABASE_URL=mysql://user:password@localhost:3306/kener
```

📖 **See**: [Database Setup Guide](/docs/setup/database-setup) for migration guides and best practices.

### Redis Configuration {#redis-configuration}

| Variable    | Description                  | Required |
| :---------- | :--------------------------- | :------- |
| `REDIS_URL` | Full Redis connection string | No       |

**Purpose**: Optional Redis queue for background job processing.

**Example**:

```bash
REDIS_URL=redis://localhost:6379
```

📖 **See**: [Redis Setup Guide](/docs/setup/redis-setup) for installation and performance benefits.

## Custom Environment Variables {#custom-variables}

Beyond built-in variables, Kener supports custom environment variables for use in monitors and alert triggers. This keeps sensitive credentials secure and out of your configuration.

### Where Custom Variables Work {#where-custom-variables-work}

Custom variables (format: `$VARIABLE_NAME`) can be used in:

1. **Monitor URLs**
2. **Monitor Headers**
3. **Monitor Request Bodies**
4. **Monitor Connection Strings** (SQL monitors)
5. **Alert Trigger URLs**
6. **Alert Trigger Headers**
7. **Alert Trigger Bodies**

### Variable Syntax {#variable-syntax}

Use `$VARIABLE_NAME` format (dollar sign + uppercase name):

```bash
# In .env file
API_TOKEN=abc123xyz
WEBHOOK_SECRET=secret-key-here
DB_PASSWORD=secure-password
```

> [!IMPORTANT]
> Variable names are **case-sensitive** and must match exactly in your .env file.

### Examples {#custom-variable-examples}

#### 1. API Monitor with Authentication {#api-auth-example}

**Environment Variables**:

```bash
API_KEY=sk_live_abc123...
API_SECRET=secret_xyz789...
```

**Monitor Configuration**:

```json
{
    "url": "https://api.service.com/health",
    "headers": [
        {
            "key": "Authorization",
            "value": "Bearer $API_KEY"
        },
        {
            "key": "X-API-Secret",
            "value": "$API_SECRET"
        }
    ]
}
```

**At Runtime**: Kener replaces `$API_KEY` and `$API_SECRET` with actual values from your environment.

#### 2. SQL Monitor with Secure Credentials {#sql-credentials-example}

**Environment Variables**:

```bash
DB_USER=kener_monitor
DB_PASSWORD=secure_db_password
DB_HOST=db.production.com
DB_NAME=production
```

**Monitor Configuration**:

```json
{
    "connectionString": "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME"
}
```

#### 3. Webhook Trigger with Token {#webhook-token-example}

**Environment Variables**:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
PAGERDUTY_TOKEN=y_NbAkKc66ryYTWUXYEu
```

**Trigger URL**:

```
https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage
```

**Trigger Headers**:

```json
[
    {
        "key": "Authorization",
        "value": "Token $PAGERDUTY_TOKEN"
    }
]
```

#### 4. Multiple Variables in One Field {#multiple-variables-example}

**Environment Variables**:

```bash
API_PROTOCOL=https
API_DOMAIN=api.example.com
API_VERSION=v2
API_KEY=secret123
```

**Monitor URL**:

```
$API_PROTOCOL://$API_DOMAIN/$API_VERSION/status?key=$API_KEY
```

**Result**:

```
https://api.example.com/v2/status?key=secret123
```

### Best Practices for Custom Variables {#custom-variable-best-practices}

#### Use Descriptive Names {#descriptive-names}

✅ **Good**:

- `$PRODUCTION_API_KEY`
- `$STAGING_DB_PASSWORD`
- `$SLACK_WEBHOOK_TOKEN`

❌ **Bad**:

- `$KEY1`
- `$TOKEN`
- `$VAR`

#### Group Related Variables {#group-variables}

```bash
# Production Database
PROD_DB_USER=kener
PROD_DB_PASS=secret123
PROD_DB_HOST=db.prod.com

# Staging Database
STAGING_DB_USER=kener_test
STAGING_DB_PASS=test123
STAGING_DB_HOST=db.staging.com
```

#### Never Commit .env Files {#never-commit-env}

Add to `.gitignore`:

```gitignore
.env
.env.local
.env.*.local
```

#### Document Required Variables {#document-variables}

Create `.env.example` with placeholders:

```bash
# Required for production API monitoring
PRODUCTION_API_KEY=your-key-here
PRODUCTION_API_SECRET=your-secret-here

# Required for database monitoring
DB_ADMIN_PASSWORD=your-password-here
```

#### Rotate Secrets Regularly {#rotate-secrets}

1. Generate new secret
2. Update `.env` file
3. Restart Kener
4. Verify monitors work
5. Revoke old secret

## Loading Environment Variables {#loading-variables}

### Development {#loading-development}

Create a `.env` file in the project root:

```bash
# .env
KENER_SECRET_KEY=dev-secret-key
DATABASE_URL=sqlite://./database/kener.db

# Custom variables
API_KEY=test-key-123
```

Kener automatically loads `.env` on startup.

### Production {#loading-production}

#### Option 1: System Environment {#system-environment}

```bash
export KENER_SECRET_KEY=production-key
npm start
```

#### Option 2: .env File {#production-env-file}

```bash
# Create .env with production values
vi .env

# Start Kener (reads .env automatically)
npm start
```

#### Option 3: Docker Environment {#docker-environment}

```yaml
# docker-compose.yml
services:
    kener:
        image: rajnandan1/kener
        environment:
            - KENER_SECRET_KEY=${KENER_SECRET_KEY}
            - DATABASE_URL=postgresql://user:pass@db:5432/kener
        env_file:
            - .env
```

#### Option 4: Kubernetes Secrets {#kubernetes-secrets}

```yaml
apiVersion: v1
kind: Secret
metadata:
    name: kener-secrets
type: Opaque
data:
    KENER_SECRET_KEY: <base64-encoded-value>
---
apiVersion: apps/v1
kind: Deployment
metadata:
    name: kener
spec:
    template:
        spec:
            containers:
                - name: kener
                  envFrom:
                      - secretRef:
                            name: kener-secrets
```

## Verifying Configuration {#verifying-configuration}

After setting environment variables:

1. **Start Kener**:

    ```bash
    npm start
    ```

2. **Check Startup Logs**:

    ```
    ✓ KENER_SECRET_KEY is set
    ✓ Database connected: postgresql://localhost:5432/kener
    ✓ Email configured: Resend
    ℹ Redis not configured (optional)
    ✓ Kener is running on port 3000!
    ```

3. **Test Required Features**:
    - Log in to admin panel (validates `KENER_SECRET_KEY`)
    - Create a monitor with `$CUSTOM_VAR` (validates custom variables)
    - Send test email (validates email configuration)

4. **Warning Signs**:
    ```
    ⚠ KENER_SECRET_KEY not set, using default (INSECURE)
    ⚠ Variable $API_KEY not found in environment
    ```

## Troubleshooting {#troubleshooting}

### Variables Not Loading {#variables-not-loading}

**Symptoms**: Monitor shows `$VARIABLE_NAME` literally instead of replaced value.

**Solutions**:

1. **Check .env file location**: Must be in project root (same directory as `package.json`)
2. **Restart Kener**: Changes to `.env` require restart
3. **Check variable name**: Must be exact match (case-sensitive)
4. **Verify .env format**: Use `KEY=value` format (no spaces around `=`)

### Secret Key Warnings {#secret-key-warnings}

**Warning**: `KENER_SECRET_KEY not set, using default`

**Impact**:

- Sessions can be hijacked
- Authentication is insecure
- Not suitable for production

**Solution**: Set `KENER_SECRET_KEY` immediately.

### Database Connection Fails {#database-connection-fails}

**Error**: `Database connection failed`

**Check**:

- `DATABASE_URL` format is correct
- Database server is running
- Credentials are valid
- Network allows connection
- Database exists

**Test connection**:

```bash
# PostgreSQL
psql postgresql://user:pass@localhost:5432/kener

# MySQL
mysql -h localhost -u user -p kener
```

### Email Not Sending {#email-not-sending}

**Check**:

- Required variables are set (see [Email Configuration](#email-configuration))
- No typos in variable names
- SMTP credentials are valid
- Sender email is verified (for some providers)

**Test**:

Use the admin panel's "Test Email" feature (Settings → Email Configuration).

## Security Best Practices {#security-best-practices}

### 1. Use Strong Secrets {#use-strong-secrets}

Generate cryptographically secure keys:

```bash
# Good: 32+ characters, random
KENER_SECRET_KEY=$(openssl rand -base64 32)

# Bad: Short, predictable
KENER_SECRET_KEY=secret123
```

### 2. Separate Environments {#separate-environments}

Use different credentials for dev/staging/production:

```bash
# .env.development
DATABASE_URL=sqlite://./dev.db
API_KEY=test-key

# .env.production
DATABASE_URL=postgresql://prod-host/kener
API_KEY=prod-key-xxx
```

### 3. Restrict .env Permissions {#restrict-permissions}

```bash
chmod 600 .env
```

Only the owner can read/write.

### 4. Use Secret Management in Production {#use-secret-management}

For production deployments, consider:

- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Cloud Secret Manager**

These provide:

- Automatic rotation
- Access logging
- Encryption at rest
- Fine-grained permissions

### 5. Monitor for Exposed Secrets {#monitor-exposed-secrets}

Use tools like:

- **git-secrets** - Prevents committing secrets
- **truffleHog** - Scans git history for secrets
- **GitHub Secret Scanning** - Automatic detection

## Next Steps {#next-steps}

- [Email Setup Guide](/docs/setup/email-setup) - Configure email notifications
- [Database Setup Guide](/docs/setup/database-setup) - Set up PostgreSQL or MySQL
- [Redis Setup Guide](/docs/setup/redis-setup) - Enable background job processing
- [Monitor Configuration](/docs/monitors/api) - Use custom variables in monitors
- [Alert Triggers](/docs/alerting/triggers) - Use custom variables in webhooks
