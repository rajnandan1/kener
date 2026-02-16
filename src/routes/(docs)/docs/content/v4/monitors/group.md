---
title: Group Monitor
description: Aggregate multiple monitors into a single status view using weighted scoring
---

Group monitors allow you to combine multiple monitors into a unified status view. Instead of checking individual services, a group monitor aggregates the status of its member monitors using a weighted scoring system. This is ideal for representing complex systems where different components have varying levels of importance to the overall service health.

## How Group Monitoring Works {#how-group-monitoring-works}

Kener's Group monitoring follows this workflow:

1. **Collect Member Status**: Group monitor retrieves the latest status of each configured member monitor.
2. **Calculate Weighted Score**: Each status (UP, DEGRADED, DOWN, MAINTENANCE) has a numeric score. The group calculates a weighted average based on member weights.
3. **Map to Status**: The weighted score is mapped back to a group status (UP, DEGRADED, DOWN, or MAINTENANCE).
4. **Aggregate Latency**: Member latencies are combined using the selected calculation method (AVG, MAX, or MIN).

### Status Scoring System {#status-scoring-system}

Each monitor status has a numeric score used in weighted calculations:

| Status          | Score | Meaning                          |
| :-------------- | :---- | :------------------------------- |
| **UP**          | `0`   | Service operating normally       |
| **DEGRADED**    | `1`   | Service experiencing issues      |
| **DOWN**        | `2`   | Service unavailable              |
| **MAINTENANCE** | `3`   | Service in scheduled maintenance |

### Weighted Score Calculation {#weighted-score-calculation}

The group status is determined by:

```
Weighted Score = Σ(monitor_weight × monitor_status_score)

where weights must sum to 1.0
```

The weighted score is then mapped back to a status:

| Score Range       | Group Status    |
| :---------------- | :-------------- |
| `< 1.0`           | **UP**          |
| `≥ 1.0 and < 2.0` | **DEGRADED**    |
| `≥ 2.0 and < 3.0` | **DOWN**        |
| `≥ 3.0`           | **MAINTENANCE** |

### Example Calculation {#example-calculation}

Given three monitors with weights:

- **API** (weight: 0.5): DOWN (score: 2)
- **Database** (weight: 0.3): UP (score: 0)
- **Cache** (weight: 0.2): UP (score: 0)

```
Weighted Score = (0.5 × 2) + (0.3 × 0) + (0.2 × 0) = 1.0
Result: DEGRADED
```

The group is marked **DEGRADED** because the high-weight API monitor is down, even though two other services are up.

## Configuration Options {#configuration-options}

| Field                   | Type     | Description                                                                                                       | Default |
| :---------------------- | :------- | :---------------------------------------------------------------------------------------------------------------- | :------ |
| **Monitors**            | `array`  | List of member monitors with their tags and weights. Weights must sum to 1.                                       | `[]`    |
| **Execution Delay**     | `number` | Delay in milliseconds before the group monitor executes, allowing member monitors to complete their checks first. | `1000`  |
| **Latency Calculation** | `string` | How to calculate group latency from members: `AVG` (average), `MAX`, or `MIN`.                                    | `AVG`   |

### Execution Delay {#execution-delay}

The **executionDelay** parameter is critical for group monitors:

- **Purpose**: Delays the group monitor execution to ensure all member monitors have completed their checks for the current minute.
- **Why It Matters**: Group monitors aggregate status from member monitors. If the group runs too early, it may read stale data from the previous minute, resulting in incorrect status calculations.
- **Timing**: Member monitors run at the start of each minute (cron schedule). Setting executionDelay to 1000ms (1 second) or higher ensures member data is fresh.
- **Recommendation**: Set executionDelay higher than the slowest member monitor's expected execution time. For example, if your API monitor has a 500ms timeout, use 1000ms or more for the group.

> [!WARNING]
> Setting executionDelay too low (e.g., 100ms) can cause the group to aggregate stale data, making the group status lag behind actual member statuses.

### Monitor Weights {#monitor-weights}

Each member monitor in a group has a **weight** between `0` and `1`. The weights determine how much each monitor influences the overall group status.

- **Higher weight** = Greater impact on group status
- **Lower weight** = Lesser impact on group status
- **All weights must sum to 1.0**

> [!NOTE]
> Groups cannot contain other group monitors. Only non-group, active monitors can be added to a group.

## Weight Assignment Strategies {#weight-assignment-strategies}

### Equal Weighting {#equal-weighting}

All monitors have equal importance:

```json
{
    "monitors": [
        { "tag": "api", "weight": 0.333 },
        { "tag": "database", "weight": 0.333 },
        { "tag": "cache", "weight": 0.334 }
    ]
}
```

Each monitor contributes equally to the group status.

### Critical Component Weighting {#critical-component-weighting}

Primary service has higher weight:

```json
{
    "monitors": [
        { "tag": "api", "weight": 0.6 },
        { "tag": "database", "weight": 0.25 },
        { "tag": "cache", "weight": 0.15 }
    ]
}
```

The API has more influence on overall status than supporting services.

### Tiered Importance {#tiered-importance}

```json
{
    "monitors": [
        { "tag": "core-api", "weight": 0.5 },
        { "tag": "database", "weight": 0.3 },
        { "tag": "cdn", "weight": 0.15 },
        { "tag": "analytics", "weight": 0.05 }
    ]
}
```

Core services have higher weights, while auxiliary services have minimal impact.

## Latency Calculation Methods {#latency-calculation-methods}

Group monitors can aggregate member latencies using different methods:

| Method  | Description                             | Use Case                        |
| :------ | :-------------------------------------- | :------------------------------ |
| **AVG** | Average latency of all member monitors  | General performance overview    |
| **MAX** | Highest latency among members (slowest) | Worst-case performance tracking |
| **MIN** | Lowest latency among members (fastest)  | Best-case performance tracking  |

## Examples {#examples}

### 1. Basic Web Application Stack {#basic-web-application-stack}

Monitor a typical web app with equal weights:

```json
{
    "tag": "webapp-stack",
    "name": "Web Application",
    "type": "GROUP",
    "cron": "* * * * *",
    "type_data": {
        "monitors": [
            { "tag": "frontend", "weight": 0.333 },
            { "tag": "api-backend", "weight": 0.333 },
            { "tag": "database", "weight": 0.334 }
        ],
        "executionDelay": 1000,
        "latencyCalculation": "AVG"
    }
}
```

**Behavior:**

- All three components equally affect the group status
- If any one component goes DOWN (score 2), weighted score is ~0.667 → Group remains **UP** but approaching **DEGRADED**
- If two components go DOWN, weighted score is ~1.333 → Group becomes **DEGRADED**

### 2. Critical Service with Dependencies {#critical-service-with-dependencies}

Primary API is critical, supporting services are less impactful:

```json
{
    "tag": "payment-service",
    "name": "Payment Processing",
    "type": "GROUP",
    "cron": "* * * * *",
    "type_data": {
        "monitors": [
            { "tag": "payment-api", "weight": 0.7 },
            { "tag": "fraud-check", "weight": 0.2 },
            { "tag": "notification", "weight": 0.1 }
        ],
        "executionDelay": 2000,
        "latencyCalculation": "MAX"
    }
}
```

**Behavior:**

- If payment-api goes DOWN (score 2): `0.7 × 2 = 1.4` → Group is **DEGRADED**
- If only notification goes DOWN: `0.1 × 2 = 0.2` → Group remains **UP**
- Uses MAX latency to track the slowest component

### 3. E-commerce Platform {#e-commerce-platform}

Multi-tier application with varying weights:

```json
{
    "tag": "ecommerce-platform",
    "name": "E-Commerce Platform",
    "type": "GROUP",
    "cron": "*/2 * * * *",
    "type_data": {
        "monitors": [
            { "tag": "storefront", "weight": 0.4 },
            { "tag": "product-api", "weight": 0.25 },
            { "tag": "checkout", "weight": 0.2 },
            { "tag": "search", "weight": 0.1 },
            { "tag": "recommendations", "weight": 0.05 }
        ],
        "executionDelay": 1500,
        "latencyCalculation": "AVG"
    }
}
```

**Behavior:**

- Storefront and core APIs have high weight
- Search being down only contributes `0.1 × 2 = 0.2` to the score
- Recommendations being down adds just `0.05 × 2 = 0.1` (minimal impact)

### 4. Gradual Degradation Example {#gradual-degradation-example}

Understanding how multiple failures affect group status:

With equal weights (0.25 each for 4 monitors):

| Failed Monitors | Calculation                  | Score  | Status   |
| :-------------- | :--------------------------- | :----- | :------- |
| None            | `0`                          | `0.0`  | UP       |
| 1 DOWN          | `0.25 × 2 = 0.5`             | `0.5`  | UP       |
| 2 DOWN          | `0.5 × 2 = 1.0`              | `1.0`  | DEGRADED |
| 3 DOWN          | `0.75 × 2 = 1.5`             | `1.5`  | DEGRADED |
| 4 DOWN          | `1.0 × 2 = 2.0`              | `2.0`  | DOWN     |
| 2 DEGRADED      | `0.5 × 1 = 0.5`              | `0.5`  | UP       |
| 1 DOWN + 1 DEG  | `0.25 × 2 + 0.25 × 1 = 0.75` | `0.75` | UP       |

## Best Practices {#best-practices}

### Weight Assignment {#best-practices-weight-assignment}

1. **Identify Critical Components**: Services that can bring down the entire system should have higher weights (0.5-0.7).
2. **Sum to 1.0**: Always ensure weights add up to exactly 1.0.
3. **Use the "Distribute Equally" Button**: The UI provides a button to auto-calculate equal weights.
4. **Round to 2-3 Decimals**: Avoid overly precise weights like `0.142857` — round to `0.143`.

### Group Organization {#best-practices-group-organization}

1. **Logical Grouping**: Group monitors that actually belong together (e.g., all microservices for one product).
2. **Avoid Deep Nesting**: Groups cannot contain other groups — keep hierarchies flat.
3. **Limit Group Size**: 3-7 monitors per group is ideal. Too many makes weights hard to reason about.
4. **Name Clearly**: Use descriptive names like "Payment Stack" not "Group 1".

### Monitoring Strategy {#best-practices-monitoring-strategy}

1. **Check Frequency**: Group monitors should run at least as often as their slowest member.
2. **Execution Delay**: Set executionDelay higher than your slowest member monitor's timeout + processing time. For example:
    - If API monitor has 500ms timeout: use 1000ms+ executionDelay
    - If SQL monitor has 2000ms timeout: use 2500ms+ executionDelay
    - Default 1000ms works for most monitors with timeouts under 500ms
3. **Latency Method**:
    - Use **AVG** for general overview
    - Use **MAX** when you care about the slowest component
    - Use **MIN** rarely (only when fastest matters)

### Weight Scenarios {#best-practices-weight-scenarios}

**Scenario: Primary + Backup**

```json
{ "primary": 0.8, "backup": 0.2 }
```

Backup has low weight since it only matters when primary fails.

**Scenario: Load-Balanced Services**

```json
{ "server1": 0.5, "server2": 0.5 }
```

Both servers equally important for availability.

**Scenario: Microservices with Shared Database**

```json
{ "api1": 0.25, "api2": 0.25, "api3": 0.25, "database": 0.25 }
```

All components equally critical.

## Common Patterns {#common-patterns}

### Pattern 1: Frontend + Backend + Database {#pattern-frontend-backend-database}

```
Frontend (0.3) ──► Backend (0.5) ──► Database (0.2)
```

Backend has highest weight as it's the core business logic. Database lower because issues often manifest in backend first.

### Pattern 2: Microservices Architecture {#pattern-microservices}

```
Gateway (0.4)
    ├─► Service A (0.2)
    ├─► Service B (0.2)
    └─► Service C (0.2)
```

Gateway is critical as it's the entry point. Services have equal weight.

### Pattern 3: CDN + Origin {#pattern-cdn-origin}

```
CDN (0.3) ──► Origin (0.7)
```

Origin is more critical since CDN failures can be worked around, but origin failures are total.

## Troubleshooting {#troubleshooting}

### Group Stays UP When Members Are DOWN {#troubleshooting-up-when-down}

**Problem**: Group shows UP even though some members are DOWN.

**Solution**: Check total weighted score. With low weights, a single DOWN monitor may not push the score to 1.0:

- `0.2 × 2 = 0.4` (still < 1.0, so UP)
- Increase weights for critical monitors or adjust thresholds.

### Group Always Shows DEGRADED {#troubleshooting-always-degraded}

**Problem**: Group constantly shows DEGRADED status.

**Solution**:

- Check if member monitors frequently show DEGRADED status
- Verify weight distribution — heavily weighted monitors have outsized impact
- Review member monitor configurations for sensitivity

### Weights Don't Sum to 1.0 {#troubleshooting-weights-sum}

**Problem**: Cannot save group configuration.

**Solution**: Use the "Distribute Equally" button or manually adjust weights:

```
Total: 0.99 → Add 0.01 to one monitor
Total: 1.01 → Subtract 0.01 from one monitor
```

### Missing Member Data {#troubleshooting-missing-data}

**Problem**: Group uses partial data or shows NO_DATA.

**Solution**:

- Ensure member monitors are running on schedule
- Check that member monitors are active (not paused)
- **Increase executionDelay** if member monitors take longer than expected to complete
- Member monitors must complete before group aggregates
- If a member has a 1000ms timeout, set group executionDelay to at least 1500ms

## Advanced Use Cases {#advanced-use-cases}

### Blue-Green Deployment Monitoring {#blue-green-deployment}

Monitor both environments with dynamic weighting:

**During Normal Operation:**

```json
{ "blue": 1.0, "green": 0.0 }
```

**During Deployment (50/50 traffic):**

```json
{ "blue": 0.5, "green": 0.5 }
```

**After Cutover:**

```json
{ "blue": 0.0, "green": 1.0 }
```

### Multi-Region Service {#multi-region-service}

Weight by traffic distribution:

```json
{
    "us-east": 0.4,
    "us-west": 0.3,
    "eu-west": 0.2,
    "ap-south": 0.1
}
```

Reflects actual user impact if a region goes down.

### SLA-Based Weighting {#sla-based-weighting}

Weight by contractual importance:

```json
{
    "enterprise-api": 0.6,
    "standard-api": 0.3,
    "free-api": 0.1
}
```

Prioritizes monitoring of revenue-generating tiers.
