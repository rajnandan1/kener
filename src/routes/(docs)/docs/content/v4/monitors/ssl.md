---
title: SSL Monitor
description: Monitor TLS certificate expiry with degraded/down thresholds
---

SSL monitors open a TLS connection, read the peer certificate expiry date, and map remaining time to monitor status.

The stored metric (shown as “latency” on charts) is **milliseconds until expiry**, not TLS handshake RTT — so the trend chart is a certificate countdown.

Successful checks also return:

- `expiry_at` — absolute expiry (ISO)
- `issuer_cn` — issuer Common Name
- `issuer_o` — issuer Organization

On DEGRADED/DOWN, the issuer is appended to `error_message` (e.g. `Issued by CN=R3, O=Let's Encrypt`) so it appears in logs and alerts.

## Minimum setup {#minimum-setup}

Set:

- `host` (domain or IP)
- `port` (default `443`)
- `degradedRemainingHours` (default `168`)
- `downRemainingHours` (default `24`)

Optional:

- `timeout` (ms, default `10000`)
- `tlsServername` (SNI override; useful when `host` is an IP)
- `allowSelfSignedCert` (default `false`) — skip chain verification so expiry can still be read for self-signed or already-expired certificates

`degradedRemainingHours` must be greater than `downRemainingHours`.

## Status logic {#status-logic}

Let `hours` = hours until certificate expiry:

- `hours > degradedRemainingHours` → **UP**
- `downRemainingHours < hours <= degradedRemainingHours` → **DEGRADED**
- `hours <= downRemainingHours` → **DOWN**

Connection/certificate retrieval errors also return **DOWN** (`ERROR`). Handshake timeouts return **DOWN** (`TIMEOUT`).

## Configuration fields {#configuration-fields}

| Field                    | Type      | Default | Notes                                              |
| :----------------------- | :-------- | :------ | :------------------------------------------------- |
| `host`                   | `string`  | —       | Required (domain or IP)                            |
| `port`                   | `string`  | `443`   | Numeric string accepted                            |
| `degradedRemainingHours` | `number`  | `168`   | Must be > `downRemainingHours`                     |
| `downRemainingHours`     | `number`  | `24`    |                                                    |
| `timeout`                | `number`  | `10000` | TLS handshake timeout in milliseconds              |
| `tlsServername`          | `string`  | —       | Optional SNI; defaults to `host` when it is a name |
| `allowSelfSignedCert`    | `boolean` | `false` | Skip TLS certificate verification                  |

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
- **TIMEOUT**: host unreachable or handshake slower than `timeout`
- **Validation fails**: ensure degraded threshold is strictly greater than down threshold
- **Unexpected expiry result**: set `tlsServername` when checking an IP, or enable `allowSelfSignedCert` for untrusted chains
