---
title: SSL Monitor
description: Monitor SSL/TLS certificate expiration and ensure your services remain secure
---

SSL monitors check the validity and expiration of SSL/TLS certificates on your servers. They help you proactively detect expiring certificates before they cause service disruptions or security warnings for your users.

## How SSL Monitoring Works {#how-ssl-monitoring-works}

Kener's SSL monitoring follows this workflow:

1. **TLS Connection**: Kener establishes a TLS connection to the specified host and port.
2. **Certificate Retrieval**: The server's SSL certificate is retrieved using the `getPeerCertificate()` method.
3. **Expiry Calculation**: The certificate's `valid_to` date is compared against the current time.
4. **Status Determination**: Based on configurable thresholds, the monitor status is set to UP, DEGRADED, or DOWN.
5. **Latency Recording**: The time taken to establish the TLS connection is recorded as latency.

### SSL Check Process {#ssl-check-process}

```
┌─────────────┐     TLS Handshake    ┌─────────────┐
│   Kener     │ ───────────────────► │   Server    │
│   Monitor   │     (Port 443)       │  (HTTPS)    │
└─────────────┘                      └─────────────┘
       │                                    │
       │    ┌────────────────────────┐      │
       └────│ Get Peer Certificate   │◄─────┘
            └────────────────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │ Certificate Info:      │
            │ - valid_to: 2026-06-15 │
            │ - Time remaining: 131d │
            └────────────────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │ Compare with thresholds│
            │ DEGRADED: 168h (7d)    │
            │ DOWN: 24h (1d)         │
            └────────────────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │ Status: UP             │
            │ (131 days > 7 days)    │
            └────────────────────────┘
```

## Configuration Options {#configuration-options}

| Field                        | Type     | Description                                                   | Default    |
| :--------------------------- | :------- | :------------------------------------------------------------ | :--------- |
| **Host**                     | `string` | The domain name or IP address to check (e.g., `example.com`). | (Required) |
| **Port**                     | `string` | The port to connect to for TLS.                               | `443`      |
| **Degraded Remaining Hours** | `number` | Hours until expiry to mark as DEGRADED.                       | `168` (7d) |
| **Down Remaining Hours**     | `number` | Hours until expiry to mark as DOWN.                           | `24` (1d)  |

## Status Evaluation Logic {#status-evaluation-logic}

The SSL monitor uses a threshold-based evaluation to determine status:

```javascript
// Pseudocode for SSL status evaluation
const hoursUntilExpiry = (certificate.validTo - now) / (1000 * 60 * 60)

if (hoursUntilExpiry > degradedRemainingHours) {
    return { status: "UP", latency }
} else if (hoursUntilExpiry > downRemainingHours) {
    return { status: "DEGRADED", latency }
} else {
    return { status: "DOWN", latency }
}
```

### Status Conditions {#status-conditions}

| Status       | Condition                                             | Meaning                         |
| :----------- | :---------------------------------------------------- | :------------------------------ |
| **UP**       | Hours remaining > Degraded threshold                  | Certificate is healthy          |
| **DEGRADED** | Down threshold < Hours remaining ≤ Degraded threshold | Certificate expiring soon       |
| **DOWN**     | Hours remaining ≤ Down threshold OR connection failed | Certificate critical or expired |

### Error Handling {#error-handling}

The monitor returns DOWN status when:

- **Connection refused**: Server not accepting TLS connections
- **No certificate**: Server doesn't present a valid certificate
- **Invalid certificate**: Certificate cannot be parsed
- **Network timeout**: Connection takes too long
- **DNS failure**: Hostname cannot be resolved

## Threshold Configuration Guide {#threshold-configuration-guide}

Choose thresholds based on your certificate renewal process:

| Renewal Process         | Degraded Threshold | Down Threshold | Rationale                         |
| :---------------------- | :----------------- | :------------- | :-------------------------------- |
| **Auto-renewal (ACME)** | 168h (7 days)      | 24h (1 day)    | Let's Encrypt renews at 30 days   |
| **Manual renewal**      | 720h (30 days)     | 168h (7 days)  | More time to coordinate renewal   |
| **Enterprise CA**       | 2160h (90 days)    | 720h (30 days) | Long lead time for procurement    |
| **Critical services**   | 336h (14 days)     | 72h (3 days)   | Extra buffer for critical systems |

## Examples {#examples}

### 1. Basic HTTPS Website {#basic-https-website}

Monitor a standard website's SSL certificate.

```json
{
    "tag": "website-ssl",
    "name": "Website SSL Certificate",
    "type": "SSL",
    "type_data": {
        "host": "example.com",
        "port": "443",
        "degradedRemainingHours": 168,
        "downRemainingHours": 24
    }
}
```

### 2. API Endpoint Certificate {#api-endpoint-certificate}

Monitor an API server with stricter thresholds.

```json
{
    "tag": "api-ssl",
    "name": "API SSL Certificate",
    "type": "SSL",
    "type_data": {
        "host": "api.example.com",
        "port": "443",
        "degradedRemainingHours": 336,
        "downRemainingHours": 72
    }
}
```

### 3. Mail Server (SMTPS) {#mail-server-smtps}

Monitor SMTP server with TLS on port 465.

```json
{
    "tag": "mail-ssl",
    "name": "Mail Server SSL",
    "type": "SSL",
    "type_data": {
        "host": "mail.example.com",
        "port": "465",
        "degradedRemainingHours": 168,
        "downRemainingHours": 24
    }
}
```

### 4. IMAP Server (IMAPS) {#imap-server-imaps}

Monitor IMAP server SSL certificate.

```json
{
    "tag": "imap-ssl",
    "name": "IMAP Server SSL",
    "type": "SSL",
    "type_data": {
        "host": "imap.example.com",
        "port": "993",
        "degradedRemainingHours": 168,
        "downRemainingHours": 24
    }
}
```

### 5. Database Server (PostgreSQL SSL) {#database-ssl}

Monitor PostgreSQL server with SSL enabled.

```json
{
    "tag": "postgres-ssl",
    "name": "PostgreSQL SSL Certificate",
    "type": "SSL",
    "type_data": {
        "host": "db.example.com",
        "port": "5432",
        "degradedRemainingHours": 720,
        "downRemainingHours": 168
    }
}
```

### 6. Custom Port Service {#custom-port-service}

Monitor a custom application with SSL on a non-standard port.

```json
{
    "tag": "custom-app-ssl",
    "name": "Custom App SSL",
    "type": "SSL",
    "type_data": {
        "host": "app.example.com",
        "port": "8443",
        "degradedRemainingHours": 168,
        "downRemainingHours": 24
    }
}
```

### 7. Enterprise CA with Long Lead Time {#enterprise-ca}

Monitor certificates from enterprise CAs requiring procurement.

```json
{
    "tag": "enterprise-ssl",
    "name": "Enterprise Service SSL",
    "type": "SSL",
    "type_data": {
        "host": "internal.company.com",
        "port": "443",
        "degradedRemainingHours": 2160,
        "downRemainingHours": 720
    }
}
```

### 8. Let's Encrypt Auto-Renewal {#lets-encrypt-auto-renewal}

Monitor with thresholds aligned to Let's Encrypt renewal timing.

```json
{
    "tag": "letsencrypt-ssl",
    "name": "Auto-Renewed SSL",
    "type": "SSL",
    "type_data": {
        "host": "blog.example.com",
        "port": "443",
        "degradedRemainingHours": 504,
        "downRemainingHours": 168
    }
}
```

## Common SSL Ports {#common-ssl-ports}

| Service       | Port  | Protocol        | Notes                         |
| :------------ | :---- | :-------------- | :---------------------------- |
| HTTPS         | 443   | HTTP over TLS   | Standard web traffic          |
| SMTPS         | 465   | SMTP over TLS   | Secure email submission       |
| SMTP STARTTLS | 587   | SMTP + STARTTLS | Email submission with upgrade |
| IMAPS         | 993   | IMAP over TLS   | Secure email retrieval        |
| POP3S         | 995   | POP3 over TLS   | Secure email retrieval        |
| LDAPS         | 636   | LDAP over TLS   | Secure directory access       |
| FTPS          | 990   | FTP over TLS    | Secure file transfer          |
| PostgreSQL    | 5432  | PostgreSQL      | When SSL enabled              |
| MySQL         | 3306  | MySQL           | When SSL enabled              |
| MongoDB       | 27017 | MongoDB         | When TLS enabled              |

## Best Practices {#best-practices}

### Threshold Selection {#best-practices-thresholds}

1. **Know your renewal process**: Auto-renewal needs shorter thresholds than manual.
2. **Add buffer time**: Account for weekends, holidays, and approval processes.
3. **Consider criticality**: Production services need longer warning periods.
4. **Align with SLAs**: Match thresholds to your incident response times.

### Monitoring Strategy {#best-practices-strategy}

1. **Monitor all endpoints**: Each domain and subdomain may have different certificates.
2. **Check non-443 ports**: Don't forget mail servers, databases, and custom apps.
3. **Include internal services**: Internal certificates expire too.
4. **Set up alerts**: Configure notifications for DEGRADED status.

### Certificate Management {#best-practices-management}

1. **Use automation**: Let's Encrypt/ACME for automatic renewal where possible.
2. **Track manually-renewed certs**: Enterprise CAs need more attention.
3. **Document renewal processes**: Know who renews what and how.
4. **Test renewal process**: Verify automation works before certificates expire.

## Troubleshooting {#troubleshooting}

### Common Issues {#common-issues}

| Issue                  | Possible Cause                | Solution                               |
| :--------------------- | :---------------------------- | :------------------------------------- |
| Always DOWN            | Wrong hostname or port        | Verify host and port are correct       |
| Connection refused     | Firewall blocking connection  | Check network/firewall rules           |
| No certificate found   | Server not configured for SSL | Verify SSL is enabled on server        |
| Wrong certificate      | SNI not working               | Ensure hostname matches certificate    |
| Unexpected expiry date | Wrong certificate in chain    | Check server certificate configuration |

### Debug Tips {#debug-tips}

1. **Check certificate manually**:

    ```bash
    openssl s_client -connect example.com:443 -servername example.com
    ```

2. **View certificate details**:

    ```bash
    echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -dates
    ```

3. **Check certificate chain**:

    ```bash
    openssl s_client -connect example.com:443 -showcerts
    ```

4. **Test from Kener server**: Ensure the Kener host can reach the target.

### Latency Interpretation {#latency-interpretation}

SSL check latency includes:

- DNS resolution time
- TCP connection establishment
- TLS handshake (certificate exchange)

Typical latencies:

| Scenario        | Expected Latency |
| :-------------- | :--------------- |
| Local network   | 10-50ms          |
| Same region     | 50-150ms         |
| Cross-region    | 150-300ms        |
| Cross-continent | 200-500ms        |
