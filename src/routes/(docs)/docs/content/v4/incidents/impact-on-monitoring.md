---
title: "Incident Impact on Monitoring"
description: "Understand how incidents override realtime monitoring data and affect what users see on the status page."
---

One of the most important aspects of Kener's incident system is how incidents interact with realtime monitoring. When a monitor is part of an active incident, the incident's status **takes precedence** over the monitor's realtime check results.

## Why Status Override Matters {#why-override-matters}

Imagine this scenario:

1. Your API is experiencing intermittent issues (only 30% requests failing)
2. Realtime monitoring shows status as "DEGRADED"
3. You investigate and confirm it's a critical issue affecting users
4. You create an incident marking the API as "DOWN"
5. Five minutes later, monitoring catches a successful check and tries to show "UP"

**Without status override:** Your status page would show conflicting information - the monitoring says "UP" but your incident says there's a problem.

**With status override:** The incident's "DOWN" status takes precedence, ensuring users see consistent information while you work on the issue.

## How Status Precedence Works {#how-precedence-works}

Kener evaluates monitor status in the following order (later entries override earlier ones):

### 1. Default Status (Lowest Priority) {#default-status}

If a monitor has a `default_status` configured (UP, DOWN, or DEGRADED), this is applied first.

**Use Case:** Monitors that should show a specific state by default (useful for maintenance or controlled rollouts).

### 2. Realtime Monitoring Data {#realtime-data}

The actual monitoring check results from your configured monitor type (API, Ping, TCP, etc.).

**Normal Operation:** This is what determines status when no incidents or maintenance windows are active.

### 3. Incident Status {#incident-status}

If the monitor is part of any active (non-RESOLVED) incident, the incident's `monitor_impact` overrides the realtime status.

**Active Incidents:** Incidents with state = INVESTIGATING, IDENTIFIED, or MONITORING (not RESOLVED).

### 4. Maintenance Status (Highest Priority) {#maintenance-status}

If the monitor is in a maintenance window, the maintenance's `monitor_impact` takes ultimate precedence.

**Note:** Maintenance is covered separately in the Maintenance documentation.

### Order of Precedence {#precedence-order}

```
Default Status → Realtime → Incident → Maintenance
              (increasing priority →)
```

**Example Scenario:**

```javascript
// Monitor: api-gateway

Default Status:    UP
Realtime Check:    DOWN (503 error)
Incident Impact:   DEGRADED
Maintenance:       (none)

Final Status Shown: DEGRADED (incident overrides realtime DOWN)
```

## Monitor Impact Levels {#impact-levels}

When adding a monitor to an incident, you specify the impact level:

### DOWN {#impact-down}

Monitor is completely unavailable or non-functional.

**When to Use:**

- All requests fail
- Service returns 100% errors
- Critical functionality broken
- Users cannot use the service

**What Users See:**

- Red status indicator
- "Down" or "Offline" label
- Incident linked on monitor page

### DEGRADED {#impact-degraded}

Monitor is partially available or performing poorly.

**When to Use:**

- Increased error rate (but not 100%)
- Slow response times
- Partial functionality unavailable
- Intermittent issues

**What Users See:**

- Yellow/orange status indicator
- "Degraded" label
- Incident linked on monitor page

### MAINTENANCE {#impact-maintenance}

Monitor is undergoing planned maintenance (rare for incidents).

**When to Use:**

- Emergency maintenance during an incident
- Planned fix requiring downtime
- Controlled service disruption

**What Users See:**

- Gray status indicator
- "Maintenance" label
- Incident details available

**Note:** Typically you'd use a Maintenance Window instead of an incident with MAINTENANCE impact.

## Realtime Data Preservation {#data-preservation}

While incident status overrides what users see, Kener preserves the underlying monitoring data:

### Status Override Only {#status-override-only}

When an incident is active:

- **Status** is overridden by incident impact
- **Latency** is preserved from realtime checks
- **Error messages** cascade (see below)
- **Timestamps** remain accurate

**Example:**

```javascript
// During incident marked as DEGRADED:
Realtime Check Result: {
  status: "DOWN",           // Overridden
  latency: 523,            // Preserved ✓
  error_message: "503 error" // See error cascading
}

Status Shown to Users: {
  status: "DEGRADED",      // From incident
  latency: 523,           // From realtime
  type: "INCIDENT"        // Indicator of override
}
```

### Error Message Cascading {#error-cascading}

Error messages follow the same precedence order with cascading:

1. Start with default status error (if any)
2. Override with realtime error (if present)
3. Override with incident error (if present)
4. Override with maintenance error (if present)

**For Incidents:**

- Default error: "Status set by manual incident"
- Realtime errors are preserved unless incident has its own error

### Data Type Indicator {#data-type-indicator}

The monitoring result includes a `type` field indicating the source:

**Possible Values:**

- `REALTIME` - Normal monitoring check
- `INCIDENT` - Status from incident
- `MAINTENANCE` - Status from maintenance
- `DEFAULT_STATUS` - From default status config
- `TIMEOUT` - Check timed out

**Usage:** Helps distinguish between actual checks and manual overrides when analyzing data.

## When Override Starts and Stops {#override-timing}

### Override Begins {#override-begins}

When you add a monitor to an incident with a specific impact:

**Immediately:**

- Monitor status changes to incident impact
- Realtime checks continue in background
- Status page reflects incident status
- Users see incident information

**Note:** The change is immediate upon saving, regardless of when the next monitoring check runs.

### Override Ends {#override-ends}

Override stops when:

**Incident is Resolved:**

- State changes to RESOLVED
- Monitor returns to realtime status
- May take 1-2 minutes to reflect

**Monitor Removed from Incident:**

- Clicking "Remove" on the monitor in incident edit
- Monitor immediately returns to realtime status

**Incident is Closed/Deleted:**

- Incident status set to CLOSED
- All monitors return to realtime
- Historical data retained

### Transition Behavior {#transition-behavior}

When override ends:

**Realtime Status Returns:**

- Next monitoring check determines status
- May show UP, DOWN, or DEGRADED based on actual state
- Users see current realtime data

**Latency Continues:**

- Latency data was never overridden
- Historical latency preserved during incident
- No data gaps in latency charts

## Multiple Incidents for One Monitor {#multiple-incidents}

If a monitor is part of multiple active incidents:

**Precedence Rule:**

- DOWN takes precedence over DEGRADED
- DEGRADED takes precedence over MAINTENANCE
- Most severe impact is shown

**Example:**

```javascript
Monitor: payment-api

Incident A: monitor_impact = DEGRADED
Incident B: monitor_impact = DOWN

Status Shown: DOWN (most severe)
```

**All Incidents Shown:**

- Status page links to all active incidents
- Users can see full context
- Each incident has its own timeline

## Realtime Checks Continue {#realtime-continues}

**Important:** Even when incident overrides status, monitoring checks continue:

**Benefits:**

1. **Data Continuity** - No gaps in latency/uptime data
2. **Automatic Detection** - Catch when issue actually resolves
3. **Alert Triggers** - Alerts still evaluate realtime data
4. **Historical Accuracy** - Complete monitoring history preserved

**What Gets Checked:**

- HTTP endpoints still receive requests
- Ping monitors still send pings
- Database connections still tested
- All monitor types continue normal schedule

**What's Different:**

- Status shown to users is from incident
- Incident state controls timeline
- Manual updates take precedence

## Use Cases and Examples {#use-cases}

### Use Case 1: Partial Outage {#use-case-partial-outage}

**Scenario:**

- 20% of API requests failing
- Monitoring shows DEGRADED (not DOWN)
- But impact to users is severe

**Solution:**

- Create incident with monitor_impact = DOWN
- Incident status (DOWN) overrides realtime (DEGRADED)
- Users see accurate severity
- You maintain control of messaging

### Use Case 2: False Positive Recovery {#use-case-false-positive}

**Scenario:**

- Database connection issues
- Create incident, mark monitor as DOWN
- Monitoring catches one successful check
- Would show UP, but issue still present

**Solution:**

- Incident impact stays DOWN
- Realtime "UP" is overridden
- Users see consistent DOWN status
- You resolve incident only when truly fixed

### Use Case 3: Cascading Failures {#use-case-cascading}

**Scenario:**

- Backend service fails
- Affects 5 frontend monitors
- Some show DOWN, some DEGRADED based on retry logic

**Solution:**

- Create single incident
- Add all 5 monitors
- Set appropriate impact for each
- Users see coordinated incident
- Single timeline for all affected services

### Use Case 4: Silent Issue {#use-case-silent-issue}

**Scenario:**

- Service technically "UP" (responds to checks)
- But returns incorrect data
- Monitoring shows UP
- Users are affected

**Solution:**

- Create incident
- Add monitor with impact DEGRADED or DOWN
- Override realtime UP status
- Communicate the actual issue to users
- Resolve when data quality restored

## Monitoring During Incidents {#monitoring-during}

### Viewing Realtime Data {#viewing-realtime}

**Dashboard View:**

- Incident page shows incident status
- Monitor page shows incident indicator
- Historical charts show realtime data points
- Can distinguish incident period in charts

**API Access:**

- API returns both realtime and effective status
- `status` = shown to users (incident override)
- `realtime_status` = actual check result (if applicable)
- `type` field indicates source

### Alert Behavior {#alert-behavior}

**Alerts Continue:**

- Alert configurations still evaluate realtime data
- Can trigger during incidents
- Can help detect resolution
- Can create additional incidents if configured

**Best Practice:**

- May want to temporarily disable alerts for monitors in incidents
- Prevents alert fatigue
- Focus on incident resolution
- Re-enable after incident resolves

## Best Practices {#best-practices}

### Accurate Impact Levels {#accurate-impact}

**Be Honest:**

- Use DOWN when truly down
- Use DEGRADED when partially available
- Don't downplay severity

**Update as Needed:**

- Change impact if situation changes
- DOWN → DEGRADED during partial recovery
- DEGRADED → DOWN if worsening

### Remove When Recovered {#remove-when-recovered}

**Individual Monitor Recovery:**

- If one monitor recovers but incident ongoing
- Remove that monitor from incident
- Lets realtime status show
- Other monitors remain in incident

**Don't Leave Lingering:**

- Remove monitors as they recover
- Keep incident scope accurate
- Users see correct per-monitor status

### Coordinate with Updates {#coordinate-updates}

**State and Status Should Match:**

- If changing state to MONITORING, impact might reduce to DEGRADED
- If state is RESOLVED, remove monitors or close incident
- Keep timeline and status consistent

## Next Steps {#next-steps}

- [Incident Updates](/docs/incidents/updates) - Learn how to update incident state and communicate progress
- [Creating and Managing Incidents](/docs/incidents/creating-managing) - Back to incident management basics
- [Auto-Generated Incidents](/docs/incidents/auto-generated) - How alerts automatically create and manage incidents
