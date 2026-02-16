---
title: TCP Monitor
description: Monitor TCP port availability and connectivity with customizable host configurations and evaluation logic
---

TCP monitors check whether services are accepting connections on specific ports by attempting to establish TCP connections. This is ideal for monitoring databases, mail servers, game servers, custom applications, or any network service that listens on a TCP port.

## How TCP Monitoring Works {#how-tcp-monitoring-works}

Kener's TCP monitoring follows this workflow:

1. **Connection Attempt**: For each host in your configuration, Kener creates a TCP socket and attempts to connect to the specified host and port.
2. **Measure Latency**: Using high-precision timing (`process.hrtime`), Kener measures exactly how long the connection takes in milliseconds.
3. **Determine Connection Status**: Each connection attempt results in one of three states:
    - `open`: Connection established successfully
    - `timeout`: Connection attempt exceeded the specified timeout
    - `error`: Connection failed (refused, unreachable, DNS failure, etc.)
4. **Aggregate Results**: All connection results are collected into an array.
5. **Evaluate Status**: The custom eval function receives the array and determines the final monitor status.

## Configuration Options {#configuration-options}

| Field           | Type       | Description                                                                  | Default       |
| :-------------- | :--------- | :--------------------------------------------------------------------------- | :------------ |
| **Hosts**       | `array`    | Array of TCP host objects to check. Each host can have independent settings. | (Required)    |
| **Custom Eval** | `function` | A JavaScript function to evaluate connection results and determine status.   | Default logic |

### Host Object Properties {#host-object-properties}

Each host in the `hosts` array supports the following properties:

| Property    | Type     | Description                                                                    | Default    |
| :---------- | :------- | :----------------------------------------------------------------------------- | :--------- |
| **type**    | `string` | IP version to use. `"tcp"` for IPv4 or `"IP6"` for IPv6.                       | `"tcp"`    |
| **host**    | `string` | Hostname or IP address of the target server.                                   | (Required) |
| **port**    | `number` | TCP port number to connect to (1-65535).                                       | `80`       |
| **timeout** | `number` | Maximum time in milliseconds to wait for connection before marking as timeout. | `1000`     |

## TCP Connection Result Structure {#tcp-connection-result-structure}

Each TCP connection attempt returns an object with the following structure:

```javascript
{
  status: "open",        // "open", "timeout", or "error"
  latency: 45.23,        // Connection time in milliseconds (high precision)
  host: "db.example.com", // Target hostname
  port: 5432,            // Target port
  type: "tcp"            // IP version used ("tcp" for IPv4, "IP6" for IPv6)
}
```

### Status Values Explained {#status-values-explained}

| Status      | Meaning                                                                                        |
| :---------- | :--------------------------------------------------------------------------------------------- |
| `"open"`    | Connection succeeded. The port is accepting connections and the service is likely running.     |
| `"timeout"` | Connection attempt exceeded the timeout value. Service may be slow or firewall is blocking.    |
| `"error"`   | Connection failed immediately. Port may be closed, host unreachable, or DNS resolution failed. |

### Connection Timing {#connection-timing}

Kener uses Node.js `process.hrtime.bigint()` for nanosecond-precision timing, which is then converted to milliseconds. This ensures accurate latency measurements even for very fast local connections.

## Custom Evaluation {#custom-evaluation}

The evaluation function allows you to define custom logic for determining monitor status based on TCP connection results from multiple hosts.

### Function Signature {#function-signature}

```javascript
;(async function (arrayOfPings) {
    // Your evaluation logic
    return {
        status: "UP" | "DOWN" | "DEGRADED",
        latency: number
    }
})
```

### Parameters {#parameters}

- `arrayOfPings` (`array`): Array of TCP connection result objects, one for each host configured.

### Return Value {#return-value}

The function can be **synchronous** or **asynchronous** (using `async` or returning a `Promise`). It **must** return (or resolve to) an object with:

- `status`: `'UP'`, `'DEGRADED'`, `'DOWN'`, or `'MAINTENANCE'`.
- `latency`: The latency to record in milliseconds.

### Default Implementation {#default-implementation}

Here is the default logic used if you don't provide a custom function:

```javascript
;(async function (arrayOfPings) {
    let latencyTotal = arrayOfPings.reduce((acc, ping) => {
        return acc + ping.latency
    }, 0)

    let alive = arrayOfPings.reduce((acc, ping) => {
        return acc && ping.status === "open"
    }, true)

    return {
        status: alive ? "UP" : "DOWN",
        latency: latencyTotal / arrayOfPings.length
    }
})
```

**Default Behavior:**

- **UP**: All hosts have `status === "open"`
- **DOWN**: Any host has a status other than `"open"` (timeout or error)
- **Latency**: Average of all connection times

## Examples {#examples}

### 1. Basic Single Port Check {#basic-single-port-check}

Monitor a single web server on port 80.

```json
{
    "tag": "web-server",
    "name": "Web Server",
    "type": "TCP",
    "type_data": {
        "hosts": [
            {
                "type": "tcp",
                "host": "www.example.com",
                "port": 80,
                "timeout": 2000
            }
        ]
    }
}
```

### 2. Database Server Monitoring {#database-server-monitoring}

Monitor a PostgreSQL database on its default port.

```json
{
    "tag": "postgres-db",
    "name": "PostgreSQL Database",
    "type": "TCP",
    "type_data": {
        "hosts": [
            {
                "type": "tcp",
                "host": "db.example.com",
                "port": 5432,
                "timeout": 3000
            }
        ]
    }
}
```

### 3. Multiple Services on Same Host {#multiple-services-same-host}

Monitor multiple services running on the same server (web, SSH, database).

```json
{
    "tag": "app-server-services",
    "name": "Application Server",
    "type": "TCP",
    "type_data": {
        "hosts": [
            {
                "type": "tcp",
                "host": "app.example.com",
                "port": 443,
                "timeout": 2000
            },
            {
                "type": "tcp",
                "host": "app.example.com",
                "port": 22,
                "timeout": 2000
            },
            {
                "type": "tcp",
                "host": "app.example.com",
                "port": 3306,
                "timeout": 3000
            }
        ]
    }
}
```

### 4. Redis Cluster Monitoring {#redis-cluster-monitoring}

Monitor all nodes in a Redis cluster.

```json
{
    "tag": "redis-cluster",
    "name": "Redis Cluster",
    "type": "TCP",
    "type_data": {
        "hosts": [
            {
                "type": "tcp",
                "host": "redis-node-1.example.com",
                "port": 6379,
                "timeout": 1000
            },
            {
                "type": "tcp",
                "host": "redis-node-2.example.com",
                "port": 6379,
                "timeout": 1000
            },
            {
                "type": "tcp",
                "host": "redis-node-3.example.com",
                "port": 6379,
                "timeout": 1000
            }
        ]
    }
}
```

### 5. IPv6 Service Monitoring {#ipv6-service-monitoring}

Monitor a service over IPv6.

```json
{
    "tag": "ipv6-service",
    "name": "IPv6 Web Server",
    "type": "TCP",
    "type_data": {
        "hosts": [
            {
                "type": "IP6",
                "host": "2001:db8::1",
                "port": 443,
                "timeout": 2000
            }
        ]
    }
}
```

### 6. Game Server Monitoring {#game-server-monitoring}

Monitor a Minecraft server's query port.

```json
{
    "tag": "minecraft-server",
    "name": "Minecraft Server",
    "type": "TCP",
    "type_data": {
        "hosts": [
            {
                "type": "tcp",
                "host": "mc.example.com",
                "port": 25565,
                "timeout": 5000
            }
        ]
    }
}
```

## Advanced Evaluation Examples {#advanced-evaluation-examples}

### 7. Quorum-Based Status (Majority Must Be Up) {#quorum-based-status}

For distributed systems where you need at least a majority of nodes responding.

```javascript
;(async function (arrayOfPings) {
    let openCount = 0
    let latencyTotal = 0

    for (let ping of arrayOfPings) {
        if (ping.status === "open") {
            openCount++
            latencyTotal += ping.latency
        }
    }

    const totalHosts = arrayOfPings.length
    const majority = Math.floor(totalHosts / 2) + 1
    const avgLatency = openCount > 0 ? latencyTotal / openCount : 0

    if (openCount === totalHosts) {
        return { status: "UP", latency: avgLatency }
    } else if (openCount >= majority) {
        return { status: "DEGRADED", latency: avgLatency }
    } else {
        return { status: "DOWN", latency: avgLatency }
    }
})
```

### 8. Latency Threshold Evaluation {#latency-threshold-evaluation}

Mark service as degraded if latency exceeds a threshold, even if connection succeeds.

```javascript
;(async function (arrayOfPings) {
    const LATENCY_THRESHOLD = 100 // milliseconds

    let allOpen = true
    let latencyTotal = 0
    let hasHighLatency = false

    for (let ping of arrayOfPings) {
        if (ping.status !== "open") {
            allOpen = false
        } else {
            latencyTotal += ping.latency
            if (ping.latency > LATENCY_THRESHOLD) {
                hasHighLatency = true
            }
        }
    }

    const avgLatency = latencyTotal / arrayOfPings.length

    if (!allOpen) {
        return { status: "DOWN", latency: avgLatency }
    } else if (hasHighLatency) {
        return { status: "DEGRADED", latency: avgLatency }
    } else {
        return { status: "UP", latency: avgLatency }
    }
})
```

### 9. Primary/Secondary Failover Check {#primary-secondary-failover}

Check if primary is up; if not, verify secondary is handling traffic.

```javascript
;(async function (arrayOfPings) {
    // Assume first host is primary, rest are secondaries
    const primary = arrayOfPings[0]
    const secondaries = arrayOfPings.slice(1)

    if (primary.status === "open") {
        // Primary is healthy
        return { status: "UP", latency: primary.latency }
    }

    // Primary is down, check secondaries
    const workingSecondary = secondaries.find((s) => s.status === "open")

    if (workingSecondary) {
        // Failover is working but primary is down
        return { status: "DEGRADED", latency: workingSecondary.latency }
    }

    // Both primary and all secondaries are down
    return { status: "DOWN", latency: 0 }
})
```

### 10. Weighted Service Importance {#weighted-service-importance}

Different services have different importance levels.

```javascript
;(async function (arrayOfPings) {
    // Weights: higher = more important
    // Order must match hosts array order
    const weights = [10, 5, 3] // e.g., database, cache, logging

    let totalWeight = 0
    let healthyWeight = 0
    let latencyTotal = 0
    let openCount = 0

    for (let i = 0; i < arrayOfPings.length; i++) {
        const weight = weights[i] || 1
        totalWeight += weight

        if (arrayOfPings[i].status === "open") {
            healthyWeight += weight
            latencyTotal += arrayOfPings[i].latency
            openCount++
        }
    }

    const healthPercent = healthyWeight / totalWeight
    const avgLatency = openCount > 0 ? latencyTotal / openCount : 0

    if (healthPercent === 1) {
        return { status: "UP", latency: avgLatency }
    } else if (healthPercent >= 0.5) {
        return { status: "DEGRADED", latency: avgLatency }
    } else {
        return { status: "DOWN", latency: avgLatency }
    }
})
```

### 11. Timeout-Specific Handling {#timeout-specific-handling}

Differentiate between timeouts (slow) and errors (down).

```javascript
;(async function (arrayOfPings) {
    let openCount = 0
    let timeoutCount = 0
    let errorCount = 0
    let latencyTotal = 0

    for (let ping of arrayOfPings) {
        if (ping.status === "open") {
            openCount++
            latencyTotal += ping.latency
        } else if (ping.status === "timeout") {
            timeoutCount++
        } else {
            errorCount++
        }
    }

    const avgLatency = openCount > 0 ? latencyTotal / openCount : 0

    // All connections successful
    if (openCount === arrayOfPings.length) {
        return { status: "UP", latency: avgLatency }
    }

    // Some timeouts but no hard errors - service is slow
    if (errorCount === 0 && timeoutCount > 0) {
        return { status: "DEGRADED", latency: avgLatency }
    }

    // Mix of states - partial outage
    if (openCount > 0) {
        return { status: "DEGRADED", latency: avgLatency }
    }

    // Complete failure
    return { status: "DOWN", latency: 0 }
})
```

### 12. Percentile-Based Latency Evaluation {#percentile-based-latency}

Use 95th percentile latency for status determination.

```javascript
;(async function (arrayOfPings) {
    const P95_THRESHOLD = 150 // milliseconds
    const P99_THRESHOLD = 300 // milliseconds

    // Extract latencies from successful connections only
    const latencies = arrayOfPings
        .filter((p) => p.status === "open")
        .map((p) => p.latency)
        .sort((a, b) => a - b)

    if (latencies.length === 0) {
        return { status: "DOWN", latency: 0 }
    }

    // Calculate percentiles
    const p95Index = Math.floor(latencies.length * 0.95)
    const p99Index = Math.floor(latencies.length * 0.99)
    const p95 = latencies[p95Index] || latencies[latencies.length - 1]
    const p99 = latencies[p99Index] || latencies[latencies.length - 1]
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length

    // Not all hosts responded
    if (latencies.length < arrayOfPings.length) {
        return { status: "DEGRADED", latency: avg }
    }

    // Check percentile thresholds
    if (p99 > P99_THRESHOLD) {
        return { status: "DOWN", latency: avg }
    } else if (p95 > P95_THRESHOLD) {
        return { status: "DEGRADED", latency: avg }
    }

    return { status: "UP", latency: avg }
})
```

## Common Use Cases {#common-use-cases}

### Database Servers {#use-case-databases}

| Database   | Default Port | Notes                      |
| :--------- | :----------- | :------------------------- |
| PostgreSQL | 5432         | May have multiple replicas |
| MySQL      | 3306         | Check primary and replicas |
| MongoDB    | 27017        | Replica set members        |
| Redis      | 6379         | Cluster or sentinel nodes  |
| Cassandra  | 9042         | Multiple nodes in ring     |

### Message Queues {#use-case-message-queues}

| Service  | Default Port | Notes                      |
| :------- | :----------- | :------------------------- |
| RabbitMQ | 5672         | AMQP port (15672 for HTTP) |
| Kafka    | 9092         | Broker port                |
| ActiveMQ | 61616        | OpenWire protocol          |
| NATS     | 4222         | Client port                |

### Other Services {#use-case-other-services}

| Service       | Default Port | Notes              |
| :------------ | :----------- | :----------------- |
| SSH           | 22           | Remote access      |
| SMTP          | 25, 587, 465 | Email sending      |
| IMAP          | 143, 993     | Email receiving    |
| FTP           | 21           | File transfer      |
| DNS           | 53           | Name resolution    |
| LDAP          | 389, 636     | Directory services |
| Elasticsearch | 9200, 9300   | HTTP and transport |
| Memcached     | 11211        | Caching            |

## Best Practices {#best-practices}

### Timeout Configuration {#best-practices-timeout}

- **Local services**: 500-1000ms timeout
- **Same datacenter**: 1000-2000ms timeout
- **Cross-region**: 2000-5000ms timeout
- **Global services**: 5000-10000ms timeout

### Host Configuration {#best-practices-hosts}

1. **Monitor critical ports**: Focus on the ports that matter for your application's functionality.
2. **Include redundancy checks**: Monitor all nodes in clustered services.
3. **Consider dependencies**: A database monitor might check both primary and read replicas.
4. **Use appropriate IP versions**: Use IPv6 (`"IP6"`) when services are only reachable via IPv6.

### Evaluation Logic {#best-practices-evaluation}

1. **Match business requirements**: Define what "UP", "DEGRADED", and "DOWN" mean for your service.
2. **Consider partial failures**: Distributed systems may have partial availability.
3. **Account for latency**: Slow responses may indicate impending problems.
4. **Use quorum logic**: For clustered services, check if enough nodes are healthy.

## Troubleshooting {#troubleshooting}

### Common Issues {#common-issues}

| Issue                 | Possible Cause                         | Solution                                            |
| :-------------------- | :------------------------------------- | :-------------------------------------------------- |
| Always timeout        | Firewall blocking connection           | Check firewall rules, security groups               |
| Always error          | Service not running or wrong port      | Verify service status and port number               |
| Intermittent timeouts | Network congestion or service overload | Increase timeout or investigate service performance |
| IPv6 not working      | Network doesn't support IPv6           | Use `"tcp"` type for IPv4                           |
| High latency          | Geographic distance or network issues  | Use closer monitoring location or adjust thresholds |

### Debug Tips {#debug-tips}

1. **Test manually**: Use `telnet host port` or `nc -zv host port` to verify connectivity.
2. **Check DNS**: Ensure hostname resolves correctly.
3. **Verify firewall**: Confirm the monitoring server can reach the target.
4. **Review logs**: Check Kener logs for detailed error messages.
