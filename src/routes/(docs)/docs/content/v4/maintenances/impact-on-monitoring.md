---
title: "Maintenance Impact on Monitoring"
description: "How maintenance windows affect monitor status display and the precedence rules for status during maintenance events."
---

This guide explains how maintenance events impact the status displayed for monitors on your status page, and the precedence rules that determine which status is shown.

## Status Override Concept {#status-override}

When a maintenance event is **ONGOING**, the monitor statuses on your status page are temporarily **overridden** to show the configured maintenance impact instead of realtime monitoring data.

**Key Principle:** During maintenance, users see the **expected** status (configured in maintenance), not the actual monitoring results.

**Why Override?**

- Prevents false alarms during planned work
- Communicates expected behavior to users
- Distinguishes planned vs unplanned disruptions

## Monitor Status Precedence {#status-precedence}

Kener uses a precedence system to determine which status to display for a monitor. Higher priority statuses override lower ones.

### Precedence Order (Highest to Lowest) {#precedence-order}

```
1. Maintenance Event (ONGOING)
2. Active Incident
3. Realtime Monitoring Data
4. Default Monitor Status
```

**How it Works:**

1. Check if monitor is in an ONGOING maintenance event → Use maintenance impact
2. Else, check if monitor is in an OPEN incident → Use incident impact
3. Else, use latest realtime monitoring data
4. If no data, use monitor's default status

### Detailed Precedence Rules {#detailed-rules}

#### 1. Maintenance Event Status (Highest Priority) {#maintenance-priority}

**When:** Maintenance event status is **ONGOING** and monitor is affected

**Override:** Monitor shows the configured **monitor_impact** from maintenance

**Example:**

```
Monitor: API Server
Realtime Status: UP (all checks passing)
Maintenance: ONGOING
Monitor Impact: MAINTENANCE

Displayed Status: MAINTENANCE
```

**Rationale:** Users need to know service is under maintenance, even if currently responding.

#### 2. Active Incident Status {#incident-priority}

**When:** Incident status is **OPEN** and monitor is affected

**Override:** Monitor shows the configured **monitor_impact** from incident

**Example:**

Monitor: Database
Realtime Status: UP (checks passing now)
Incident: OPEN
Monitor Impact: DOWN

Displayed Status: DOWN
title: Impact on Monitoring
description: How maintenance events affect displayed monitor status
**Rationale:** Incident status takes precedence over current checks during active issues.

During an **ONGOING** maintenance event, maintenance impact can override monitor status shown to users.

## Status precedence {#status-precedence}

Kener resolves status in this order (later overrides earlier):

`default status → realtime monitor result → incident impact → maintenance impact`

So maintenance has the highest effective priority when active.

## Impact values {#impact-values}

Monitor: Web Server
Set per monitor in a maintenance:

- `MAINTENANCE` (recommended)
- `DOWN`
- `DEGRADED`
- `UP`

Choose the value that matches expected user impact during the window.

## Event lifecycle behavior {#event-lifecycle-behavior}

- `SCHEDULED` / `READY`: no override yet
- `ONGOING`: override active
- `COMPLETED` / `CANCELLED`: override removed

## Realtime monitoring still runs {#realtime-monitoring-still-runs}

Monitor: New Service
Even during maintenance, checks continue and data is recorded.
Default Status: UP
Maintenance changes **displayed/effective** status, not monitor execution.
Displayed Status: UP

## Practical guidance {#practical-guidance}

- Prefer `MAINTENANCE` for planned work communication.
- Use `DOWN` only when service is expected to be unavailable.
- Avoid overlapping maintenances on the same monitor.

## Related guides {#related-guides}

- [Maintenances Overview](/docs/v4/maintenances/overview)
- [Maintenance Events](/docs/v4/maintenances/events)
- [Creating and Managing Maintenances](/docs/v4/maintenances/creating-managing)

**Visual:** Red, X icon

**Meaning:** Service is completely unavailable

**When to Use:**

- Service will be offline
- No access during maintenance
- Total outage expected

**User Interpretation:** "Service is unavailable"

**Example:**

```yaml
Monitor: Database Server
Impact: DOWN
During Event: Shows red "Down for Maintenance"
```

### DEGRADED {#degraded-impact}

**Visual:** Yellow, warning icon

**Meaning:** Service is partially available or slow

**When to Use:**

- Service in read-only mode
- Reduced capacity
- Slower response times expected

**User Interpretation:** "Service has limited functionality"

**Example:**

```yaml
Monitor: API Server
Impact: DEGRADED
During Event: Shows yellow "Degraded Performance"
```

### UP {#up-impact}

**Visual:** Green, checkmark icon

**Meaning:** Service is fully operational

**When to Use:**

- Rare, for non-disruptive maintenance
- Adding monitoring to existing service
- Backend work with no user impact

**User Interpretation:** "Service is operational"

**Example:**

```yaml
Monitor: Web Server
Impact: UP
During Event: Shows green "Operational" (rare use case)
```

## Status During Event Lifecycle {#status-during-lifecycle}

Monitor status override behavior changes based on event status:

### SCHEDULED Events {#scheduled-events}

**Override:** ❌ No

**Displayed Status:** Realtime monitoring data

**Visibility:** Event shown in "Upcoming Maintenances" section

**Example:**

```
Event Status: SCHEDULED
Event Start: In 3 hours
Monitor Status: UP (from realtime checks)
Display: UP (no override yet)
```

### READY Events {#ready-events}

**Override:** ❌ No

**Displayed Status:** Realtime monitoring data

**Visibility:** Event shown as "Starting Soon", notification sent

**Example:**

```
Event Status: READY
Event Start: In 45 minutes
Monitor Status: UP (from realtime checks)
Display: UP (no override yet)
```

### ONGOING Events {#ongoing-events}

**Override:** ✅ Yes

**Displayed Status:** Configured maintenance impact

**Visibility:** Event prominently displayed, monitors show maintenance status

**Example:**

```
Event Status: ONGOING
Monitor Impact: MAINTENANCE
Monitor Realtime: UP
Display: MAINTENANCE (override active)
```

### COMPLETED Events {#completed-events}

**Override:** ❌ No

**Displayed Status:** Realtime monitoring data (restored)

**Visibility:** Event shown in "Past Maintenances" section

**Example:**

```
Event Status: COMPLETED
Monitor Impact: (was MAINTENANCE)
Monitor Realtime: UP
Display: UP (override removed)
```

### CANCELLED Events {#cancelled-events}

**Override:** ❌ No

**Displayed Status:** Realtime monitoring data

**Visibility:** Event marked as cancelled in history

## Multiple Maintenances on Same Monitor {#multiple-maintenances}

If multiple maintenance events are ONGOING for the same monitor simultaneously:

**Precedence:** First maintenance event found (by database query order)

**Behavior:**

1. Query finds all ONGOING maintenance events for monitor
2. Use impact from first event returned
3. Others are ignored for status purposes

**Example:**

```
Monitor: API Server

Maintenance A: ONGOING
- Impact: DOWN
- Event ID: 101

Maintenance B: ONGOING
- Impact: DEGRADED
- Event ID: 102

Result: Whichever is returned first by query wins
Recommendation: Avoid overlapping maintenances
```

**Best Practice:** Don't schedule overlapping maintenances for the same monitor.

## Realtime Monitoring During Maintenance {#realtime-during-maintenance}

**Key Point:** Realtime monitoring **continues** during maintenance events.

**What Happens:**

1. Monitor checks continue to run on schedule
2. Data is recorded in `monitoring_data` table
3. Status page shows maintenance impact (override)
4. Backend data available for analysis

**Why Continue Monitoring?**

- Verify service comes back after maintenance
- Detect unexpected issues during maintenance
- Maintain complete monitoring history
- Automatic transition when maintenance ends

**Example:**

```
During ONGOING maintenance event:

Monitor Checks:
- 3:00 AM: DOWN (expected, service offline)
- 3:15 AM: DOWN
- 3:30 AM: DOWN
- 3:45 AM: UP (service restored)
- 4:00 AM: UP

Status Page Display:
- 3:00-4:00 AM: MAINTENANCE (override)
- After 4:00 AM: UP (realtime, override removed)

Backend Data: All checks recorded
```

## Impact on Uptime Calculations {#impact-on-uptime}

Maintenance windows affect uptime calculations based on your monitor configuration:

### Default Behavior {#default-uptime-behavior}

**Maintenance Status Impact:**

- MAINTENANCE impact: **Excluded** from downtime (treated as UP)
- DOWN impact: **Included** in downtime
- DEGRADED impact: Depends on `include_degraded_in_downtime` setting

**Rationale:** Planned maintenance shouldn't penalize uptime metrics.

### Configuration {#uptime-configuration}

Monitor setting: `include_degraded_in_downtime`

- `"YES"` - DEGRADED counts as downtime
- `"NO"` - DEGRADED counts as uptime

### Examples {#uptime-examples}

**Scenario 1: Maintenance Impact = MAINTENANCE**

```
Monitor: API Server
Maintenance: 1 hour MAINTENANCE impact
Realtime Data: DOWN during maintenance
Uptime Calculation: Excluded from downtime
Result: Uptime maintained at ~100%
```

**Scenario 2: Maintenance Impact = DOWN**

```
Monitor: Database
Maintenance: 1 hour DOWN impact
Realtime Data: DOWN during maintenance
Uptime Calculation: Counted as downtime
Result: Uptime reduced
```

**Scenario 3: Maintenance Impact = DEGRADED**

```
Monitor: API Server
Maintenance: 1 hour DEGRADED impact
include_degraded_in_downtime: NO
Uptime Calculation: Counted as uptime
Result: Uptime maintained
```

## Status Page Display {#status-page-display}

### Home Page {#home-page-display}

**Ongoing Maintenances Section:**

- Listed at top of page
- Shows maintenance title and affected monitors
- Monitors display maintenance impact status
- Countdown/duration shown

**Monitor List:**

- Monitors show override status during ONGOING events
- Badge/icon indicates under maintenance
- Tooltip explains maintenance in progress

### Monitor Detail Page {#monitor-detail-page}

**Status Banner:**

- Shows current status (maintenance override if applicable)
- "Under Maintenance" banner when override active
- Link to maintenance event details

**Status History Chart:**

- Maintenance periods highlighted
- Different visualization for maintenance vs incidents
- Clearly distinguishable from actual downtime

**Uptime Stats:**

- Calculated according to configuration
- Maintenance windows may be excluded
- Footnote explains calculation method

### Maintenance Events Page {#events-page}

Dedicated page showing:

- All ongoing maintenances
- Upcoming maintenances (next N days)
- Past maintenances (last N days)
- Filterable by monitor, date range

## Troubleshooting {#troubleshooting}

**Problem:** Monitor still shows DOWN during ONGOING maintenance

**Solutions:**

- Verify event status is exactly "ONGOING" (not READY or SCHEDULED)
- Check monitor is in `maintenance_monitors` table for this event
- Verify maintenance status is ACTIVE
- Check current time is between start and end time

**Problem:** Maintenance ended but monitor still shows MAINTENANCE

**Solutions:**

- Wait for status update scheduler (runs every minute)
- Check event status transitioned to COMPLETED
- Verify current time is past end_date_time
- Check for overlapping maintenance events

**Problem:** Monitor shows realtime status during maintenance

**Solutions:**

- Verify event status is ONGOING (not SCHEDULED or READY)
- Check monitor_tag matches exactly
- Verify maintenance is ACTIVE
- Check status precedence (incident may override maintenance)

**Problem:** Uptime affected by maintenance window

**Solutions:**

- Check monitor impact level (DOWN counts as downtime)
- Use MAINTENANCE impact to exclude from downtime
- Verify uptime calculation formula in monitor settings
- Review `include_degraded_in_downtime` setting

## Best Practices {#best-practices}

**Use MAINTENANCE Impact:**

```
✅ Impact: MAINTENANCE
Reason: Clear communication, excluded from downtime
```

**Use DOWN Only When Truly Offline:**

```
✅ Impact: DOWN for complete outage
❌ Impact: DOWN for partial degradation
```

**Avoid Overlapping Maintenances:**

```
✅ Schedule maintenances at different times
❌ Multiple ONGOING events for same monitor
```

**Match Impact to Reality:**

```
✅ Database offline → DOWN
✅ Read-only mode → DEGRADED
✅ Backend update, no user impact → MAINTENANCE or UP
```

**Communicate Clearly:**

```
Title: "Database Upgrade to v2.0"
Impact: DOWN
Description: "Database will be completely offline during this window"
```

## Next Steps {#next-steps}

- [Maintenance Events](/docs/maintenances/events) - Learn about event lifecycle and status transitions
- [Creating and Managing Maintenances](/docs/maintenances/creating-managing) - How to configure monitor impacts
- [RRULE Patterns](/docs/maintenances/rrule-patterns) - Advanced scheduling patterns
