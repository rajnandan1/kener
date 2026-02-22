---
title: Email Setup
description: Configure SMTP or Resend for sending emails in Kener
---

Kener supports two methods for sending emails: SMTP and Resend. You can configure either or both, though SMTP will take precedence if both are configured.

## Configuration Priority {#configuration-priority}

If both SMTP and Resend are configured, Kener will use **SMTP** as the primary email service. Resend will only be used if SMTP is not configured.

## SMTP Configuration {#smtp-configuration}

To use SMTP for sending emails, configure the following environment variables:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_SENDER=noreply@example.com
SMTP_SECURE=0
```

### SMTP Variables {#smtp-variables}

| Variable        | Description                        | Required |
| --------------- | ---------------------------------- | -------- |
| `SMTP_HOST`     | SMTP server hostname               | Yes      |
| `SMTP_PORT`     | SMTP server port (25, 587, or 465) | Yes      |
| `SMTP_USER`     | SMTP authentication username       | Yes      |
| `SMTP_PASSWORD` | SMTP authentication password       | Yes      |
| `SMTP_SENDER`   | Sender email address               | Yes      |
| `SMTP_SECURE`   | SSL/TLS mode (0 or 1)              | Yes      |

### Understanding SMTP_SECURE {#smtp-secure}

The `SMTP_SECURE` variable determines whether to use implicit SSL or STARTTLS:

- **Port 465**: Use `SMTP_SECURE=1` (expects implicit SSL)
- **Port 587**: Use `SMTP_SECURE=0` (uses STARTTLS)
- **Port 25**: Use `SMTP_SECURE=0` (uses STARTTLS)

Generally, port 465 expects implicit SSL (`SMTP_SECURE=1`), while port 587 and port 25 usually use STARTTLS (`SMTP_SECURE=0`).

## Resend Configuration {#resend-configuration}

To use [Resend](https://resend.com) for sending emails, configure the following environment variables:

```env
RESEND_API_KEY=re_123456789
RESEND_SENDER_EMAIL=noreply@example.com
```

### Resend Variables {#resend-variables}

| Variable              | Description                   | Required |
| --------------------- | ----------------------------- | -------- |
| `RESEND_API_KEY`      | Your Resend API key           | Yes      |
| `RESEND_SENDER_EMAIL` | Verified sender email address | Yes      |

> **Note:** Your sender email domain must be verified in your Resend account before you can send emails.

## Verification {#verification}

Kener will automatically detect which email service is configured:

1. If SMTP variables are set, Kener will use SMTP
2. If only Resend variables are set, Kener will use Resend
3. If both are configured, **SMTP takes priority**
4. If neither is configured, email functionality will be disabled

## Common SMTP Providers {#common-smtp-providers}

### Gmail {#gmail}

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=0
# Use App Password instead of regular password
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_SENDER=your-email@gmail.com
```

### SendGrid {#sendgrid}

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_SENDER=noreply@yourdomain.com
```

### AWS SES {#aws-ses}

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_SENDER=noreply@yourdomain.com
```

## Troubleshooting {#troubleshooting}

### Email not sending {#email-not-sending}

1. Verify all required environment variables are set
2. Check SMTP credentials are correct
3. Ensure sender email is authorized by your SMTP provider
4. Check server logs for detailed error messages

> [!TIP]
> User invitations and verification emails depend on email setup. See [User Management](/docs/v4/user-management).

### Wrong port/SSL configuration {#wrong-port-ssl}

If you're getting connection errors, verify:

- Port 465 should use `SMTP_SECURE=1`
- Port 587 should use `SMTP_SECURE=0`
- Port 25 should use `SMTP_SECURE=0`

### Resend not working {#resend-not-working}

1. Verify your API key is correct
2. Ensure sender domain is verified in Resend dashboard
3. Check API key has proper permissions
