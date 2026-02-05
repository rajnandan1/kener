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

**Examples:**

- ✅ "API Gateway Responding Slowly"
- ✅ "Database Connection Issues"
- ❌ "DB01 high CPU" (too technical)
- ❌ "Issue" (too vague)

#### Start Date/Time (Required) {#start-datetime}

When did the incident begin?

**Important Notes:**

- Enter time in **your local timezone**
- Kener stores it as UTC internally
- Use datetime picker or type manually
- Can be in the past (for recording historical incidents)
- Should reflect when users were first affected

**Default:** Current date and time

### Step 2: Initial Update (Optional) {#initial-update}

Provide an initial status update describing what's happening.

**Format:** Supports Markdown formatting

**When to Use:**

- Describing initial symptoms
- Explaining known scope
- Setting expectations

**Example:**

```markdown
We're experiencing elevated error rates on our API endpoints.
Our team is investigating the root cause.

**Affected Services:**

- REST API
- Webhook delivery

**Not Affected:**

- Dashboard UI
- Data exports
```

**Note:** This becomes the first update in the incident timeline with state "INVESTIGATING".

### Step 3: Affected Monitors (Optional) {#affected-monitors}

Select which monitors are impacted by this incident.

#### Adding Monitors {#adding-monitors}

1. Click **Add Monitor**
2. Select a monitor from the dropdown
3. Choose the impact level:
    - **DOWN** - Service completely unavailable
    - **DEGRADED** - Service partially available or slow
4. Click **Add Monitor**

#### Multiple Monitors {#multiple-monitors}

You can add multiple monitors to a single incident. This is useful when:

- A backend issue affects multiple frontend services
- Infrastructure problems impact several applications
- Related services are all experiencing issues

#### Impact Level Guidance {#impact-guidance}

**Use DOWN when:**

- Monitor returns 100% errors
- Service is completely inaccessible
- All requests fail
- Critical functionality broken

**Use DEGRADED when:**

- Monitor returns some errors (not all)
- Service is slow but functional
- Partial functionality unavailable
- Intermittent issues

**Important:** The impact level you select here **overrides** the monitor's realtime status during the incident. See [Incident Impact on Monitoring](/docs/incidents/impact-on-monitoring) for details.

### Step 4: Create {#create-incident}

Click **Create Incident** to save the incident.

**What Happens Next:**

- Incident is created with state "INVESTIGATING"
- If initial update provided, it's added as first comment
- Affected monitors immediately show the incident status
- Incident appears on public status page
- Incident is assigned a unique ID

## Editing an Existing Incident {#editing-incident}

Click the **Edit** button (pencil icon) on any incident to modify it.

### Editable Fields {#editable-fields}

#### Title {#edit-title}

You can change the incident title at any time. The change is immediate and reflects on the public status page.

**When to Edit:**

- Initial title was unclear
- Scope changed (add/remove affected services)
- More specific information available

#### Start Date/Time {#edit-start-datetime}

You can adjust when the incident actually started.

**When to Edit:**

- Initial entry was incorrect
- Discovered issue started earlier than reported
- Aligning timeline with logs

**Cannot Change:**

- Cannot set start time to future
- Cannot set start time after end time (if incident is resolved)

#### State {#edit-state}

**State is controlled by updates, not direct editing.** To change an incident's state, you must add an update (comment) with the new state.

See [Incident Updates](/docs/incidents/updates) for details.

### Managing Affected Monitors {#managing-monitors}

While editing an incident, you can:

#### Add More Monitors {#add-more-monitors}

Click **Add Monitor** and select additional monitors to add to the incident.

**Use Cases:**

- Issue scope expanded
- Additional services affected
- Related problem discovered

#### Change Monitor Impact {#change-impact}

Click the **⋮** (three dots) menu on a monitor and select:

- **Down** - Change impact to DOWN
- **Degraded** - Change impact to DEGRADED

**Use Cases:**

- Partial recovery (DOWN → DEGRADED)
- Worsening situation (DEGRADED → DOWN)
- More accurate assessment available

#### Remove Monitors {#remove-monitors}

Click the **⋮** (three dots) menu on a monitor and select **Remove**.

**Use Cases:**

- Monitor recovered (but incident ongoing for others)
- Incorrectly added
- Issue was unrelated

**Important:** Removing a monitor immediately restores its realtime monitoring status on the status page.

### Saving Changes {#saving-changes}

Click **Save Changes** to apply your edits.

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
