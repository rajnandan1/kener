---
title: "Auto-Generated Incidents"
description: "Learn how Kener's alerting system can automatically create and manage incidents when monitors detect issues."
---

Kener can automatically create incidents when alert configurations trigger, providing seamless integration between monitoring, alerting, and incident management.

## Overview {#overview}

Auto-generated incidents are created by the alerting system when:

1. An alert configuration triggers (failure threshold reached)
2. The alert is configured with "Create Incident: YES"
3. No active incident already exists for that alert

These incidents are then automatically updated when the alert resolves, providing a complete, automated incident lifecycle.

## How It Works {#how-it-works}

### Alert Trigger → Incident Creation {#alert-to-incident}

When an alert's failure threshold is reached:

**1. Alert Triggers**

- Monitor consistently fails alert condition
- Failure threshold consecutive checks exceeded
- Alert status changes to TRIGGERED

**2. Check Incident Setting**

- Alert configuration has `create_incident = YES`
- Proceeds to incident creation

**3. Create Incident**

- Title: `[Monitor Name] [Alert Type]: [Alert Value]`
- Start Time: When alert triggered
- State: INVESTIGATING
- Source: ALERT
- Status: OPEN

**4. Add Initial Update**

- Markdown-formatted table with alert details
- State: INVESTIGATING (converted to TRIGGERED for alert context)
- Timestamp: Alert trigger time

**5. Add Affected Monitor**

- Monitor that triggered the alert
- Impact: Alert value (DOWN or DEGRADED for STATUS alerts, DOWN for others)

**6. Link Alert to Incident**

- Alert record stores incident_id
- Incident can be traced back to originating alert
- Maintains relationship for automatic updates

**7. Send Notifications**

- All configured triggers receive TRIGGERED notification
- Email, Slack, Discord, Webhook as configured
- Users see incident on status page

### Alert Resolution → Incident Closure {#resolution-to-closure}

When the alert resolves:

**1. Alert Resolves**

- Monitor consistently passes alert condition
- Success threshold consecutive checks exceeded
- Alert status changes to RESOLVED

**2. Check for Linked Incident**

- Alert has associated incident_id
- Incident exists and is not already resolved

**3. Add Resolution Update**

- Calculates total incident duration
- Creates Markdown update with resolution details
- State: RESOLVED
- Timestamp: When alert resolved

**4. Close Incident**

- Incident state → RESOLVED
- End time → Resolution update timestamp
- Monitor removed from incident / returns to realtime

**5. Send Notifications**

- All configured triggers receive RESOLVED notification
- Status page updated to show resolution

## Incident Title Format {#incident-title}

Auto-generated incidents use this title format:

```
[Monitor Name] [Alert Type]: [Alert Value]
```

**Examples:**

```
Payment API STATUS: DOWN
Web Server LATENCY: 1000
Database Connection UPTIME: 99.9
Authentication Service STATUS: DEGRADED
```

**Components:**

- **Monitor Name** - Friendly name of the monitor from configuration
- **Alert Type** - STATUS, LATENCY, or UPTIME
- **Alert Value** - The threshold value (DOWN, DEGRADED, milliseconds, or percentage)

## Initial Update Content {#initial-update}

The first update includes a detailed Markdown table:

```markdown
Alert triggered

| Setting               | Value       |
| :-------------------- | :---------- |
| **Monitor Name**      | Payment API |
| **Monitor Tag**       | payment-api |
| **Incident Status**   | TRIGGERED   |
| **Severity**          | CRITICAL    |
| **Alert Type**        | STATUS      |
| **Alert Value**       | DOWN        |
| **Failure Threshold** | 3           |
```

This provides complete context about:

- Which monitor triggered
- Alert configuration details
- Severity assessment
- Trigger conditions

## Resolution Update Content {#resolution-update}

When the alert resolves, a detailed closure update is added:

```markdown
The alert has been resolved, Total duration: 47 minutes

#### Alert Details

| Setting               | Value       |
| :-------------------- | :---------- |
| **Monitor Name**      | Payment API |
| **Incident Status**   | RESOLVED    |
| **Monitor Tag**       | payment-api |
| **Alert Type**        | STATUS      |
| **Alert Value**       | DOWN        |
| **Severity**          | CRITICAL    |
| **Failure Threshold** | 3           |
| **Success Threshold** | 5           |
```

This includes:

- Total incident duration
- Alert configuration
- Resolution confirmation
- Success threshold that was met

## Configuration Requirements {#configuration-requirements}

To enable auto-generated incidents:

### 1. Create Alert Configuration {#create-alert-config}

Navigate to **Manage > Alerts > Create Alert**

**Configure:**

- Monitor to watch
- Alert type (STATUS, LATENCY, UPTIME)
- Alert value (threshold)
- Failure threshold
- Success threshold
- Severity (CRITICAL or WARNING)

**Enable Incident Creation:**

- Set **Create Incident** to **YES**

See [Alert Configurations](/docs/alerting/alert-configurations) for complete details.

### 2. Configure Triggers (Optional) {#configure-triggers}

While triggers are optional for incident creation, they enable notifications:

**Create Triggers:**

- Discord
- Slack
- Email
- Webhook

**Attach to Alert:**

- Select triggers when creating/editing alert
- Triggers fire on both TRIGGERED and RESOLVED events

See [Triggers](/docs/alerting/triggers) for setup.

## Manual vs Auto-Generated {#manual-vs-auto}

### Identification {#identification}

**Auto-Generated Incidents:**

- Source: ALERT
- Have linked alert_id in database
- Title follows format: `[Monitor] [Type]: [Value]`
- Initial update is formatted table
- Cannot have end_date_time until resolved

**Manual Incidents:**

- Source: DASHBOARD
- No linked alert_id
- Title is user-defined
- Initial update is user-written
- Can have end_date_time set manually

### Behavior Differences {#behavior-differences}

| Aspect         | Auto-Generated                    | Manual                    |
| :------------- | :-------------------------------- | :------------------------ |
| **Creation**   | Automatic on alert trigger        | User-created              |
| **Updates**    | Auto-resolved when alert resolves | Manually updated          |
| **Title**      | System-generated format           | User-defined              |
| **End Time**   | Set on alert resolution           | Set manually or via state |
| **Alert Link** | Yes                               | No                        |
| **Reopening**  | New alert trigger = new incident  | Can be manually reopened  |

### Managing Auto-Generated Incidents {#managing-auto-incidents}

**You Can:**

- Add additional manual updates
- Edit the title
- Add/remove monitors
- Edit timestamps
- Delete the incident

**You Cannot:**

- Prevent automatic resolution update (when alert resolves)
- Disconnect from originating alert
- Manually resolve before alert resolves (it will be auto-reopened)

**Best Practice:** Let auto-generated incidents complete their lifecycle automatically. Add supplementary manual updates as needed for additional context.

## Alert States vs Incident States {#alert-vs-incident-states}

### Alert States {#alert-states}

Alerts have two states:

- **TRIGGERED** - Alert condition met
- **RESOLVED** - Alert condition cleared

### Incident States {#incident-states}

Incidents have four states:

- **INVESTIGATING** - Initial
- **IDENTIFIED** - Root cause found
- **MONITORING** - Fix applied
- **RESOLVED** - Complete

### Mapping {#state-mapping}

**When Alert Triggers:**

- Alert State: TRIGGERED
- Incident created with: INVESTIGATING
- Initial update shows: TRIGGERED (in alert context)

**When Alert Resolves:**

- Alert State: RESOLVED
- Incident updated to: RESOLVED
- Resolution update added

**Manual State Changes:**

- You can manually add updates with IDENTIFIED or MONITORING states
- Helps communicate progress while alert is still active
- Final resolution still happens automatically

## Multiple Alerts, One Monitor {#multiple-alerts-one-monitor}

A monitor can have multiple alert configurations:

**Example:**

```
Monitor: api-gateway

Alert 1: STATUS - DOWN (failure: 1)
Alert 2: LATENCY - 1000ms (failure: 5)
Alert 3: UPTIME - 99.9% (failure: 10)
```

**Each Alert:**

- Can trigger independently
- Creates its own incident
- Has its own lifecycle
- Resolves independently

**Result:**

- Same monitor can appear in multiple incidents simultaneously
- Each incident has different root cause/context
- Users see all active incidents for that monitor

## Notifications {#notifications}

### Trigger Notifications {#trigger-notifications}

When incident is auto-created:

**TRIGGERED Notification Sent:**

- To all triggers configured on the alert
- Includes alert details
- Uses configured templates
- Variable: `is_triggered = true`

When incident is auto-resolved:

**RESOLVED Notification Sent:**

- To same triggers
- Includes resolution details and duration
- Uses configured templates
- Variable: `is_resolved = true`

See [Triggers](/docs/alerting/triggers) and [Templates](/docs/alerting/templates) for customization.

### Subscriber Notifications {#subscriber-notifications}

If subscription system is configured:

**Incident Created:**

- Subscribers receive notification
- Includes initial update
- Links to incident page

**Incident Resolved:**

- Subscribers receive resolution notification
- Includes resolution update
- Shows total duration

See [Subscriptions](/docs/subscriptions) for setup.

## Alert Logs {#alert-logs}

Every alert trigger creates an alert event log:

**Navigate to:** Manage > Alerts > [Alert] > Alert Logs

**Log Includes:**

- Alert ID
- Timestamp (triggered and resolved)
- Status (TRIGGERED or RESOLVED)
- Associated incident ID (if created)
- Actions: View incident, Change status, Delete

**Use Cases:**

- Track alert frequency
- Audit incident creation
- Verify alert configuration
- Analyze patterns

## Troubleshooting {#troubleshooting}

### Incident Not Created {#incident-not-created}

**Check:**

1. Alert configuration has "Create Incident: YES"
2. Alert actually triggered (check alert logs)
3. Alert has required permissions
4. No database errors in logs

**Common Issues:**

- Create Incident set to NO
- Failure threshold not yet reached
- Monitor not actually failing

### Incident Not Auto-Resolving {#incident-not-resolving}

**Check:**

1. Alert actually resolved (check alert logs)
2. Success threshold reached
3. Monitor consistently passing checks
4. Incident still linked to alert

**Common Issues:**

- Success threshold too high
- Monitor still intermittently failing
- Alert was manually deleted
- Incident was manually modified

### Multiple Incidents Created {#multiple-incidents}

**Causes:**

- Multiple alerts on same monitor
- Each alert creates its own incident
- This is expected behavior

**Solution:**

- Each incident tracks different concern
- All are valid
- Close/merge manually if desired

### Notifications Not Sent {#notifications-not-sent}

**Check:**

1. Triggers configured on alert
2. Triggers are active
3. Trigger credentials valid
4. Check trigger logs for errors

See [Troubleshooting Triggers](/docs/alerting/triggers#troubleshooting-triggers) for detailed diagnosing.

## Best Practices {#best-practices}

### Alert Configuration {#alert-config-best-practices}

**Enable Incident Creation For:**

- User-facing service failures
- Critical monitor failures
- Issues requiring communication
- Problems needing timeline

**Don't Enable For:**

- Internal monitoring
- Non-critical services
- Noisy/flaky monitors
- Short-lived issues

### Combining Auto and Manual {#combining-auto-manual}

**Auto-Generated Provides:**

- Automatic detection and creation
- Consistent formatting
- Automatic resolution
- Integration with alerts

**Add Manual Updates For:**

- Root cause analysis
- Progress updates
- Workarounds for users
- Post-mortem information

**Workflow:**

```
1. Alert triggers → Auto-creates incident
2. You investigate → Add IDENTIFIED update
3. You deploy fix → Add MONITORING update
4. Alert resolves → Auto-adds RESOLVED update
5. You add post-mortem → Add final manual update
```

### Threshold Tuning {#threshold-tuning}

**Failure Threshold:**

- Too low: Too many incidents
- Too high: Slow detection
- Start conservative (3-5)

**Success Threshold:**

- Too low: Premature resolution
- Too high: Incidents stay open too long
- Should be ≥ failure threshold

**Iterate:**

- Monitor incident frequency
- Adjust based on false positives/negatives
- Different monitors may need different thresholds

## Next Steps {#next-steps}

- [Alert Configurations](/docs/alerting/alert-configurations) - Set up alerts that create incidents
- [Triggers](/docs/alerting/triggers) - Configure notification channels
- [Incident Updates](/docs/incidents/updates) - Add manual updates to auto-generated incidents
- [Incident Overview](/docs/incidents/overview) - Understand incident basics
