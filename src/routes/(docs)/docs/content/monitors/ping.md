---
title: Ping Monitor
description: Monitor server availability and network connectivity using ICMP ping checks
---

Ping monitors use ICMP (Internet Control Message Protocol) to verify that servers or network devices are reachable and measure network latency. Kener's ping implementation supports multiple hosts, custom evaluation logic, and flexible timeout configurations.

## Configuration Options {#configuration-options}

| Field           | Type       | Description                                                                     | Default       |
| :-------------- | :--------- | :------------------------------------------------------------------------------ | :------------ |
| **Hosts**       | `array`    | Array of host objects to ping. Each host can have independent timeout settings. | (Required)    |
| **Custom Eval** | `function` | A JavaScript function to evaluate ping results and determine monitor status.    | Default logic |

### Host Object Properties {#host-object-properties}

Each host in the `hosts` array supports the following properties:

| Property    | Type     | Description                                         | Default  |
| :---------- | :------- | :-------------------------------------------------- | :------- |
| **type**    | `string` | Ping method. Currently only `"cmd"` is supported.   | `"cmd"`  |
| **host**    | `string` | Hostname or IP address to ping (e.g., `"8.8.8.8"`). | Required |
| **timeout** | `number` | Ping timeout in milliseconds.                       | `1000`   |
| **count**   | `number` | Number of ping packets to send.                     | `3`      |

## How Ping Evaluation Works {#how-ping-evaluation-works}

The ping monitor executes the following workflow:

1. **Execute Pings**: For each host in the `hosts` array, Kener sends ICMP ping packets.
2. **Collect Results**: Each ping returns an object containing:
    - `host`: The target hostname/IP
    - `alive`: Boolean indicating if host responded
    - `time`: Average response time in milliseconds (if successful)
    - `min`, `max`, `avg`, `stddev`: Latency statistics
3. **Evaluate Status**: The custom eval function receives the array of all ping results and determines the final monitor status.

### Ping Result Structure {#ping-result-structure}

Each ping operation returns an object with this structure:

```javascript
{
  host: "8.8.8.8",           // Target host
  alive: true,                // Whether ping succeeded
  time: 15.234,              // Average response time (ms)
  min: 14.123,               // Minimum response time (ms)
  max: 16.789,               // Maximum response time (ms)
  avg: 15.234,               // Average response time (ms)
  stddev: 0.891              // Standard deviation (ms)
}
```

If the ping fails:

```javascript
{
  host: "unreachable.example.com",
  alive: false,
  time: undefined,
  min: undefined,
  max: undefined,
  avg: undefined,
  stddev: undefined
}
```

## Custom Evaluation {#custom-evaluation}

The evaluation function allows you to define custom logic for determining monitor status based on ping results from multiple hosts.

**Function Signature:**

```javascript
;(arrayOfPings) => {
    // Your evaluation logic
    return {
        status: "UP" | "DOWN" | "DEGRADED",
        latency: number
    }
}
```

**Parameters:**

- `arrayOfPings` (`array`): Array of ping result objects, one for each host configured.

**Return Value:**
The function can be **synchronous** or **asynchronous**. It **must** return (or resolve to) an object with:

- `status`: `'UP'`, `'DEGRADED'`, or `'DOWN'`.
- `latency`: The latency to record in milliseconds (typically the average of all hosts).

### Default Implementation {#default-implementation}

Here is the default logic used if you don't provide a custom function:

```javascript
;(arrayOfPings) => {
    let totalLatency = 0
    let aliveCount = 0

    for (let i = 0; i < arrayOfPings.length; i++) {
        if (arrayOfPings[i].alive) {
            aliveCount++
            totalLatency += arrayOfPings[i].time
        }
    }

    // All hosts must be alive for status to be UP
    if (aliveCount === arrayOfPings.length) {
        return {
            status: "UP",
            latency: totalLatency / aliveCount
        }
    }

    // If some hosts are alive, status is DEGRADED
    if (aliveCount > 0) {
        return {
            status: "DEGRADED",
            latency: totalLatency / aliveCount
        }
    }

    // No hosts responding
    return {
        status: "DOWN",
        latency: 0
    }
}
```

## Examples {#examples}

### 1. Basic Single Host Ping {#basic-single-host-ping}

Monitor a single server with default settings.

```json
{
    "tag": "web-server",
    "name": "Web Server",
    "type": "PING",
    "hosts": [
        {
            "type": "cmd",
            "host": "web.example.com",
            "timeout": 1000,
            "count": 3
        }
    ]
}
```

### 2. Multiple Hosts with IP Addresses {#multiple-hosts-with-ip-addresses}

Monitor multiple servers (e.g., primary and backup) to track overall infrastructure health.

```json
{
    "tag": "dns-servers",
    "name": "DNS Servers",
    "type": "PING",
    "hosts": [
        {
            "type": "cmd",
            "host": "8.8.8.8",
            "timeout": 2000,
            "count": 5
        },
        {
            "type": "cmd",
            "host": "8.8.4.4",
            "timeout": 2000,
            "count": 5
        }
    ]
}
```

### 3. Custom Evaluation - At Least One Host Up {#custom-evaluation-at-least-one-host-up}

Mark the monitor as UP if at least one host is responding (useful for redundant infrastructure).

```json
{
    "tag": "load-balancers",
    "name": "Load Balancers",
    "type": "PING",
    "hosts": [
        {
            "type": "cmd",
            "host": "lb1.example.com",
            "timeout": 1000,
            "count": 3
        },
        {
            "type": "cmd",
            "host": "lb2.example.com",
            "timeout": 1000,
            "count": 3
        }
    ],
    "pingEval": "(arrayOfPings) => { let aliveCount = 0; let totalLatency = 0; for (let i = 0; i < arrayOfPings.length; i++) { if (arrayOfPings[i].alive) { aliveCount++; totalLatency += arrayOfPings[i].time; } } if (aliveCount > 0) { return { status: 'UP', latency: totalLatency / aliveCount }; } return { status: 'DOWN', latency: 0 }; }"
}
```

**Formatted Custom Eval:**

```javascript
;(arrayOfPings) => {
    let aliveCount = 0
    let totalLatency = 0

    for (let i = 0; i < arrayOfPings.length; i++) {
        if (arrayOfPings[i].alive) {
            aliveCount++
            totalLatency += arrayOfPings[i].time
        }
    }

    // UP if at least one host is alive
    if (aliveCount > 0) {
        return {
            status: "UP",
            latency: totalLatency / aliveCount
        }
    }

    return {
        status: "DOWN",
        latency: 0
    }
}
```

### 4. Advanced - Latency Threshold with Degraded State {#advanced-latency-threshold-with-degraded-state}

Mark the monitor as DEGRADED if latency exceeds a threshold, even if all hosts are responding.

```javascript
;(arrayOfPings) => {
    let totalLatency = 0
    let aliveCount = 0
    let maxLatency = 0

    for (let i = 0; i < arrayOfPings.length; i++) {
        if (arrayOfPings[i].alive) {
            aliveCount++
            totalLatency += arrayOfPings[i].time
            maxLatency = Math.max(maxLatency, arrayOfPings[i].time)
        }
    }

    // No hosts responding
    if (aliveCount === 0) {
        return {
            status: "DOWN",
            latency: 0
        }
    }

    const avgLatency = totalLatency / aliveCount

    // Check if all hosts are alive
    if (aliveCount === arrayOfPings.length) {
        // DEGRADED if average latency > 100ms or max latency > 200ms
        if (avgLatency > 100 || maxLatency > 200) {
            return {
                status: "DEGRADED",
                latency: avgLatency
            }
        }

        return {
            status: "UP",
            latency: avgLatency
        }
    }

    // Some hosts down = DEGRADED
    return {
        status: "DEGRADED",
        latency: avgLatency
    }
}
```

### 5. Geographic Redundancy Check {#geographic-redundancy-check}

Monitor servers across multiple regions and require at least 2 regions to be operational.

```javascript
;(arrayOfPings) => {
    // Assuming first 2 hosts are US, next 2 are EU, last 2 are APAC
    const regions = [
        { name: "US", hosts: [arrayOfPings[0], arrayOfPings[1]] },
        { name: "EU", hosts: [arrayOfPings[2], arrayOfPings[3]] },
        { name: "APAC", hosts: [arrayOfPings[4], arrayOfPings[5]] }
    ]

    let healthyRegions = 0
    let totalLatency = 0
    let totalHosts = 0

    regions.forEach((region) => {
        const regionAlive = region.hosts.some((host) => host.alive)
        if (regionAlive) {
            healthyRegions++
            region.hosts.forEach((host) => {
                if (host.alive) {
                    totalLatency += host.time
                    totalHosts++
                }
            })
        }
    })

    const avgLatency = totalHosts > 0 ? totalLatency / totalHosts : 0

    // Need at least 2 regions healthy
    if (healthyRegions >= 2) {
        return { status: "UP", latency: avgLatency }
    }

    // Only 1 region healthy
    if (healthyRegions === 1) {
        return { status: "DEGRADED", latency: avgLatency }
    }

    // No regions healthy
    return { status: "DOWN", latency: 0 }
}
```

## Use Cases {#use-cases}

Ping monitors are ideal for:

- **Network Infrastructure** - Monitor routers, switches, and network devices
- **Server Availability** - Basic reachability checks for web servers, databases, etc.
- **Geographic Distribution** - Monitor services across multiple data centers
- **Failover Systems** - Track primary and backup server availability
- **ISP/Network Quality** - Monitor external DNS servers or gateways

## Limitations {#limitations}

- **ICMP-Only**: Ping only checks network reachability, not application health
- **Firewall Blocks**: Some servers/firewalls block ICMP traffic
- **Service Verification**: Cannot verify that specific services (HTTP, database, etc.) are running
- **Packet Loss**: High packet loss can cause false negatives even when host is reachable

## Best Practices {#best-practices}

1. **Combine with Application Monitors**: Use ping alongside API or TCP monitors for complete coverage
2. **Set Appropriate Counts**: Use `count: 3-5` for balance between speed and reliability
3. **Timeout Configuration**: Set `timeout: 1000-2000ms` for most networks
4. **Multiple Hosts for Redundancy**: Monitor backup/failover systems with custom evaluation logic
5. **Geographic Monitoring**: Include hosts from different regions to detect regional outages
6. **Latency Thresholds**: Use custom eval to set DEGRADED state for high-latency responses
