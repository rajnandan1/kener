---
title: DNS Monitor
description: Validate DNS records against expected values
---

DNS monitors query records for a host and compare returned values to your expected values.

## Minimum setup {#minimum-setup}

Configure:

- `host`
- `lookupRecord` (default `A`)
- `matchType` (`ANY` or `ALL`, default `ANY`)
- at least one expected value in `values`

`nameServer` is optional (leave blank for resolver defaults).

## Configuration fields {#configuration-fields}

| Field          | Type       | Default | Notes                       |
| :------------- | :--------- | :------ | :-------------------------- |
| `host`         | `string`   | —       | Required                    |
| `nameServer`   | `string`   | `""`    | Optional override           |
| `lookupRecord` | `string`   | `A`     | Required                    |
| `matchType`    | `ANY\|ALL` | `ANY`   | Required                    |
| `values`       | `string[]` | `[]`    | Required (non-empty values) |

## Match behavior {#match-behavior}

- `ANY`: monitor is **UP** when at least one expected value is present
- `ALL`: monitor is **UP** only when all expected values are present

## Normalization rules {#normalization-rules}

Before comparison, values are normalized by runtime logic:

- lowercased
- trailing `.` removed
- trimmed whitespace

## Example {#example}

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

## Troubleshooting {#troubleshooting}

- **Unexpected DOWN**: copy exact record output (after normalization rules)
- **No response**: check `lookupRecord` type and resolver reachability
- **Partial mismatches**: use `ANY` for multi-value dynamic DNS setups
