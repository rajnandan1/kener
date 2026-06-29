---
title: DNS Monitor
description: Validate DNS records against expected values over UDP or DNS-over-TLS
---

DNS monitors query records for a host and compare returned values to your expected values.

## Minimum setup {#minimum-setup}

Configure:

- `host`
- `lookupRecord` (default `A`)
- `matchType` (`ANY` or `ALL`, default `ANY`)
- at least one expected value in `values`

For UDP transport, `nameServer` is optional (leave blank to walk authoritative nameservers, then fall back to `8.8.8.8`).

For DNS-over-TLS (`transport: "TLS"`), `nameServer` is required.

## Configuration fields {#configuration-fields}

| Field                 | Type          | Default | Notes                                              |
| :-------------------- | :------------ | :------ | :------------------------------------------------- |
| `host`                | `string`      | —       | Required                                           |
| `transport`           | `UDP\|TLS`    | `UDP`   | Query transport                                    |
| `nameServer`          | `string`      | `""`    | Optional for UDP; required for TLS                   |
| `tlsPort`             | `number`      | `853`   | DoT port when `transport` is `TLS`                 |
| `tlsServername`       | `string`      | `""`    | TLS SNI hostname for IP-based DoT resolvers        |
| `allowSelfSignedCert` | `boolean`     | `false` | Disable TLS verification for private DoT resolvers |
| `lookupRecord`        | `string`      | `A`     | Required                                           |
| `matchType`           | `ANY\|ALL`    | `ANY`   | Required                                           |
| `values`              | `string[]`    | `[]`    | Required (non-empty values)                        |

## Transport modes {#transport-modes}

### UDP (default)

Standard DNS over UDP port 53. When `nameServer` is blank, Kener walks authoritative nameservers for the zone before falling back to `8.8.8.8`.

### DNS-over-TLS (DoT)

Encrypted DNS over TCP port 853 (RFC 7858). Queries go directly to the configured resolver — authoritative lookup is not used.

Common public resolvers:

| Resolver | Address   | TLS Server Name     |
| :------- | :-------- | :------------------ |
| Google   | `8.8.8.8` | `dns.google`        |
| Cloudflare | `1.1.1.1` | `cloudflare-dns.com` |
| Quad9    | `9.9.9.9` | `dns.quad9.net`     |

When connecting to an IP address, set `tlsServername` to the provider's hostname if the resolver requires SNI.

## Match behavior {#match-behavior}

- `ANY`: monitor is **UP** when at least one expected value is present
- `ALL`: monitor is **UP** only when all expected values are present

## Normalization rules {#normalization-rules}

Before comparison, values are normalized by runtime logic:

- lowercased
- trailing `.` removed
- trimmed whitespace

## Examples {#examples}

### UDP

```json
{
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "lookupRecord": "A",
        "matchType": "ANY",
        "values": ["93.184.216.34"]
    }
}
```

### DNS-over-TLS

```json
{
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "transport": "TLS",
        "nameServer": "1.1.1.1",
        "tlsPort": 853,
        "tlsServername": "cloudflare-dns.com",
        "lookupRecord": "A",
        "matchType": "ANY",
        "values": ["93.184.216.34"]
    }
}
```

## Troubleshooting {#troubleshooting}

- **Unexpected DOWN**: copy exact record output (after normalization rules)
- **No response**: check `lookupRecord` type and resolver reachability
- **Partial mismatches**: use `ANY` for multi-value dynamic DNS setups
- **DoT TLS errors**: set `tlsServername` when using an IP resolver; enable `allowSelfSignedCert` only for trusted private resolvers
