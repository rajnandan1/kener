---
title: GameDig Monitor
description: Monitor game servers for over 300 games using the GameDig protocol
---

GameDig monitors allow you to track the health and status of game servers. Using the [GameDig](https://github.com/gamedig/node-gamedig) library, Kener can query game servers for over 300 different games, including popular titles like Minecraft, Counter-Strike, ARK, Valheim, and many more.

## How GameDig Monitoring Works {#how-gamedig-monitoring-works}

Kener's GameDig monitoring follows this workflow:

1. **Query Server**: Kener sends a query to the game server using the appropriate game protocol.
2. **Receive Response**: The server responds with status information (players, map, ping, etc.).
3. **Measure Latency**: Response time is recorded as the server's ping.
4. **Evaluate Status**: The custom eval function receives the response data to determine monitor status.

### GameDig Check Process {#gamedig-check-process}

```
┌─────────────┐                         ┌─────────────┐
│   Kener     │ ──── Game Protocol ───► │   Game      │
│   Monitor   │     (UDP/TCP Query)     │   Server    │
└─────────────┘                         └─────────────┘
       │                                       │
       │    ┌─────────────────────────────┐    │
       └────│ Query with:                 │────┘
            │ - Game type (minecraft)     │
            │ - Host (mc.example.com)     │
            │ - Port (25565)              │
            │ - Timeout (10s)             │
            └─────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │ Response:                   │
            │ - ping: 45ms                │
            │ - players: 12/20            │
            │ - map: "world"              │
            │ - raw: { ... }              │
            └─────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │ Custom Eval Function        │
            │ (responseTime, responseRaw) │
            └─────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │ Result: { status, latency } │
            └─────────────────────────────┘
```

## Configuration Options {#configuration-options}

| Field             | Type       | Description                                                              | Default       |
| :---------------- | :--------- | :----------------------------------------------------------------------- | :------------ |
| **Game**          | `string`   | The game type identifier from the supported games list.                  | (Required)    |
| **Host**          | `string`   | Hostname or IP address of the game server.                               | (Required)    |
| **Port**          | `number`   | Query port of the game server (may differ from game port).               | Game default  |
| **Timeout**       | `number`   | Maximum time in milliseconds to wait for a response.                     | `10000`       |
| **Guess Port**    | `boolean`  | Try alternative ports if the specified port doesn't respond.             | `false`       |
| **Request Rules** | `boolean`  | Request additional "rules" data from Valve games (may increase latency). | `false`       |
| **Custom Eval**   | `function` | JavaScript function to evaluate response and determine status.           | Default logic |

## Supported Games {#supported-games}

GameDig supports over 300 games. Here are some popular ones:

### Popular Games {#popular-games}

| Game                   | ID               | Default Port | Protocol  |
| :--------------------- | :--------------- | :----------- | :-------- |
| Minecraft              | `minecraft`      | 25565        | Minecraft |
| Minecraft Bedrock      | `minecraftbe`    | 19132        | Bedrock   |
| Counter-Strike 2       | `cs2`            | 27015        | Valve     |
| Counter-Strike: GO     | `csgo`           | 27015        | Valve     |
| Valheim                | `valheim`        | 2457         | Valve     |
| ARK: Survival Evolved  | `ase`            | 27015        | Valve     |
| ARK: Survival Ascended | `asa`            | 27015        | ASA       |
| Rust                   | `rust`           | 28015        | Valve     |
| Team Fortress 2        | `tf2`            | 27015        | Valve     |
| Garry's Mod            | `garrysmod`      | 27015        | Valve     |
| 7 Days to Die          | `sdtd`           | 26900        | Valve     |
| DayZ                   | `dayz`           | 27016        | Valve     |
| Terraria (TShock)      | `terrariatshock` | 7777         | Terraria  |
| V Rising               | `vrising`        | 27015        | Valve     |
| Enshrouded             | `enshrouded`     | 15637        | Valve     |
| Palworld               | `palworld`       | 8211         | Palworld  |

### Finding Your Game {#finding-your-game}

The full list of supported games is available in the Kener UI when configuring a GameDig monitor. You can search by game name to find the correct game ID.

For the complete list, see the [GameDig documentation](https://github.com/gamedig/node-gamedig#games-list).

## Response Structure {#response-structure}

The GameDig query returns:

- `responseTime` (number): Server response time in milliseconds (ping).
- `responseRaw` (object): Raw response data from the server.

The `responseRaw` object typically contains:

```javascript
{
    name: "My Awesome Server",      // Server name
    map: "de_dust2",                // Current map
    password: false,                // Password protected
    numplayers: 12,                 // Current players
    maxplayers: 24,                 // Max players
    players: [                      // Player list
        { name: "Player1", score: 10 },
        { name: "Player2", score: 5 }
    ],
    bots: [],                       // Bot list
    connect: "192.168.1.1:27015",   // Connection string
    ping: 45,                       // Server ping
    raw: {                          // Protocol-specific raw data
        // Varies by game
    }
}
```

## Custom Evaluation {#custom-evaluation}

The evaluation function allows you to define custom logic for determining monitor status.

### Function Signature {#function-signature}

```javascript
;(async function (responseTime, responseRaw) {
    // Your evaluation logic
    return {
        status: "UP" | "DOWN" | "DEGRADED",
        latency: number
    }
})
```

### Parameters {#parameters}

| Parameter      | Type     | Description                                  |
| :------------- | :------- | :------------------------------------------- |
| `responseTime` | `number` | Server response time (ping) in milliseconds. |
| `responseRaw`  | `object` | Raw response data from the game server.      |

### Default Implementation {#default-implementation}

Here is the default logic used if you don't provide a custom function:

```javascript
;(async function (responseTime, responseRaw) {
    return {
        status: "UP",
        latency: responseTime
    }
})
```

**Default Behavior:**

- **UP**: Server responded to query
- **DOWN**: Server failed to respond (handled before eval runs)
- **Latency**: Server ping time

## Examples {#examples}

### 1. Basic Minecraft Server {#basic-minecraft-server}

Monitor a Minecraft Java server.

```json
{
    "tag": "minecraft-main",
    "name": "Minecraft Server",
    "type": "GAMEDIG",
    "type_data": {
        "gameId": "minecraft",
        "host": "mc.example.com",
        "port": 25565,
        "timeout": 10000
    }
}
```

### 2. Minecraft Bedrock Server {#minecraft-bedrock-server}

Monitor a Minecraft Bedrock/Pocket Edition server.

```json
{
    "tag": "minecraft-bedrock",
    "name": "Bedrock Server",
    "type": "GAMEDIG",
    "type_data": {
        "gameId": "minecraftbe",
        "host": "bedrock.example.com",
        "port": 19132,
        "timeout": 10000
    }
}
```

### 3. Counter-Strike 2 Server {#counter-strike-2-server}

Monitor a CS2 server.

```json
{
    "tag": "cs2-competitive",
    "name": "CS2 Competitive",
    "type": "GAMEDIG",
    "type_data": {
        "gameId": "cs2",
        "host": "cs2.example.com",
        "port": 27015,
        "timeout": 10000,
        "guessPort": true
    }
}
```

### 4. Valheim Server {#valheim-server}

Monitor a Valheim dedicated server.

```json
{
    "tag": "valheim-server",
    "name": "Valheim Server",
    "type": "GAMEDIG",
    "type_data": {
        "gameId": "valheim",
        "host": "valheim.example.com",
        "port": 2457,
        "timeout": 15000
    }
}
```

### 5. ARK: Survival Evolved Server {#ark-survival-evolved-server}

Monitor an ARK server with rules request.

```json
{
    "tag": "ark-server",
    "name": "ARK Server",
    "type": "GAMEDIG",
    "type_data": {
        "gameId": "ase",
        "host": "ark.example.com",
        "port": 27015,
        "timeout": 15000,
        "guessPort": true,
        "requestRules": true
    }
}
```

### 6. Rust Server {#rust-server}

Monitor a Rust dedicated server.

```json
{
    "tag": "rust-server",
    "name": "Rust Server",
    "type": "GAMEDIG",
    "type_data": {
        "gameId": "rust",
        "host": "rust.example.com",
        "port": 28015,
        "timeout": 10000
    }
}
```

## Advanced Evaluation Examples {#advanced-evaluation-examples}

### 7. Player Count Threshold {#player-count-threshold}

Mark as DEGRADED if server is nearly full.

```javascript
;(async function (responseTime, responseRaw) {
    const playerRatio = responseRaw.numplayers / responseRaw.maxplayers

    // Server nearly full
    if (playerRatio > 0.9) {
        return { status: "DEGRADED", latency: responseTime }
    }

    return { status: "UP", latency: responseTime }
})
```

### 8. High Ping Detection {#high-ping-detection}

Mark as DEGRADED if server ping is too high.

```javascript
;(async function (responseTime, responseRaw) {
    const PING_THRESHOLD = 150 // ms

    if (responseTime > PING_THRESHOLD) {
        return { status: "DEGRADED", latency: responseTime }
    }

    return { status: "UP", latency: responseTime }
})
```

### 9. Empty Server Alert {#empty-server-alert}

Mark as DEGRADED if server has no players (might indicate issues).

```javascript
;(async function (responseTime, responseRaw) {
    // Server empty - might be having issues
    if (responseRaw.numplayers === 0) {
        return { status: "DEGRADED", latency: responseTime }
    }

    return { status: "UP", latency: responseTime }
})
```

### 10. Map Verification {#map-verification}

Verify server is running expected map.

```javascript
;(async function (responseTime, responseRaw) {
    const expectedMaps = ["de_dust2", "de_mirage", "de_inferno"]

    if (!expectedMaps.includes(responseRaw.map)) {
        return { status: "DEGRADED", latency: responseTime }
    }

    return { status: "UP", latency: responseTime }
})
```

### 11. Password Protection Check {#password-protection-check}

Alert if server becomes password protected unexpectedly.

```javascript
;(async function (responseTime, responseRaw) {
    // Public server shouldn't have password
    if (responseRaw.password === true) {
        return { status: "DEGRADED", latency: responseTime }
    }

    return { status: "UP", latency: responseTime }
})
```

### 12. Combined Checks {#combined-checks}

Multiple conditions for comprehensive monitoring.

```javascript
;(async function (responseTime, responseRaw) {
    const issues = []

    // High ping
    if (responseTime > 200) {
        issues.push("high_ping")
    }

    // Server full
    if (responseRaw.numplayers >= responseRaw.maxplayers) {
        issues.push("full")
    }

    // Wrong map
    if (responseRaw.map === "workshop") {
        issues.push("wrong_map")
    }

    if (issues.length > 1) {
        return { status: "DOWN", latency: responseTime }
    } else if (issues.length === 1) {
        return { status: "DEGRADED", latency: responseTime }
    }

    return { status: "UP", latency: responseTime }
})
```

## Port Configuration {#port-configuration}

Game servers often have different ports for gameplay and queries:

| Game         | Game Port | Query Port | Notes                      |
| :----------- | :-------- | :--------- | :------------------------- |
| Minecraft    | 25565     | 25565      | Same port                  |
| Source games | 27015     | 27015      | Same port (Valve protocol) |
| ARK          | 7777      | 27015      | Different ports            |
| Rust         | 28015     | 28015      | Same port                  |
| FiveM        | 30120     | 30120      | Same port                  |

Use the **Guess Port** option if unsure about the query port.

## Best Practices {#best-practices}

### Timeout Configuration {#best-practices-timeout}

| Server Location | Recommended Timeout | Rationale               |
| :-------------- | :------------------ | :---------------------- |
| Local network   | 5000ms              | Low latency expected    |
| Same region     | 10000ms             | Standard timeout        |
| Cross-region    | 15000ms             | Higher latency expected |
| Unreliable host | 20000ms             | Allow for packet loss   |

### Query Port {#best-practices-query-port}

1. **Check game documentation**: Query port often differs from game port.
2. **Use Guess Port**: Enable if you're unsure about the port.
3. **Verify with tools**: Use GameDig CLI or online query tools to test.

### Evaluation Logic {#best-practices-evaluation}

1. **Keep it simple**: Basic UP/DOWN is often sufficient.
2. **Use DEGRADED wisely**: For high ping, near-full servers, etc.
3. **Don't over-complicate**: Focus on critical server health indicators.

## Troubleshooting {#troubleshooting}

### Common Issues {#common-issues}

| Issue               | Possible Cause                    | Solution                              |
| :------------------ | :-------------------------------- | :------------------------------------ |
| Always DOWN         | Wrong game ID or port             | Verify game ID and query port         |
| Timeout errors      | Firewall blocking queries         | Check firewall allows UDP/TCP queries |
| Wrong data returned | Query port vs game port confusion | Enable "Guess Port" option            |
| Slow response       | Server overloaded or far away     | Increase timeout                      |
| No player data      | Server privacy settings           | Check server query settings           |

### Debug Tips {#debug-tips}

1. **Test with GameDig CLI**:

    ```bash
    npx gamedig --type minecraft mc.example.com:25565
    ```

2. **Check server settings**: Ensure queries are enabled on the game server.

3. **Verify firewall**: UDP queries need specific ports open.

4. **Try Guess Port**: Different games use different query ports.

### Valve Game Specifics {#valve-game-specifics}

For Valve games (CS2, TF2, Garry's Mod, etc.):

1. **Query port**: Usually same as game port (27015).
2. **Request Rules**: Enable for additional server data (may increase latency).
3. **Rate limiting**: Valve servers may rate-limit queries.
