---
title: SQL Monitor
description: Monitor database connectivity and health by executing queries against your SQL databases
---

SQL monitors verify that your databases are accessible and responding to queries. They support multiple database engines and can execute custom queries to validate not just connectivity but also data integrity and performance.

## How SQL Monitoring Works {#how-sql-monitoring-works}

Kener's SQL monitoring follows this workflow:

1. **Create Connection**: Kener uses Knex.js to establish a connection to your database using the provided connection string.
2. **Execute Query**: The configured SQL query is executed against the database.
3. **Measure Performance**: The total time from connection to query completion is recorded as latency.
4. **Determine Status**: If the query executes successfully, the monitor is UP; any error results in DOWN.
5. **Clean Up**: The database connection is properly closed to prevent resource leaks.

### SQL Check Process {#sql-check-process}

```
┌─────────────┐                      ┌─────────────┐
│   Kener     │ ──── Connection ───► │  Database   │
│   Monitor   │      String          │   Server    │
└─────────────┘                      └─────────────┘
       │                                    │
       │    ┌────────────────────────┐      │
       └────│ Execute SQL Query      │──────┘
            │ e.g., SELECT 1         │
            └────────────────────────┘
                        │
              ┌─────────┴─────────┐
              │                   │
        ┌─────▼─────┐       ┌─────▼─────┐
        │  Success  │       │   Error   │
        │  (Result) │       │ (Timeout/ │
        └─────┬─────┘       │  Failure) │
              │             └─────┬─────┘
              ▼                   ▼
        ┌───────────┐       ┌───────────┐
        │ Status:UP │       │Status:DOWN│
        │ Latency:ms│       │ Type:ERROR│
        └───────────┘       └───────────┘
```

## Configuration Options {#configuration-options}

| Field                 | Type     | Description                                                | Default     |
| :-------------------- | :------- | :--------------------------------------------------------- | :---------- |
| **Database Type**     | `string` | The database engine to connect to.                         | `pg`        |
| **Connection String** | `string` | Database connection URL or connection string.              | (Required)  |
| **Query**             | `string` | SQL query to execute for health check.                     | `SELECT 1`  |
| **Timeout**           | `number` | Maximum time in milliseconds to wait for query completion. | `5000` (5s) |

### Supported Database Types {#supported-database-types}

| Database Type | Value      | Connection String Format                              |
| :------------ | :--------- | :---------------------------------------------------- |
| PostgreSQL    | `pg`       | `postgresql://user:password@host:5432/database`       |
| MySQL         | `mysql2`   | `mysql://user:password@host:3306/database`            |
| SQL Server    | `mssql`    | `Server=host;Database=db;User Id=user;Password=pass;` |
| Oracle        | `oracledb` | `user/password@host:1521/service`                     |
| SQLite        | `sqlite3`  | `/path/to/database.db`                                |

## Status Evaluation Logic {#status-evaluation-logic}

SQL monitors use a simple success/failure evaluation:

```javascript
// Pseudocode for SQL status evaluation
try {
    // Create connection with timeout
    const connection = await createConnection(connectionString, timeout)

    // Execute query with timeout race
    await Promise.race([connection.raw(query), timeout(timeoutMs)])

    return { status: "UP", latency, type: "realtime" }
} catch (error) {
    if (error.message === "Query timeout") {
        return { status: "DOWN", latency, type: "timeout" }
    }
    return { status: "DOWN", latency, type: "error" }
}
```

### Status Conditions {#status-conditions}

| Status   | Type     | Condition                                               |
| :------- | :------- | :------------------------------------------------------ |
| **UP**   | realtime | Query executed successfully within timeout              |
| **DOWN** | timeout  | Query or connection exceeded timeout threshold          |
| **DOWN** | error    | Connection failed, authentication error, or query error |

## Connection String Formats {#connection-string-formats}

### PostgreSQL {#postgresql-connection}

```
postgresql://username:password@hostname:5432/database_name
```

With options:

```
postgresql://username:password@hostname:5432/database_name?sslmode=require
```

### MySQL {#mysql-connection}

```
mysql://username:password@hostname:3306/database_name
```

With options:

```
mysql://username:password@hostname:3306/database_name?ssl=true
```

### SQL Server {#mssql-connection}

Standard format:

```
Server=hostname;Database=database_name;User Id=username;Password=password;
```

With encryption:

```
Server=hostname;Database=database_name;User Id=username;Password=password;Encrypt=true;TrustServerCertificate=true;
```

### Oracle {#oracle-connection}

Easy Connect:

```
username/password@hostname:1521/service_name
```

TNS format:

```
username/password@(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=hostname)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=service_name)))
```

### SQLite {#sqlite-connection}

```
/absolute/path/to/database.db
```

Or relative:

```
./data/database.db
```

## Using Environment Variables {#using-environment-variables}

Kener supports environment variable substitution in connection strings for secure credential management:

```
postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME
```

Environment variables are replaced at runtime:

- `$DB_USER` → value of `process.env.DB_USER`
- `$DB_PASSWORD` → value of `process.env.DB_PASSWORD`

This keeps sensitive credentials out of your configuration.

## Examples {#examples}

### 1. Basic PostgreSQL Health Check {#basic-postgresql-health-check}

Simple connectivity check for PostgreSQL.

```json
{
    "tag": "postgres-main",
    "name": "PostgreSQL Primary",
    "type": "SQL",
    "type_data": {
        "dbType": "pg",
        "connectionString": "postgresql://monitor:$DB_MONITOR_PASS@db.example.com:5432/myapp",
        "query": "SELECT 1",
        "timeout": 5000
    }
}
```

### 2. MySQL Database Monitor {#mysql-database-monitor}

Monitor a MySQL database with SSL.

```json
{
    "tag": "mysql-prod",
    "name": "MySQL Production",
    "type": "SQL",
    "type_data": {
        "dbType": "mysql2",
        "connectionString": "mysql://monitor:$MYSQL_PASS@mysql.example.com:3306/production?ssl=true",
        "query": "SELECT 1",
        "timeout": 5000
    }
}
```

### 3. SQL Server Health Check {#sql-server-health-check}

Monitor Microsoft SQL Server.

```json
{
    "tag": "mssql-main",
    "name": "SQL Server Main",
    "type": "SQL",
    "type_data": {
        "dbType": "mssql",
        "connectionString": "Server=sqlserver.example.com;Database=AppDB;User Id=monitor;Password=$MSSQL_PASS;Encrypt=true;",
        "query": "SELECT 1",
        "timeout": 5000
    }
}
```

### 4. Oracle Database Monitor {#oracle-database-monitor}

Monitor an Oracle database instance.

```json
{
    "tag": "oracle-prod",
    "name": "Oracle Production",
    "type": "SQL",
    "type_data": {
        "dbType": "oracledb",
        "connectionString": "monitor/$ORACLE_PASS@oracle.example.com:1521/PROD",
        "query": "SELECT 1 FROM DUAL",
        "timeout": 10000
    }
}
```

### 5. SQLite Local Database {#sqlite-local-database}

Monitor a local SQLite database.

```json
{
    "tag": "sqlite-app",
    "name": "App SQLite Database",
    "type": "SQL",
    "type_data": {
        "dbType": "sqlite3",
        "connectionString": "/var/lib/myapp/data.db",
        "query": "SELECT 1",
        "timeout": 2000
    }
}
```

### 6. PostgreSQL Read Replica {#postgresql-read-replica}

Monitor read replica with a read query.

```json
{
    "tag": "postgres-replica",
    "name": "PostgreSQL Read Replica",
    "type": "SQL",
    "type_data": {
        "dbType": "pg",
        "connectionString": "postgresql://monitor:$DB_PASS@replica.example.com:5432/myapp",
        "query": "SELECT COUNT(*) FROM pg_stat_activity",
        "timeout": 5000
    }
}
```

## Advanced Query Examples {#advanced-query-examples}

### 7. Check Table Existence {#check-table-existence}

Verify a critical table exists.

**PostgreSQL:**

```json
{
    "tag": "postgres-table-check",
    "name": "Users Table Check",
    "type": "SQL",
    "type_data": {
        "dbType": "pg",
        "connectionString": "postgresql://monitor:$DB_PASS@db.example.com:5432/myapp",
        "query": "SELECT 1 FROM information_schema.tables WHERE table_name = 'users'",
        "timeout": 5000
    }
}
```

**MySQL:**

```json
{
    "tag": "mysql-table-check",
    "name": "Orders Table Check",
    "type": "SQL",
    "type_data": {
        "dbType": "mysql2",
        "connectionString": "mysql://monitor:$DB_PASS@mysql.example.com:3306/shop",
        "query": "SELECT 1 FROM information_schema.tables WHERE table_schema = 'shop' AND table_name = 'orders'",
        "timeout": 5000
    }
}
```

### 8. Check Replication Status {#check-replication-status}

**PostgreSQL - Check if replica is caught up:**

```json
{
    "tag": "postgres-repl-check",
    "name": "Replication Health",
    "type": "SQL",
    "type_data": {
        "dbType": "pg",
        "connectionString": "postgresql://monitor:$DB_PASS@primary.example.com:5432/myapp",
        "query": "SELECT 1 FROM pg_stat_replication WHERE state = 'streaming'",
        "timeout": 5000
    }
}
```

**MySQL - Check slave status:**

```json
{
    "tag": "mysql-repl-check",
    "name": "MySQL Replication",
    "type": "SQL",
    "type_data": {
        "dbType": "mysql2",
        "connectionString": "mysql://monitor:$DB_PASS@replica.example.com:3306/myapp",
        "query": "SELECT 1 WHERE (SELECT Slave_IO_Running FROM performance_schema.replication_connection_status) = 'YES'",
        "timeout": 5000
    }
}
```

### 9. Check Connection Count {#check-connection-count}

**PostgreSQL:**

```json
{
    "tag": "postgres-conn-check",
    "name": "Connection Pool Health",
    "type": "SQL",
    "type_data": {
        "dbType": "pg",
        "connectionString": "postgresql://monitor:$DB_PASS@db.example.com:5432/myapp",
        "query": "SELECT 1 WHERE (SELECT count(*) FROM pg_stat_activity) < 100",
        "timeout": 5000
    }
}
```

### 10. Check Recent Data {#check-recent-data}

Verify data is being written (useful for ETL pipelines).

**PostgreSQL:**

```json
{
    "tag": "data-freshness",
    "name": "Data Pipeline Health",
    "type": "SQL",
    "type_data": {
        "dbType": "pg",
        "connectionString": "postgresql://monitor:$DB_PASS@db.example.com:5432/analytics",
        "query": "SELECT 1 FROM events WHERE created_at > NOW() - INTERVAL '1 hour' LIMIT 1",
        "timeout": 10000
    }
}
```

### 11. Check Database Size {#check-database-size}

Verify database isn't full.

**PostgreSQL:**

```json
{
    "tag": "db-size-check",
    "name": "Database Size Check",
    "type": "SQL",
    "type_data": {
        "dbType": "pg",
        "connectionString": "postgresql://monitor:$DB_PASS@db.example.com:5432/myapp",
        "query": "SELECT 1 WHERE pg_database_size(current_database()) < 100000000000",
        "timeout": 10000
    }
}
```

### 12. Check Long-Running Queries {#check-long-running-queries}

Alert if queries are running too long.

**PostgreSQL:**

```json
{
    "tag": "long-query-check",
    "name": "Long Query Monitor",
    "type": "SQL",
    "type_data": {
        "dbType": "pg",
        "connectionString": "postgresql://monitor:$DB_PASS@db.example.com:5432/myapp",
        "query": "SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes' AND query NOT LIKE '%pg_stat_activity%')",
        "timeout": 5000
    }
}
```

## Common Health Check Queries {#common-health-check-queries}

### Simple Connectivity {#queries-connectivity}

| Database   | Query                | Notes               |
| :--------- | :------------------- | :------------------ |
| PostgreSQL | `SELECT 1`           | Simplest check      |
| MySQL      | `SELECT 1`           | Simplest check      |
| SQL Server | `SELECT 1`           | Simplest check      |
| Oracle     | `SELECT 1 FROM DUAL` | DUAL table required |
| SQLite     | `SELECT 1`           | Simplest check      |

### Version Check {#queries-version}

| Database   | Query                     | Returns             |
| :--------- | :------------------------ | :------------------ |
| PostgreSQL | `SELECT version()`        | Full version string |
| MySQL      | `SELECT VERSION()`        | Version number      |
| SQL Server | `SELECT @@VERSION`        | Full version info   |
| Oracle     | `SELECT * FROM V$VERSION` | Component versions  |
| SQLite     | `SELECT sqlite_version()` | SQLite version      |

### Database Status {#queries-status}

| Database   | Query                                           | Purpose          |
| :--------- | :---------------------------------------------- | :--------------- |
| PostgreSQL | `SELECT pg_is_in_recovery()`                    | Check if replica |
| MySQL      | `SHOW STATUS LIKE 'Uptime'`                     | Server uptime    |
| SQL Server | `SELECT DATABASEPROPERTYEX('dbname', 'Status')` | Database state   |

## Best Practices {#best-practices}

### Connection String Security {#best-practices-security}

1. **Use environment variables**: Never hardcode passwords in configuration.
2. **Create monitor users**: Use dedicated read-only accounts for monitoring.
3. **Limit permissions**: Monitor accounts should only have SELECT privilege.
4. **Use SSL/TLS**: Enable encryption for database connections.

### Query Design {#best-practices-queries}

1. **Keep queries simple**: `SELECT 1` is sufficient for basic connectivity.
2. **Avoid heavy queries**: Don't impact production performance.
3. **Use timeouts**: Always set appropriate timeouts.
4. **Test queries first**: Verify queries work before configuring monitors.

### Timeout Configuration {#best-practices-timeout}

| Scenario        | Recommended Timeout | Rationale                |
| :-------------- | :------------------ | :----------------------- |
| Local database  | 2000-3000ms         | Fast local connections   |
| Same datacenter | 5000ms              | Standard network latency |
| Cross-region    | 10000ms             | Higher latency expected  |
| Complex queries | 15000-30000ms       | Query execution time     |

### Monitor User Permissions {#best-practices-permissions}

**PostgreSQL:**

```sql
CREATE USER kener_monitor WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE myapp TO kener_monitor;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO kener_monitor;
```

**MySQL:**

```sql
CREATE USER 'kener_monitor'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT ON myapp.* TO 'kener_monitor'@'%';
FLUSH PRIVILEGES;
```

**SQL Server:**

```sql
CREATE LOGIN kener_monitor WITH PASSWORD = 'secure_password';
CREATE USER kener_monitor FOR LOGIN kener_monitor;
GRANT SELECT TO kener_monitor;
```

## Troubleshooting {#troubleshooting}

### Common Issues {#common-issues}

| Issue                 | Possible Cause                         | Solution                                |
| :-------------------- | :------------------------------------- | :-------------------------------------- |
| Connection refused    | Wrong host/port or firewall            | Verify network connectivity             |
| Authentication failed | Wrong credentials                      | Check username/password                 |
| Timeout               | Slow network or overloaded database    | Increase timeout or optimize database   |
| SSL required          | Database requires encrypted connection | Add SSL parameters to connection string |
| Database not found    | Wrong database name                    | Verify database exists                  |
| Permission denied     | Monitor user lacks privileges          | Grant required permissions              |

### Debug Tips {#debug-tips}

1. **Test connection manually**:

    ```bash
    # PostgreSQL
    psql "postgresql://user:pass@host:5432/db"

    # MySQL
    mysql -h host -u user -p database

    # SQL Server
    sqlcmd -S host -U user -P password -d database
    ```

2. **Check database logs**: Look for connection attempts and errors.

3. **Verify network path**: Ensure Kener can reach the database server.

4. **Test from Kener host**: Run queries from the same machine running Kener.

### Latency Interpretation {#latency-interpretation}

SQL monitor latency includes:

- DNS resolution
- TCP connection establishment
- TLS handshake (if SSL enabled)
- Authentication
- Query execution
- Result retrieval

Typical latencies for `SELECT 1`:

| Scenario        | Expected Latency |
| :-------------- | :--------------- |
| Local database  | 1-10ms           |
| Same datacenter | 5-30ms           |
| Cross-region    | 50-150ms         |
| Cross-continent | 100-300ms        |

High latency may indicate:

- Network congestion
- Database overload
- Connection pool exhaustion
- Slow authentication (LDAP, etc.)
