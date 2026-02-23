---
title: "Maintenance Events"
description: "Understanding maintenance events: automatic generation, lifecycle states, and status transitions in Kener."
---

Maintenance events are the individual occurrences of a maintenance window. This guide explains how events are generated, their lifecycle, and how they transition between states.

## What is a Maintenance Event? {#what-is-event}

A maintenance event represents a single occurrence of a maintenance window. Each event has:

- **Start Date/Time** - When this occurrence begins
- **End Date/Time** - When this occurrence ends (start + duration)
- **Status** - Current state (SCHEDULED, READY, ONGOING, COMPLETED, CANCELLED)
- **Maintenance ID** - Links back to the parent maintenance

**Relationship:**

```
Maintenance (1) → Events (many)
"Weekly Updates" → [Event 1, Event 2, Event 3, ...]
```

## Automatic Event Generation {#automatic-generation}

Events are created automatically by Kener based on the maintenance type and schedule.

### One-Time Maintenances {#one-time-generation}

**When:** Event created immediately when maintenance is created

**How Many:** Exactly 1 event

**Example:**

```
Maintenance: Database Migration
RRULE: FREQ=MINUTELY;COUNT=1
Start: May 15, 2026 at 2:00 AM
Duration: 3 hours

Generated Event:
- Start: May 15, 2026 at 2:00 AM
- End: May 15, 2026 at 5:00 AM
- Status: SCHEDULED
```

### Recurring Maintenances {#recurring-generation}

**When:**

- Initial events created when maintenance is created
- New events generated every hour by scheduler

**How Many:** Events for the next 7 days

**Example:**

```
Maintenance: Weekly Security Updates
RRULE: FREQ=WEEKLY;BYDAY=SU
Start: May 15, 2026 at 3:00 AM
Duration: 1 hour

Generated Events (assuming today is May 10):
1. May 15, 3:00 AM - 4:00 AM (SCHEDULED)
2. May 22, 3:00 AM - 4:00 AM (SCHEDULED)
3. May 29, 3:00 AM - 4:00 AM (SCHEDULED)
4. June 5, 3:00 AM - 4:00 AM (SCHEDULED)
```

**Rolling Window:**
The scheduler runs every hour and ensures there are always events for the next 7 days:

- Today is May 15 → Events through May 22 exist
- Tomorrow (May 16) → Scheduler creates event for May 23
- Continuous 7-day lookahead

### Duplicate Prevention {#duplicate-prevention}

The system prevents duplicate events:

1. Check if event for specific start time already exists
2. Skip creation if duplicate found
3. Only create missing events

This ensures the hourly scheduler doesn't create duplicates.

## Event Lifecycle States {#event-lifecycle}

Every maintenance event progresses through a series of states that track its progress.

### State Diagram {#state-diagram}

```
SCHEDULED → READY → ONGOING → COMPLETED
    ↓          ↓        ↓
  [CANCELLED at any point]
```

### State Descriptions {#state-descriptions}

#### SCHEDULED {#scheduled-state}

**When:** Event created, more than 60 minutes until start time

**Meaning:**

- Maintenance is scheduled but not imminent
- Visible to users in upcoming maintenances
- No notifications sent yet

**Displayed As:** "Scheduled" or "In X hours/days"

**Example:**

```
Current Time: May 15, 12:00 PM
Event Start: May 15, 3:00 PM
Status: SCHEDULED (3 hours away)
```

#### READY {#ready-state}

**When:** Current time is within 60 minutes of start time

**Meaning:**

- Maintenance starting soon
- Advance notification sent to subscribers
- Monitor status not yet overridden

**Displayed As:** "Starting soon" or "In X minutes"

**Notification:** "Maintenance Starting Soon" notification sent

**Example:**

```
Current Time: May 15, 2:15 PM
Event Start: May 15, 3:00 PM
Status: READY (45 minutes away)
Action: Send notification
```

**Automatic Transition:**

```
SCHEDULED → READY
Condition: (current_time + 60 minutes) >= start_time
Executed by: Status update scheduler (runs every minute)
```

#### ONGOING {#ongoing-state}

**When:** Current time is between start time and end time

**Meaning:**

- Maintenance is actively happening
- Monitor statuses overridden to configured impact levels
- Shown prominently on status page

**Displayed As:** "Ongoing" or "In progress"

**Notification:** "Maintenance In Progress" notification sent

**Example:**

```
Current Time: May 15, 3:30 PM
Event Start: May 15, 3:00 PM
Event End: May 15, 4:00 PM
Status: ONGOING (30 minutes in, 30 minutes remaining)
Action: Override monitor statuses
```

**Automatic Transition:**

```
READY → ONGOING
title: Maintenance Events
description: How maintenance events are generated and shown to users
```

A maintenance event is one occurrence of a maintenance window.

## Event generation {#event-generation}

### One-time maintenance {#one-time-maintenance}

- Creates one event.
- Triggered when maintenance is created.
- Monitor statuses restored to realtime values

### Recurring maintenance {#recurring-maintenance}

- Creates upcoming events from RRULE.
- Scheduler refreshes upcoming occurrences.
- Duplicate event start times are skipped.

## Event statuses {#event-statuses}

- `SCHEDULED`
- `READY`
- `ONGOING`
- `COMPLETED`
- `CANCELLED`

Status transitions are time-based and automatic.
Current Time: May 15, 4:05 PM

## User-visible behavior {#user-visible-behavior}

Status: COMPLETED (finished 5 minutes ago)

- Ongoing events affect monitor display according to impact settings.
- Upcoming and past visibility depends on site/page event display settings.

```
## Manual actions {#manual-actions}
**Automatic Transition:**
- You can cancel/delete events from maintenance management screens.
- Edit the parent maintenance to regenerate future schedule behavior.
```

## Related guides {#related-guides}

Condition: current_time >= end_time

- [Creating and Managing Maintenances](/docs/v4/maintenances/creating-managing)
- [Impact on Monitoring](/docs/v4/maintenances/impact-on-monitoring)
- [RRULE Patterns](/docs/v4/maintenances/rrule-patterns)
  **Displayed As:** "Cancelled"

**Notification:** No automatic notification

**Manual Action:** User clicks delete/cancel on event

## Automatic Status Transitions {#automatic-transitions}

Kener runs a scheduler **every minute** that updates event statuses based on the current time.

### Transition Logic {#transition-logic}

**SCHEDULED → READY:**

```javascript
// Find events where:
status === 'SCHEDULED' AND
start_date_time > current_time AND
start_date_time <= (current_time + 3600) // 60 minutes in seconds

// Update to READY
// Send "starting soon" notification
```

**READY → ONGOING:**

```javascript
// Find events where:
status === 'READY' AND
start_date_time <= current_time AND
end_date_time >= current_time

// Update to ONGOING
// Send "in progress" notification
// Override monitor statuses
```

**ONGOING → COMPLETED:**

```javascript
// Find events where:
status === 'ONGOING' AND
end_date_time < current_time

// Update to COMPLETED
// Send "completed" notification
// Restore monitor statuses
```

### Scheduler Details {#scheduler-details}

**Frequency:** Every minute

**Purpose:**

1. Update event statuses based on time
2. Send appropriate notifications
3. Trigger monitor status overrides/restores

**Implementation:**
Runs as part of `UpdateMaintenanceEventStatuses()` in maintenance controller

## Event Notifications {#event-notifications}

Notifications are triggered during state transitions:

### Notification Types {#notification-types}

**Starting Soon (SCHEDULED → READY):**

```
Subject: Maintenance Starting Soon
Body: "{title} is starting in {time_until_start}"
Monitors: List of affected monitors with impacts
When: 60 minutes before start
```

**In Progress (READY → ONGOING):**

```
Subject: Maintenance In Progress
Body: "{title} is now in progress"
Monitors: List of affected monitors with impacts
When: At start time
```

**Completed (ONGOING → COMPLETED):**

```
Subject: Maintenance Completed
Body: "{title} has been completed"
Monitors: List of affected monitors with impacts
When: At end time
```

### Notification Channels {#notification-channels}

Notifications are sent based on your subscription configuration:

- Email (if enabled)
- Webhooks (if configured)
- Slack (if configured)
- Discord (if configured)

Only users subscribed to maintenance updates receive notifications.

## Viewing Events {#viewing-events}

### Dashboard View {#dashboard-view}

On the maintenance edit page:

1. Scroll to **Maintenance Events** section
2. Events listed in chronological order
3. Current/next event highlighted
4. Shows status, dates, and duration

**Event Display:**

```
┌─────────────────────────────────────┐
│ [SCHEDULED] Scheduled               │
│ May 22, 2026 03:00 → 04:00          │
│ Duration: 1h                        │
├─────────────────────────────────────┤
│ [ONGOING] Ongoing (Current)         │
│ May 15, 2026 03:00 → 04:00          │
│ Duration: 1h                        │
├─────────────────────────────────────┤
│ [COMPLETED] Completed               │
│ May 8, 2026 03:00 → 04:00           │
│ Duration: 1h                        │
└─────────────────────────────────────┘
```

### Status Page View {#status-page-view}

Users see events on the public status page:

**Ongoing Maintenances:**

- Prominently displayed on home page
- Affected monitors show MAINTENANCE status
- Progress/countdown indicator

**Upcoming Maintenances:**

- Listed in separate section
- Shows start time and affected services
- Countdown to start

**Past Maintenances:**

- Events/history page
- Filterable by date range
- Shows completed events

## Managing Events Manually {#managing-events-manually}

### Cancelling Events {#cancelling-events}

From the maintenance edit page:

1. Find the event in the list
2. Click the trash icon
3. Confirm cancellation
4. Event status changes to CANCELLED

**When to Cancel:**

- Maintenance no longer needed
- Rescheduling to different time
- Discovered conflict

**Note:** Cancelled events remain in history but are not executed.

### Deleting Events {#deleting-events}

Events can be permanently deleted:

1. Click trash icon on event
2. Confirm deletion
3. Event removed from database

**Warning:** Deletion is permanent and cannot be undone.

**When to Delete:**

- Cleaning up old historical events
- Removing erroneous events
- Database maintenance

**Best Practice:** Cancel rather than delete to preserve history.

### Cannot Edit Events {#cannot-edit-events}

Individual events cannot be edited directly. To change event timing or duration:

1. Edit the parent maintenance
2. Update start time, RRULE, or duration
3. Save maintenance

**Result:**

- Future SCHEDULED events deleted
- New events generated with updated settings
- ONGOING/COMPLETED events preserved

## Event Retention {#event-retention}

Events are retained indefinitely by default:

**SCHEDULED Events:**

- Kept until executed or cancelled
- Automatically progress through lifecycle

**COMPLETED Events:**

- Kept as historical records
- Visible on status page based on page settings

**CANCELLED Events:**

- Kept as historical records
- Marked explicitly as cancelled

**Deletion:**

- Events deleted when parent maintenance is deleted
- Can be manually deleted via dashboard
- No automatic cleanup (configure if needed)

## Events and Monitor Status {#events-and-monitor-status}

During ONGOING events:

- Monitor status **overridden** to configured impact
- Realtime monitoring continues in background
- Status page shows maintenance impact

See [Maintenance Impact on Monitoring](/docs/maintenances/impact-on-monitoring) for details.

## Troubleshooting {#troubleshooting}

**Problem:** Events not transitioning to READY/ONGOING

**Solutions:**

- Check scheduler is running (`npm start` in production)
- Verify system clock is accurate
- Check logs for scheduler errors

**Problem:** No events generated for recurring maintenance

**Solutions:**

- Verify maintenance status is ACTIVE
- Check RRULE is valid
- Wait for hourly scheduler to run
- Check start_date_time is not too far in future

**Problem:** Events not visible on status page

**Solutions:**

- Check page settings for visibility window
- Verify events are within configured date range
- Ensure affected monitors are not hidden

**Problem:** Too many events generated

**Solutions:**

- For one-time: Check RRULE contains `COUNT=1`
- For recurring: Events for next 7 days is expected
- Old events can be manually deleted

## Next Steps {#next-steps}

- [Maintenance Impact on Monitoring](/docs/maintenances/impact-on-monitoring) - How events affect monitor status display
- [RRULE Patterns](/docs/maintenances/rrule-patterns) - Advanced scheduling patterns for recurring maintenances
- [Creating and Managing Maintenances](/docs/maintenances/creating-managing) - Learn how to create and edit maintenances
