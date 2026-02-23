---
title: SQL Monitor
description: Monitor database connectivity by running SQL queries
---

SQL monitors open a DB connection with Knex, execute your query, and mark status by success/failure.

## Minimum setup {#minimum-setup}

Set:

- `dbType`
- `connectionString`
- `query` (default `SELECT 1`)
- `timeout` (default `5000` ms)

## Runtime behavior {#runtime-behavior}

- Successful query within timeout → **UP**
- Query timeout → **DOWN** (`type: TIMEOUT`)
- Connection/query error → **DOWN** (`type: ERROR`)

## Configuration fields {#configuration-fields}

| Field              | Type                                   | Default    | Notes                         |
| :----------------- | :------------------------------------- | :--------- | :---------------------------- |
| `dbType`           | `pg\|mysql2\|mssql\|oracledb\|sqlite3` | `pg`       | Runtime supports these values |
| `connectionString` | `string`                               | —          | Required                      |
| `query`            | `string`                               | `SELECT 1` | Required                      |
| `timeout`          | `number`                               | `5000`     | Required                      |

> [!IMPORTANT]
> Current monitor form validation requires the connection string to start with `postgresql://` or `mysql://`.

## Example {#example}

```json
{
    "type": "SQL",
    "type_data": {
        "dbType": "pg",
        "connectionString": "postgresql://monitor:$DB_PASSWORD@db.example.com:5432/app",
        "query": "SELECT 1",
        "timeout": 5000
    }
}
```

## Troubleshooting {#troubleshooting}

- **Timeout**: increase timeout or optimize query/network path
- **Auth/connection errors**: verify driver type + connection string + credentials
- **Permission errors**: use a monitor user with minimum required read access
