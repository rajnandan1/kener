---
title: "Incidents Overview"
description: "Understanding incidents in Kener: What they are, their lifecycle, and how they help track service disruptions."
---

Incidents in Kener are structured records that track service disruptions, outages, or degradations. They provide a chronological timeline of issues, affected services, and resolution progress, making them visible to your users on the status page.

## What is an Incident? {#what-is-incident}

An incident represents an unplanned service disruption or degradation that affects one or more monitors. Each incident includes:

- **Title** - A clear description of the issue
- **Start Time** - When the incident began
- **End Time** - When the incident was resolved (null if ongoing)
- **State** - Current resolution progress
- **Updates** - Timeline of status changes and communications
- **Affected Monitors** - Services impacted by this incident

## Incident Lifecycle {#incident-lifecycle}

Every incident progresses through a series of states that indicate resolution progress:

### States {#states}

#### 1. INVESTIGATING {#investigating}

**Initial State** - Team is actively investigating the cause of the issue.

**When to Use:**

- Issue just detected
- Root cause unknown
- Working to understand impact

**Example:** "We're investigating reports of slow API response times."

#### 2. IDENTIFIED {#identified}

**Root Cause Known** - The team has identified what's causing the issue.

**When to Use:**

- Root cause has been found
- Working on implementing a fix
- May not have a timeline yet

**Example:** "Identified database connection pool exhaustion causing errors."

#### 3. MONITORING {#monitoring}

**Fix Applied** - A fix has been implemented and is being monitored.

**When to Use:**

- Fix has been deployed
- Monitoring to ensure stability
- Verifying the issue is truly resolved

**Example:** "Database connection pool increased. Monitoring for stability."

#### 4. RESOLVED {#resolved}

**Final State** - Issue is fully resolved and incident is closed.

**When to Use:**

- Issue no longer occurring
- Service fully operational
- Confidence in resolution

**Example:** "All systems operational. Incident resolved."

### Automatic End Time {#automatic-end-time}

When an incident's state changes to **RESOLVED**, Kener automatically:

- Sets the `end_date_time` to the timestamp of the resolution update
- Calculates the total incident duration
- Displays the incident as closed on the status page

If you change the state back from RESOLVED to any other state, the `end_date_time` is cleared and the incident becomes ongoing again.

## Incident Sources {#incident-sources}

Incidents can be created from two sources:

### Manual Creation (Dashboard) {#manual-dashboard}

Created by users through the management dashboard at `/manage/app/incidents`.

**Use Cases:**

- Manually tracking known issues
- Creating historical records
- Issues detected outside Kener

**Source Value:** `DASHBOARD`

### Auto-Generated (Alerts) {#auto-generated-alerts}

Automatically created when alert configurations trigger and have "Create Incident" enabled.

**Use Cases:**

- Automated incident creation
- Alert-driven workflows
- Consistent incident tracking

**Source Value:** `ALERT`

**Note:** Alert-generated incidents include a link back to the originating alert in their metadata.

## Public Visibility {#public-visibility}

All incidents with status "OPEN" are visible on your public status page:

### Home Page {#home-page-display}

- Shows recent incidents (configurable count)
- Displays current state and affected monitors
- Shows latest update for each incident

### Incidents Page {#incidents-page}

- Lists all open incidents in chronological order
- Filterable by date range
- Searchable by title or affected service

### Individual Incident View {#individual-view}

- Complete timeline of all updates
- Full list of affected monitors with impact levels
- Duration calculation
- Shareable direct link

## Incident Timeline {#incident-timeline}

Each incident maintains a complete timeline through **updates** (also called comments). The timeline:

- Shows progression through states
- Provides transparency to users
- Records all communications
- Displays in reverse chronological order (newest first)

Updates are covered in detail in [Incident Updates](/docs/incidents/updates).

## Affected Monitors {#affected-monitors}

Incidents can affect one or more monitors. For each affected monitor, you specify:

**Monitor Impact:**

- **DOWN** - Monitor is completely unavailable
- **DEGRADED** - Monitor is partially unavailable or slow
- **MAINTENANCE** - Monitor undergoing maintenance (rare for incidents)

When a monitor is part of an active incident, the incident's impact **overrides** the monitor's realtime status. This ensures consistency between what users see and what incidents report.

Learn more in [Incident Impact on Monitoring](/docs/incidents/impact-on-monitoring).

## Incident Duration {#incident-duration}

Duration is automatically calculated:

**For Ongoing Incidents:**

- Duration = Current Time - Start Time
- Updates in real-time
- Displayed as "Ongoing" or time elapsed

**For Resolved Incidents:**

- Duration = End Time - Start Time
- Fixed value
- Displays total incident length

**Display Formats:**

- Less than 1 hour: "45 minutes"
- Less than 1 day: "3 hours 20 minutes"
- Multiple days: "2 days 5 hours"

## Next Steps {#next-steps}

- [Creating and Managing Incidents](/docs/incidents/creating-managing) - Learn how to create and edit incidents
- [Incident Updates](/docs/incidents/updates) - Understand how to add updates and change states
- [Incident Impact on Monitoring](/docs/incidents/impact-on-monitoring) - How incidents override realtime status
- [Auto-Generated Incidents](/docs/incidents/auto-generated) - How alerts create incidents automatically
