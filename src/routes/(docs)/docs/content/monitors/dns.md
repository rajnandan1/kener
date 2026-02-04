---
title: DNS Monitor
description: Monitor DNS record resolution and verify that your domains resolve to expected values
---

DNS monitors verify that your domain's DNS records resolve correctly by querying a specified name server and comparing the results against expected values. This is essential for detecting DNS misconfigurations, hijacking attempts, propagation issues, or CDN/load balancer changes.

## How DNS Monitoring Works {#how-dns-monitoring-works}

Kener's DNS monitoring follows this workflow:

1. **Query DNS Server**: Kener sends a DNS query to the configured name server (e.g., `8.8.8.8`) for a specific record type.
2. **Receive Response**: The DNS server returns all records matching the query (domain + record type).
3. **Extract Data**: Kener extracts the relevant data from each DNS answer based on the record type.
4. **Compare Values**: The returned values are compared against your expected values using the configured match type.
5. **Determine Status**: Based on whether the expected values are found, the monitor is marked as UP or DOWN.

### DNS Query Process {#dns-query-process}

```
┌─────────────┐      DNS Query       ┌─────────────┐
│   Kener     │ ──────────────────── │  Name Server │
│   Monitor   │    (UDP Port 53)     │  (8.8.8.8)   │
└─────────────┘                      └─────────────┘
       │                                    │
       │    ┌────────────────────────┐      │
       └────│ Query: example.com A   │──────┘
            └────────────────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │ Response:              │
            │ - 93.184.216.34        │
            │ - TTL: 3600            │
            └────────────────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │ Compare with expected  │
            │ values using match type│
            └────────────────────────┘
```

## Configuration Options {#configuration-options}

| Field             | Type     | Description                                                         | Default    |
| :---------------- | :------- | :------------------------------------------------------------------ | :--------- |
| **Host**          | `string` | The domain name to query (e.g., `example.com`).                     | (Required) |
| **Name Server**   | `string` | The DNS server to query. Can be any public or private DNS resolver. | `8.8.8.8`  |
| **Lookup Record** | `string` | The DNS record type to query (A, AAAA, CNAME, MX, TXT, etc.).       | `A`        |
| **Match Type**    | `string` | How to compare expected values: `ALL` or `ANY`.                     | `ANY`      |
| **Values**        | `array`  | List of expected values that the DNS response should contain.       | (Required) |

### Match Type Behavior {#match-type-behavior}

| Match Type | Behavior                                                    | Status UP When               |
| :--------- | :---------------------------------------------------------- | :--------------------------- |
| **ANY**    | At least one expected value must be present in the response | Any expected value matches   |
| **ALL**    | All expected values must be present in the response         | Every expected value matches |

## Supported Record Types {#supported-record-types}

Kener supports a comprehensive set of DNS record types. Here are the most commonly used:

### Common Record Types {#common-record-types}

| Record    | Description                           | Example Data                          |
| :-------- | :------------------------------------ | :------------------------------------ |
| **A**     | IPv4 address                          | `93.184.216.34`                       |
| **AAAA**  | IPv6 address                          | `2606:2800:220:1:248:1893:25c8:1946`  |
| **CNAME** | Canonical name (alias)                | `www.example.com`                     |
| **MX**    | Mail exchange server                  | `mail.example.com` (with priority)    |
| **TXT**   | Text record (SPF, DKIM, verification) | `v=spf1 include:_spf.google.com ~all` |
| **NS**    | Name server                           | `ns1.example.com`                     |
| **SOA**   | Start of authority                    | Primary NS, admin email, serial, etc. |
| **PTR**   | Pointer record (reverse DNS)          | `hostname.example.com`                |
| **SRV**   | Service location                      | `_sip._tcp.example.com`               |

### Additional Supported Types {#additional-record-types}

Kener also supports these record types: `MD`, `MF`, `MB`, `MG`, `MR`, `NULL`, `WKS`, `HINFO`, `MINFO`, `RP`, `AFSDB`, `X25`, `ISDN`, `RT`, `NSAP`, `NSAP_PTR`, `SIG`, `KEY`, `PX`, `GPOS`, `LOC`, `NXT`, `EID`, `NIMLOC`, `ATMA`, `NAPTR`, `KX`, `CERT`, `A6`, `DNAME`, `SINK`, `OPT`, `APL`, `DS`, `SSHFP`, `IPSECKEY`, `RRSIG`, `NSEC`, `DNSKEY`, `DHCID`, `NSEC3`, `NSEC3PARAM`, `TLSA`, `SMIMEA`, `HIP`, `NINFO`, `RKEY`, `TALINK`, `CDS`, `CDNSKEY`, `OPENPGPKEY`, `CSYNC`, `SPF`, `UINFO`, `UID`, `GID`, `UNSPEC`, `NID`, `L32`, `L64`, `LP`, `EUI48`, `EUI64`, `TKEY`, `TSIG`, `IXFR`, `AXFR`, `MAILB`, `MAILA`, `ANY`.

## DNS Response Structure {#dns-response-structure}

When Kener queries a DNS record, it receives answers with this structure:

```javascript
{
  name: "example.com",    // Domain queried
  type: "A",              // Record type
  ttl: 3600,              // Time-to-live in seconds
  data: "93.184.216.34"   // The actual record value
}
```

### Data Extraction by Record Type {#data-extraction}

Different record types return data in different formats:

| Record Type     | Data Returned                         |
| :-------------- | :------------------------------------ |
| **A**, **AAAA** | IP address as string                  |
| **NS**          | Name server hostname                  |
| **CNAME**       | Canonical domain name                 |
| **MX**          | Object with `exchange` and `priority` |
| **TXT**         | Text content                          |
| **Others**      | Raw data from DNS response            |

## Evaluation Logic {#evaluation-logic}

Unlike other monitor types, DNS monitors use a fixed evaluation logic based on the **Match Type** setting:

### ANY Match Logic {#any-match-logic}

```javascript
// Pseudocode for ANY match
for (let expectedValue of expectedValues) {
    if (dnsResponse.includes(expectedValue)) {
        return { status: "UP", latency: queryTime }
    }
}
return { status: "DOWN", latency: queryTime }
```

**Use Case**: When your domain can resolve to multiple IPs (CDN, load balancer) and any one is acceptable.

### ALL Match Logic {#all-match-logic}

```javascript
// Pseudocode for ALL match
for (let expectedValue of expectedValues) {
    if (!dnsResponse.includes(expectedValue)) {
        return { status: "DOWN", latency: queryTime }
    }
}
return { status: "UP", latency: queryTime }
```

**Use Case**: When you need to verify that specific records exist, such as ensuring all required TXT records for email authentication are present.

## Examples {#examples}

### 1. Basic A Record Check {#basic-a-record-check}

Verify that a domain resolves to a specific IP address.

```json
{
    "tag": "website-dns",
    "name": "Website DNS",
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "A",
        "matchType": "ANY",
        "values": ["93.184.216.34"]
    }
}
```

### 2. Multiple IP Addresses (CDN/Load Balancer) {#multiple-ip-addresses}

Monitor a domain that may resolve to any of several IPs.

```json
{
    "tag": "cdn-dns",
    "name": "CDN DNS Resolution",
    "type": "DNS",
    "type_data": {
        "host": "cdn.example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "A",
        "matchType": "ANY",
        "values": ["104.16.123.96", "104.16.124.96", "104.16.125.96"]
    }
}
```

### 3. IPv6 (AAAA) Record Check {#ipv6-record-check}

Verify IPv6 resolution for your domain.

```json
{
    "tag": "ipv6-dns",
    "name": "IPv6 DNS",
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "AAAA",
        "matchType": "ANY",
        "values": ["2606:2800:220:1:248:1893:25c8:1946"]
    }
}
```

### 4. CNAME Record Verification {#cname-record-verification}

Ensure a subdomain points to the correct canonical name.

```json
{
    "tag": "www-cname",
    "name": "WWW CNAME Record",
    "type": "DNS",
    "type_data": {
        "host": "www.example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "CNAME",
        "matchType": "ANY",
        "values": ["example.com"]
    }
}
```

### 5. MX Record Monitoring {#mx-record-monitoring}

Verify mail server configuration. Note: MX records return the exchange server hostname.

```json
{
    "tag": "mail-dns",
    "name": "Email MX Records",
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "MX",
        "matchType": "ANY",
        "values": ["mail.example.com"]
    }
}
```

### 6. TXT Record for SPF Verification {#txt-spf-verification}

Monitor that your SPF record is correctly configured.

```json
{
    "tag": "spf-record",
    "name": "SPF Record",
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "TXT",
        "matchType": "ANY",
        "values": ["v=spf1 include:_spf.google.com ~all"]
    }
}
```

### 7. Domain Verification TXT Record {#domain-verification-txt}

Ensure domain verification records are present (Google, Microsoft, etc.).

```json
{
    "tag": "google-verification",
    "name": "Google Site Verification",
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "TXT",
        "matchType": "ANY",
        "values": ["google-site-verification=abc123xyz"]
    }
}
```

### 8. NS Record Monitoring {#ns-record-monitoring}

Verify that your domain is using the correct name servers.

```json
{
    "tag": "nameservers",
    "name": "Name Servers",
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "NS",
        "matchType": "ALL",
        "values": ["ns1.example.com", "ns2.example.com"]
    }
}
```

### 9. Multiple Required TXT Records {#multiple-txt-records}

Ensure all required TXT records exist (SPF, DKIM, DMARC verification).

```json
{
    "tag": "email-auth-records",
    "name": "Email Authentication DNS",
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "TXT",
        "matchType": "ALL",
        "values": ["v=spf1 include:_spf.google.com ~all", "google-site-verification=abc123"]
    }
}
```

### 10. Using Custom/Private DNS Server {#custom-dns-server}

Query an internal DNS server for private domain resolution.

```json
{
    "tag": "internal-dns",
    "name": "Internal Service DNS",
    "type": "DNS",
    "type_data": {
        "host": "api.internal.company.com",
        "nameServer": "10.0.0.53",
        "lookupRecord": "A",
        "matchType": "ANY",
        "values": ["10.0.1.100"]
    }
}
```

### 11. Cloudflare DNS Check {#cloudflare-dns-check}

Verify your domain is proxied through Cloudflare.

```json
{
    "tag": "cloudflare-proxy",
    "name": "Cloudflare Proxy",
    "type": "DNS",
    "type_data": {
        "host": "example.com",
        "nameServer": "1.1.1.1",
        "lookupRecord": "A",
        "matchType": "ANY",
        "values": ["104.21.x.x", "172.67.x.x"]
    }
}
```

### 12. SRV Record for Services {#srv-record-services}

Monitor SRV records used for service discovery.

```json
{
    "tag": "sip-srv",
    "name": "SIP Service Record",
    "type": "DNS",
    "type_data": {
        "host": "_sip._tcp.example.com",
        "nameServer": "8.8.8.8",
        "lookupRecord": "SRV",
        "matchType": "ANY",
        "values": ["sip.example.com"]
    }
}
```

## Common Use Cases {#common-use-cases}

### Website & Application Monitoring {#use-case-websites}

| Scenario                 | Record Type | Match Type | Purpose                                     |
| :----------------------- | :---------- | :--------- | :------------------------------------------ |
| Single IP website        | A           | ANY        | Verify domain resolves to expected IP       |
| Multi-region/CDN website | A           | ANY        | Confirm resolution to any valid edge server |
| IPv6-enabled service     | AAAA        | ANY        | Monitor IPv6 accessibility                  |
| Subdomain alias          | CNAME       | ANY        | Verify subdomain points correctly           |

### Email Infrastructure {#use-case-email}

| Scenario      | Record Type | Match Type | Purpose                             |
| :------------ | :---------- | :--------- | :---------------------------------- |
| Mail server   | MX          | ANY        | Ensure mail routing is correct      |
| SPF record    | TXT         | ANY        | Verify sender authentication        |
| DKIM selector | TXT         | ANY        | Confirm email signing is configured |
| DMARC policy  | TXT         | ANY        | Monitor email policy record         |

### Infrastructure & Security {#use-case-infrastructure}

| Scenario               | Record Type | Match Type | Purpose                                    |
| :--------------------- | :---------- | :--------- | :----------------------------------------- |
| Name server delegation | NS          | ALL        | Verify all NS records are present          |
| Domain verification    | TXT         | ANY        | Confirm third-party verifications          |
| CAA records            | CAA         | ANY        | Monitor certificate authority restrictions |
| Reverse DNS            | PTR         | ANY        | Verify reverse lookup configuration        |

## Popular DNS Servers {#popular-dns-servers}

You can use any DNS server for monitoring. Here are some popular public options:

| Provider         | Primary DNS      | Secondary DNS     | Notes                            |
| :--------------- | :--------------- | :---------------- | :------------------------------- |
| Google           | `8.8.8.8`        | `8.8.4.4`         | Reliable, global coverage        |
| Cloudflare       | `1.1.1.1`        | `1.0.0.1`         | Fast, privacy-focused            |
| Quad9            | `9.9.9.9`        | `149.112.112.112` | Security-focused, blocks malware |
| OpenDNS          | `208.67.222.222` | `208.67.220.220`  | Cisco-owned, filtering options   |
| Authoritative NS | (varies)         | -                 | Direct query to domain's NS      |

### Choosing a Name Server {#choosing-nameserver}

- **Public DNS (8.8.8.8, 1.1.1.1)**: Good for general monitoring; may have caching delays.
- **Authoritative NS**: Query the domain's own name servers for most accurate results.
- **Private DNS**: Use internal DNS for monitoring private/internal domains.

## Best Practices {#best-practices}

### Record Type Selection {#best-practices-record-type}

1. **Monitor the record type you depend on**: If your app uses IPv6, monitor AAAA records.
2. **Include email records**: Monitor MX, SPF, DKIM for email-dependent services.
3. **Check CNAME chains**: If you use CNAME records, monitor them separately.

### Value Configuration {#best-practices-values}

1. **Use exact values**: DNS comparisons are exact string matches.
2. **Account for multiple records**: CDNs and load balancers often return multiple IPs.
3. **Update after changes**: Remember to update expected values after DNS changes.

### Match Type Selection {#best-practices-match-type}

1. **ANY for redundant systems**: Use when any one of several IPs is acceptable.
2. **ALL for critical records**: Use when all specified records must exist.
3. **Start with ANY**: It's more forgiving for dynamic DNS environments.

### Name Server Selection {#best-practices-nameserver}

1. **Use multiple monitors**: Monitor from different DNS servers for comprehensive coverage.
2. **Consider caching**: Public DNS servers cache results; authoritative NS gives real-time data.
3. **Match your users**: Use the same DNS servers your users likely use.

## Troubleshooting {#troubleshooting}

### Common Issues {#common-issues}

| Issue                           | Possible Cause                            | Solution                                       |
| :------------------------------ | :---------------------------------------- | :--------------------------------------------- |
| Always DOWN with correct values | Exact value mismatch (whitespace, case)   | Copy exact value from DNS lookup tool          |
| Intermittent failures           | DNS propagation in progress               | Wait for propagation or query authoritative NS |
| Timeout errors                  | Name server unreachable                   | Check network connectivity, try different NS   |
| No records returned             | Wrong record type or domain doesn't exist | Verify record type and domain spelling         |
| MX record mismatch              | Expecting IP but MX returns hostname      | Use the mail server hostname, not IP           |

### Debug Tips {#debug-tips}

1. **Verify with dig/nslookup**:

    ```bash
    dig @8.8.8.8 example.com A
    dig @8.8.8.8 example.com TXT
    nslookup -type=MX example.com 8.8.8.8
    ```

2. **Check exact response values**: DNS responses must match exactly. Use quotes around TXT records.

3. **Query authoritative NS**: Find and query the authoritative name server directly:

    ```bash
    dig NS example.com
    dig @ns1.example.com example.com A
    ```

4. **Monitor DNS propagation**: Use tools like [dnschecker.org](https://dnschecker.org) to verify global propagation.

### Latency Considerations {#latency-considerations}

DNS query latency depends on:

- **Distance to name server**: Closer servers respond faster.
- **DNS server load**: Public DNS servers may have variable response times.
- **Record complexity**: Some record types require additional lookups.
- **Network conditions**: UDP packets may be delayed or lost.

Typical DNS query times:

- Local/cached: 1-10ms
- Same region: 10-50ms
- Cross-region: 50-200ms
- Cross-continent: 100-300ms
