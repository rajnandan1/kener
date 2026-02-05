---
title: "Maintenances Overview"
description: "Understanding maintenance windows in Kener: What they are, how they work, and how they help communicate planned service disruptions."
---

Maintenance windows in Kener allow you to schedule and communicate planned service disruptions to your users. Unlike incidents, maintenances are scheduled in advance and can be one-time or recurring events.

## What is a Maintenance Window? {#what-is-maintenance}

A maintenance window represents a **planned** period during which one or more services will be unavailable or degraded due to scheduled work. Each maintenance includes:

- **Title** - A clear description of the maintenance work
- **Description** - Details about what's being done and why
- **Schedule (RRULE)** - When and how often the maintenance occurs
- **Duration** - How long each maintenance window lasts
- **Affected Monitors** - Services impacted and their expected status
- **Status** - Whether the maintenance is ACTIVE or INACTIVE

## Maintenance vs Incident {#maintenance-vs-incident}

Understanding the difference between maintenances and incidents is crucial:

| Aspect         | Maintenance                              | Incident                               |
| :------------- | :--------------------------------------- | :------------------------------------- |
| **Nature**     | Planned work                             | Unplanned disruption                   |
| **Scheduling** | Scheduled in advance with RRULE          | Created when issue occurs              |
| **Duration**   | Known duration configured upfront        | Duration determined by resolution time |
| **Recurrence** | Can be recurring (weekly, monthly, etc.) | Always one-time events                 |
| **Visibility** | Shown during scheduled window            | Shown from start until resolved        |
| **End Time**   | Pre-calculated based on duration         | Set when issue is resolved             |

**Key Distinction:** Maintenances are **preventive** and **scheduled**, while incidents are **reactive** and **unplanned**.

## One-Time vs Recurring Maintenances {#one-time-vs-recurring}

Kener supports two types of maintenance schedules:

### One-Time Maintenance {#one-time}

A maintenance that occurs exactly once at a specific date and time.

**Use Cases:**

- Database migration during off-hours
- Major system upgrade
- Infrastructure change
- One-off server maintenance

**RRULE:** `FREQ=MINUTELY;COUNT=1`

**Example:**

- **Title:** "Database Migration"
- **Start:** May 15, 2026 at 2:00 AM
- **Duration:** 3 hours
- **Occurs:** Once

### Recurring Maintenance {#recurring}

A maintenance that repeats on a schedule using iCalendar RRULE format.

**Use Cases:**

- Weekly security updates every Sunday
- Monthly database optimization
- Daily backup window
- Bi-weekly deployment window

**RRULE Examples:**

- Weekly: `FREQ=WEEKLY;BYDAY=SU` (every Sunday)
- Monthly: `FREQ=MONTHLY;BYMONTHDAY=1` (first of each month)
- Daily: `FREQ=DAILY` (every day)

**Example:**

- **Title:** "Weekly Security Updates"
- **Start:** Sunday, May 15, 2026 at 3:00 AM
- **RRULE:** `FREQ=WEEKLY;BYDAY=SU`
- **Duration:** 1 hour
- **Occurs:** Every Sunday at 3:00 AM

## iCalendar RRULE Format {#rrule-format}

Kener uses the industry-standard [iCalendar RRULE](http://www.kanzaki.com/docs/ical/rrule.html) format for scheduling recurring maintenances. This powerful format allows you to express complex recurring patterns.

**Basic RRULE Structure:**

```
FREQ=frequency;[INTERVAL=n;][BYDAY=days;][COUNT=n;]
```

**Example Patterns:**

| Pattern                 | RRULE                              | Meaning               |
| :---------------------- | :--------------------------------- | :-------------------- |
| Every Sunday            | `FREQ=WEEKLY;BYDAY=SU`             | Weekly on Sunday      |
| Every 2 weeks on Monday | `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO`  | Bi-weekly on Monday   |
| Every day               | `FREQ=DAILY`                       | Daily                 |
| First of each month     | `FREQ=MONTHLY;BYMONTHDAY=1`        | Monthly on day 1      |
| Weekdays only           | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR` | Monday through Friday |

Learn more in [RRULE Patterns](/docs/maintenances/rrule-patterns).

## Maintenance Events {#maintenance-events}

When you create a maintenance, Kener automatically generates **maintenance events** based on the RRULE:

- **One-Time Maintenances:** Generate 1 event at creation time
- **Recurring Maintenances:** Generate events for the next 7 days, refreshed hourly

Each event represents a single occurrence of the maintenance window and tracks:

- Start date/time
- End date/time (calculated from duration)
- Status (SCHEDULED → READY → ONGOING → COMPLETED)

Events are covered in detail in [Maintenance Events](/docs/maintenances/events).

## Maintenance Status {#maintenance-status}

Maintenances have two levels of status:

### Maintenance-Level Status {#maintenance-level-status}

Controls whether the maintenance is active in the system:

- **ACTIVE** - Maintenance is enabled and will generate events
- **INACTIVE** - Maintenance is disabled and will not affect monitors

**Note:** Changing a maintenance to INACTIVE does not cancel already scheduled events. You must manually cancel or delete those events.

### Event-Level Status {#event-level-status}

Tracks the lifecycle of each individual maintenance occurrence:

- **SCHEDULED** - Event created, more than 60 minutes away
- **READY** - Event starts within 60 minutes (notification sent)
- **ONGOING** - Event is currently in progress
- **COMPLETED** - Event has finished
- **CANCELLED** - Event was manually cancelled

Events automatically transition through states based on the current time.

## Affected Monitors {#affected-monitors}

Each maintenance specifies which monitors are affected and their expected status during the maintenance window:

**Monitor Impact Options:**

- **MAINTENANCE** - Show as under maintenance (recommended)
- **DOWN** - Show as completely unavailable
- **DEGRADED** - Show as partially available
- **UP** - Show as operational (rare, for non-disruptive maintenance)

When a maintenance event is ONGOING, the specified impact **overrides** the monitor's realtime status on the status page.

Learn more in [Maintenance Impact on Monitoring](/docs/maintenances/impact-on-monitoring).

## Public Visibility {#public-visibility}

Maintenances are visible to users on your public status page:

### Upcoming Maintenances {#upcoming-maintenances}

- Shown on the home page
- Displays upcoming events (configurable days ahead)
- Shows affected monitors and maintenance window

### Ongoing Maintenances {#ongoing-maintenances}

- Prominently displayed during the maintenance window
- Affected monitors show maintenance status
- Duration and progress indicators

### Past Maintenances {#past-maintenances}

- Listed on the events/history page
- Shows completed maintenance events
- Configurable retention period

## Automatic Event Generation {#automatic-event-generation}

Kener runs a scheduler every hour that:

1. Checks all ACTIVE recurring maintenances
2. Generates events for the next 7 days
3. Skips already-created events (no duplicates)
4. Updates event statuses based on current time

**For One-Time Maintenances:**

- Event created immediately when maintenance is created
- No automatic regeneration

**For Recurring Maintenances:**

- Events generated for next 7 days
- Hourly scheduler keeps the 7-day window rolling
- Ensures users always see upcoming occurrences

## Maintenance Duration {#maintenance-duration}

Duration is specified in seconds and determines how long each maintenance window lasts:

**Common Durations:**

- 30 minutes: `1800` seconds
- 1 hour: `3600` seconds
- 2 hours: `7200` seconds
- 4 hours: `14400` seconds

**Display:**
Duration is automatically formatted for display:

- Less than 1 hour: "45m"
- 1-23 hours: "3h" or "2h 30m"
- 24+ hours: "1 day 5h"

## Notifications {#notifications}

When maintenance events change status, notifications can be sent:

**READY (60 minutes before):**

- "Maintenance starting soon" notification
- Gives users advance warning

**ONGOING (when started):**

- "Maintenance in progress" notification
- Confirms maintenance has begun

**COMPLETED (when finished):**

- "Maintenance completed" notification
- Confirms services are back to normal

Notifications respect your subscription configuration and trigger settings.

## Use Cases {#use-cases}

**Regular System Updates:**

```
Title: Weekly Security Patches
RRULE: FREQ=WEEKLY;BYDAY=SU
Start: Sunday 3:00 AM
Duration: 1 hour
Impact: MAINTENANCE
```

**Monthly Database Optimization:**

```
Title: Monthly Database Maintenance
RRULE: FREQ=MONTHLY;BYMONTHDAY=1
Start: First of month, 2:00 AM
Duration: 2 hours
Impact: DEGRADED
```

**One-Time Migration:**

```
Title: Major Database Migration
RRULE: FREQ=MINUTELY;COUNT=1
Start: May 15, 2026 at 1:00 AM
Duration: 4 hours
Impact: DOWN
```

## Next Steps {#next-steps}

- [Creating and Managing Maintenances](/docs/maintenances/creating-managing) - Learn how to create and configure maintenances
- [Maintenance Events](/docs/maintenances/events) - Understand event lifecycle and management
- [Maintenance Impact on Monitoring](/docs/maintenances/impact-on-monitoring) - How maintenances affect status display
- [RRULE Patterns](/docs/maintenances/rrule-patterns) - Advanced scheduling patterns and examples
