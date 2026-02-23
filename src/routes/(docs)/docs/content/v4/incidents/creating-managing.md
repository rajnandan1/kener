---
title: "Creating and Managing Incidents"
description: "Learn how to create new incidents, edit incident details, and manage affected monitors in Kener."
---

This guide covers how to create and manage incidents through the Kener dashboard.

## Accessing Incident Management {#accessing-incidents}

Navigate to **Manage > Incidents** or visit `/manage/app/incidents` to view and manage all incidents.

The incidents dashboard shows:

- All open incidents
- Current state of each incident
- Duration (ongoing or total)
- Affected monitors count
- Quick actions to edit incidents

## Creating a New Incident {#creating-new-incident}

Click **New Incident** to create a new incident.

### Step 1: Basic Information {#basic-information}

#### Title (Required) {#title}

A clear, concise description of the issue that will be visible to users.

**Best Practices:**

- Be specific but brief
- Mention the affected service
- Avoid internal jargon
  title: Creating and Managing Incidents
  description: Create incidents, add affected monitors, post updates, and resolve incidents

- ✅ "API Gateway Responding Slowly"
  Use **Manage → Incidents** to create and manage incidents.
- ❌ "DB01 high CPU" (too technical)

## Create an incident {#create-an-incident}

1. Open **New Incident**.
2. Fill required fields:
    - **Title**
    - **Start Date/Time** (entered in local timezone)
3. Optional:
    - **Global visibility** toggle
    - Initial update message
4. Add affected monitors (optional but recommended).
5. Click **Create Incident**.

## Add affected monitors {#add-affected-monitors}

For each monitor, set an impact:

- `DOWN`
- `DEGRADED`

You can add, remove, and change impact while editing the incident.

- Can be in the past (for recording historical incidents)

## Add updates and change state {#add-updates-and-change-state}

Updates are timeline entries shown to users. When posting an update, choose a state:

- `INVESTIGATING`
- `IDENTIFIED`
- `MONITORING`
- `RESOLVED`

When set to `RESOLVED`, the incident closes and end time is recorded.

## Edit an incident {#edit-an-incident}

You can edit:

- Title
- Start time
- Global visibility
- Affected monitors and impact

Save changes to apply them immediately.

## Delete incident {#delete-incident}

**Affected Services:**
Incidents can be deleted from the incident edit view.

- REST API
    > [!WARNING]
    > Deletion is irreversible and removes incident timeline context.

## Good practices {#good-practices}

- Keep titles user-facing and clear.
- Add regular, concise updates during active incidents.
- Keep monitor impact accurate as recovery progresses.

## Related guides {#related-guides}

- [Incidents Overview](/docs/v4/incidents/overview)
- [Impact on Monitoring](/docs/v4/incidents/impact-on-monitoring)
- [Alert Configurations](/docs/v4/alerting/alert-configurations)

**What Changes Immediately:**

- Title updates on status page
- Monitor list and impacts update
- Start time reflected in duration calculation
- Changes visible to all users

## Incident States and Progression {#incident-states}

While you cannot directly change state when editing, understanding state progression helps you manage incidents effectively.

### States Review {#states-review}

1. **INVESTIGATING** - Initial state, team investigating
2. **IDENTIFIED** - Root cause found
3. **MONITORING** - Fix applied, monitoring stability
4. **RESOLVED** - Issue fully resolved

### Recommended Progression {#recommended-progression}

**Typical Path:**

```
INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED
```

**Quick Resolution Path:**

```
INVESTIGATING → RESOLVED
```

**Extended Investigation:**

```
INVESTIGATING → IDENTIFIED → MONITORING → INVESTIGATING → IDENTIFIED → MONITORING → RESOLVED
```

**Note:** States can move backward if issues recur or fixes are ineffective.

## Best Practices {#best-practices}

### Incident Creation {#creation-best-practices}

**Create incidents when:**

- Multiple users report issues
- Monitoring detects significant problems
- Service quality degrades noticeably
- You want to proactively communicate

**Avoid creating incidents for:**

- Minor, localized issues
- Issues that auto-recover in seconds
- False alarms
- Non-user-facing problems (unless they might escalate)

### Title Guidelines {#title-guidelines}

**Good Titles:**

- "Payment Processing Delays"
- "Search Functionality Unavailable"
- "Elevated API Error Rates"
- "Slow Dashboard Loading Times"

**Poor Titles:**

- "Server 03 Down" (too technical)
- "Issue" (too vague)
- "URGENT!!!" (inappropriate tone)
- "Users complaining" (unprofessional)

### Monitor Selection {#monitor-selection-best-practices}

**Be Accurate:**

- Only include truly affected monitors
- Update impacts as situation changes
- Remove monitors that recover

**Be Comprehensive:**

- Include all affected user-facing services
- Don't forget related monitors
- Consider downstream impacts

### Timing {#timing-best-practices}

**Start Time:**

- Set to when users first experienced issues
- Not when your team first noticed
- Check logs for accurate time

**Updates:**

- Add updates regularly (every 15-30 minutes for critical issues)
- Include substantive information
- See [Incident Updates](/docs/incidents/updates)

## Filtering and Organization {#filtering-organization}

### State Filter {#state-filter}

Use the state dropdown to filter incidents:

- **All States** - Show all incidents
- **Investigating** - Only investigating incidents
- **Identified** - Only identified incidents
- **Monitoring** - Only monitoring incidents
- **Resolved** - Only resolved incidents

### Pagination {#pagination}

Incidents are displayed 10 per page. Use pagination controls to navigate through multiple pages.

## Deleting Incidents {#deleting-incidents}

To delete an incident:

1. Open the incident for editing
2. Scroll to **Danger Zone**
3. Click **Delete Incident**
4. Confirm deletion

**Warning:** This action cannot be undone.

**What Gets Deleted:**

- The incident record
- All incident updates (comments)
- Monitor-incident associations

**What Remains:**

- Monitors (unaffected)
- Alert configurations (if incident was auto-generated)
- Historical monitoring data

## Next Steps {#next-steps}

- [Incident Updates](/docs/incidents/updates) - Learn how to add updates and change incident state
- [Incident Impact on Monitoring](/docs/incidents/impact-on-monitoring) - Understand how incidents affect monitor status
- [Auto-Generated Incidents](/docs/incidents/auto-generated) - Configure alerts to create incidents automatically
