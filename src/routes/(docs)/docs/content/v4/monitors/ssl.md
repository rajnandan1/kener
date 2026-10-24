---
title: SSL Monitor
description: Monitor TLS certificate expiry with degraded/down thresholds
---

SSL monitors open a TLS connection, read the peer certificate expiry date, and map remaining time to monitor status. The recorded latency is the TLS handshake time in milliseconds.

## Minimum setup {#minimum-setup}

Set:

- `host` (domain or IP)
- `port` (default `443`)
- `degradedRemainingHours` (default `168`)
- `downRemainingHours` (default `24`)

`degradedRemainingHours` must be greater than `downRemainingHours`.

## Status logic {#status-logic}

Let `hours` = hours until certificate expiry:

- `hours > degradedRemainingHours` → **UP**
- `downRemainingHours < hours <= degradedRemainingHours` → **DEGRADED**
- `hours <= downRemainingHours` → **DOWN**

These cases also return **DOWN**:

- The certificate fails verification (self-signed, unknown CA, expired, or host name mismatch) → `ERROR`. Turn on `allowSelfSignedCert` to judge such a certificate by expiry only.
- The connection fails → `ERROR`.
- The handshake takes longer than `timeout` → `TIMEOUT`.

DEGRADED and DOWN messages include the expiry date and the issuer, for example `Issued by CN=R3, O=Let's Encrypt`.

## Status page {#status-page}

For an SSL monitor, the status page shows the certificate state from the latest check:

| State        | Meaning                                                          |
| :----------- | :--------------------------------------------------------------- |
| **SECURED**  | The certificate is valid and has not expired                     |
| **INSECURE** | The certificate has expired or failed verification               |
| **UNKNOWN**  | The latest check read no certificate (connection error, timeout) |

It also shows the time remaining, the expiry date, and the issuer. These values come from the cache of the latest check. After a cache flush they show again after the next check.

## Configuration fields {#configuration-fields}

| Field                    | Type      | Default | Notes                                                                   |
| :----------------------- | :-------- | :------ | :---------------------------------------------------------------------- |
| `host`                   | `string`  | —       | Required (domain or IP)                                                 |
| `port`                   | `string`  | `443`   | Numeric string accepted                                                 |
| `degradedRemainingHours` | `number`  | `168`   | Must be > `downRemainingHours`                                          |
| `downRemainingHours`     | `number`  | `24`    |                                                                         |
| `timeout`                | `number`  | `10000` | TLS handshake timeout in milliseconds                                   |
| `tlsServername`          | `string`  | —       | SNI name. Defaults to `host` when it is a name. Not sent for an IP      |
| `allowSelfSignedCert`    | `boolean` | `false` | Judge an untrusted certificate by expiry. The page still shows INSECURE |

## Example {#example}

```json
{
    "monitor_type": "SSL",
    "type_data": {
        "host": "example.com",
        "port": "443",
        "degradedRemainingHours": 168,
        "downRemainingHours": 24,
        "timeout": 10000,
        "allowSelfSignedCert": false
    }
}
```

## Troubleshooting {#troubleshooting}

- **Immediate DOWN**: wrong host/port or TLS unavailable
- **DOWN with "is not trusted"**: the certificate fails verification. Fix the certificate, set `tlsServername` when `host` is an IP, or turn on `allowSelfSignedCert`
- **TIMEOUT**: host unreachable or handshake slower than `timeout`
- **Validation fails**: ensure degraded threshold is strictly greater than down threshold
