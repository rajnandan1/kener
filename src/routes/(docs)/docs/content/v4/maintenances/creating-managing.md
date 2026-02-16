---
title: "Creating and Managing Maintenances"
description: "Learn how to create, edit, and manage maintenance windows in Kener using the dashboard interface."
---

This guide covers how to create and manage maintenance windows through the Kener management dashboard.

## Accessing Maintenances {#accessing-maintenances}

Navigate to the maintenances section:

1. Log into the management dashboard at `/manage/app`
2. Click **Maintenances** in the sidebar
3. You'll see a list of all existing maintenances

From here you can:

- View all maintenances (filter by ACTIVE/INACTIVE/ALL)
- Create new maintenances
- Edit existing maintenances
- View maintenance events

## Creating a Maintenance {#creating-maintenance}

### Step 1: Start Creation {#step-1-start}

Click the **New Maintenance** button in the top-right corner of the maintenances list page.

### Step 2: Choose Schedule Type {#step-2-schedule-type}

Select whether this is a one-time or recurring maintenance:

**One-Time:**

- Occurs exactly once
- Ideal for migrations, upgrades, one-off work
- RRULE automatically set to `FREQ=MINUTELY;COUNT=1`

**Recurring:**

- Repeats on a schedule
- Ideal for regular updates, backups, routine maintenance
- Configure frequency and pattern

### Step 3: Basic Information {#step-3-basic-info}

**Title** (Required)

- Keep it concise and descriptive
- Examples: "Weekly Security Updates", "Database Migration"

**Description** (Optional)

- Provide details about the maintenance work
- What's being done and why
- Any user-facing impacts
- Supports Markdown formatting

**Example:**

```markdown
**What:** Upgrading database servers to latest version
**Why:** Security patches and performance improvements
**Impact:** Read-only mode during maintenance
```

### Step 4: Schedule Configuration {#step-4-schedule}

#### For One-Time Maintenances {#one-time-schedule}

**Start Date/Time** (Required)

- Select the exact date and time when maintenance begins
- Time is in your local timezone
- Stored in UTC internally

**Example:**

```
Start: May 15, 2026 at 2:00 AM
```

#### For Recurring Maintenances {#recurring-schedule}

**First Occurrence Date/Time** (Required)

- Select when the first maintenance occurrence happens
- Subsequent occurrences use this same time of day
- Date determines the starting point for the recurrence pattern

**RRULE Pattern** (Required)

Enter an iCalendar RRULE pattern directly or use the quick pattern buttons:

**Quick Pattern Buttons:**

- **Every Sunday** - `FREQ=WEEKLY;BYDAY=SU`
- **Every Day** - `FREQ=DAILY`
- **Weekdays** - `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`
- **Every Monday** - `FREQ=WEEKLY;BYDAY=MO`
- **Bi-weekly Monday** - `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO`
- **First of Month** - `FREQ=MONTHLY;BYMONTHDAY=1`

Click any button to automatically fill the RRULE field. You can also type a custom RRULE pattern directly.

**Preview Dates:**

As you configure the RRULE and start time, the form shows the next 5 upcoming occurrences based on your pattern. This helps verify your recurrence configuration is correct.

**Examples:**

_Weekly on Sundays:_

```
RRULE: FREQ=WEEKLY;BYDAY=SU
```

_Bi-weekly on Mondays:_

```
RRULE: FREQ=WEEKLY;INTERVAL=2;BYDAY=MO
```

_Daily:_

```
RRULE: FREQ=DAILY
```

_First of every month:_

```
RRULE: FREQ=MONTHLY;BYMONTHDAY=1
```

For more complex patterns, see the [RRULE Patterns](/docs/maintenances/rrule-patterns) documentation.

### Step 5: Duration {#step-5-duration}

Specify how long each maintenance window lasts:

**Hours** (Required)

- 0-72 hours
- Whole number

**Minutes** (Required)

- 0-59 minutes
- Whole number

**Total Duration:**
The system calculates `duration_seconds = (hours × 3600) + (minutes × 60)`

**Examples:**

- 30 minutes: Hours=0, Minutes=30 → 1800 seconds
- 2 hours: Hours=2, Minutes=0 → 7200 seconds
- 2.5 hours: Hours=2, Minutes=30 → 9000 seconds

**Note:** Duration applies to **each** occurrence of the maintenance, not the entire maintenance period.

### Step 6: Affected Monitors {#step-6-monitors}

Select which monitors are affected by this maintenance:

#### Selecting Monitors {#selecting-monitors}

1. Check the boxes next to monitors you want to include
2. All active monitors are available for selection
3. You can select multiple monitors

#### Setting Monitor Impact {#setting-impact}

For each selected monitor, choose its status during maintenance:

**UP**

- Monitor remains operational
- Rare, for non-disruptive maintenance
- Example: Adding monitoring to existing service

**DOWN**

- Monitor completely unavailable
- Use for services that will be offline
- Example: Server restart

**DEGRADED**

- Monitor partially available or slow
- Use for services with reduced capacity
- Example: Read-only database mode

**MAINTENANCE** (Recommended)

- Shows as under maintenance
- Clear communication to users
- Example: General maintenance work

**Best Practice:** Use MAINTENANCE status when possible for clarity.

**Example Configuration:**

```
Monitors:
- API Server → MAINTENANCE
- Database → DOWN
- Frontend → DEGRADED
```

### Step 7: Review and Create {#step-7-create}

Review your configuration:

- Check schedule type and RRULE (displayed at bottom)
- Verify duration calculation
- Confirm affected monitors and their impacts

Click **Create Maintenance** to save.

**What Happens Next:**

1. Maintenance is created with status ACTIVE
2. Events are generated:
    - One-Time: 1 event created immediately
    - Recurring: Events for next 7 days created
3. Events appear on the status page according to their timing

## Editing a Maintenance {#editing-maintenance}

### Accessing Edit Mode {#accessing-edit}

From the maintenances list:

1. Click on a maintenance row, or
2. Click the pencil icon in the Actions column

### What You Can Edit {#what-can-edit}

**Always Editable:**

- Title
- Description
- Status (ACTIVE/INACTIVE)
- Affected monitors and their impacts

**Schedule Editable With Caution:**

- Start date/time
- RRULE (frequency, interval, days)
- Duration

**Warning:** Changing schedule settings affects event generation:

- **One-Time:** Non-completed events deleted, new event created
- **Recurring:** Future SCHEDULED events deleted, new events generated

### Editing Schedule {#editing-schedule}

When you edit start time, RRULE, or duration:

**For One-Time Maintenances:**

1. All non-completed events are deleted
2. A new event is generated with the updated schedule
3. ONGOING or COMPLETED events are preserved

**For Recurring Maintenances:**

1. Future SCHEDULED events are deleted
2. New events are generated for the next 7 days
3. READY, ONGOING, and COMPLETED events are preserved

**Example Scenario:**

```
Original: Every Sunday at 3 AM for 1 hour
Edited to: Every Sunday at 4 AM for 2 hours

Result:
- All SCHEDULED events deleted
- New events created: Every Sunday at 4 AM, 2-hour duration
- Currently ONGOING or past COMPLETED events unchanged
```

### Editing Monitors {#editing-monitors}

Adding or removing monitors:

1. Check/uncheck monitors in the selection area
2. For new monitors, set their impact status
3. Save changes

**Effect:**

- Applies immediately to all future events
- Does not retroactively change past events

### Changing Status {#changing-status}

Toggle between ACTIVE and INACTIVE:

**ACTIVE → INACTIVE:**

- Stops new event generation
- Existing events remain (must manually cancel/delete if needed)
- Maintenance hidden from users

**INACTIVE → ACTIVE:**

- Resumes event generation for recurring maintenances
- Events generated for next 7 days

### Deleting a Maintenance {#deleting-maintenance}

Click the **Delete** button at the bottom of the edit page.

**Warning:** This action:

1. Deletes the maintenance record permanently
2. Deletes **all** associated events (past and future)
3. Cannot be undone

**Confirmation Required:** You must confirm deletion before it proceeds.

**Alternative:** Instead of deleting, consider setting status to INACTIVE to preserve historical data.

## Managing Events {#managing-events}

### Viewing Events {#viewing-events}

On the maintenance edit page, scroll down to see the **Maintenance Events** section.

Events are displayed with:

- Status badge (SCHEDULED, READY, ONGOING, COMPLETED, CANCELLED)
- Start and end date/time
- Duration
- Current event highlighted

### Event Actions {#event-actions}

**Cancel Individual Event:**

1. Click the trash icon next to an event
2. Confirm cancellation
3. Event status changes to CANCELLED

**Note:** You cannot edit individual events directly. Changes must be made at the maintenance level.

### Event Status Indicators {#event-status-indicators}

**Ongoing:**

- Green badge
- Event is currently in progress
- Monitor statuses overridden

**Upcoming:**

- Blue badge with countdown
- Shows "In X hours/days"
- Event scheduled for future

**Completed:**

- Gray badge
- Event finished
- Historical record only

## Maintenance List View {#list-view}

The maintenances list page shows:

### Filters {#filters}

**Status Filter:**

- ALL - Show all maintenances
- ACTIVE - Only active maintenances
- INACTIVE - Only inactive maintenances

### Table Columns {#table-columns}

**ID**

- Unique maintenance identifier
- Used in API calls

**Title**

- Hover to see full title and description

**Type**

- One-Time (calendar icon)
- Recurring (repeat icon)

**Duration**

- Shows maintenance window length
- Hover for full details (start time, RRULE)

**Monitors**

- Count of affected monitors
- Hover to see monitor tags

**Next Event**

- Shows upcoming or current event
- Badge indicates status
- Hover for event details

**Status**

- ACTIVE (blue) or INACTIVE (gray)

**Actions**

- Edit button (pencil icon)

### Pagination {#pagination}

- 10 maintenances per page
- Navigate with Previous/Next buttons
- Shows "X-Y of Z total"

## Best Practices {#best-practices}

**Clear Titles:**
Use descriptive, concise titles that immediately communicate the maintenance purpose.

```
✅ Weekly Security Updates
✅ Monthly Database Optimization
❌ Maintenance
❌ Work
```

**Detailed Descriptions:**
Include what, why, and impact in descriptions.

```markdown
**What:** Upgrading Kubernetes cluster to v1.28
**Why:** Security patches and new features
**Impact:** Services remain available, brief restarts possible
```

**Appropriate Impact Levels:**

- Use MAINTENANCE for general maintenance
- Use DOWN only when truly unavailable
- Use DEGRADED for reduced capacity

**Advance Notice:**
Schedule maintenances with sufficient lead time:

- Critical systems: 7+ days notice
- Regular maintenance: 2-3 days notice
- Emergency work: As much notice as possible

**Recurring Schedules:**

- Choose low-traffic times (e.g., 2-4 AM)
- Be consistent (same day/time each week)
- Avoid holidays and peak usage periods

**Duration Buffers:**
Add buffer time to your estimates:

- Estimate 1 hour? Schedule 1.5 hours
- Better to finish early than run over

## Troubleshooting {#troubleshooting}

**Problem:** Events not appearing on status page

**Solutions:**

- Check maintenance status is ACTIVE
- Verify events are within visibility window (configure in page settings)
- Check affected monitors are not hidden

**Problem:** RRULE validation error

**Solutions:**

- Ensure BYDAY is set for weekly frequency
- Check interval is positive number
- Verify RRULE syntax (see [RRULE Patterns](/docs/maintenances/rrule-patterns))

**Problem:** Events not generated for recurring maintenance

**Solutions:**

- Check maintenance status is ACTIVE
- Wait for hourly scheduler to run
- Verify start_date_time is not too far in future

**Problem:** Can't delete event

**Solutions:**

- COMPLETED events can be deleted
- ONGOING events should be cancelled first
- Or delete the entire maintenance

## Next Steps {#next-steps}

- [Maintenance Events](/docs/maintenances/events) - Learn about event lifecycle and automatic transitions
- [Maintenance Impact on Monitoring](/docs/maintenances/impact-on-monitoring) - How maintenances affect monitor status display
- [RRULE Patterns](/docs/maintenances/rrule-patterns) - Advanced scheduling patterns and examples
