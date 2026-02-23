---
title: "Incident Updates"
description: "Learn how incident updates work, their significance in the incident timeline, and how they control incident state progression."
---

Incident updates (also called comments) are the primary mechanism for communicating incident progress and controlling incident state. Each update creates a timestamped entry in the incident timeline that's visible to your users.

## What are Incident Updates? {#what-are-updates}

An incident update is a timestamped message that:

- Describes current status or actions taken
- Changes the incident state
- Appears on the public status page
- Creates an audit trail
- Communicates transparently with users

Updates are stored as "comments" in the database but are displayed as a timeline on the status page.

## Update Components {#update-components}

Each update consists of:

### Message (Required) {#message}

The actual status update text that users will see.

**Format:** Supports full Markdown formatting including:

- **Bold** and _italic_ text
- Headers
- Lists (bulleted and numbered)
- Links
- Code blocks
- Tables

**Example:**

```markdown
We've identified the root cause as a database connection pool exhaustion.

**Actions Taken:**

- Increased connection pool size from 100 to 500
- Restarted application servers
- Enabled connection pool monitoring

**Next Steps:**

- Monitor error rates for 15 minutes
- Verify connection pool health
```

### State (Required) {#state}

The incident state after this update. This is **crucial** because:

- The incident's current state = the state of the most recent update
- Changing state in an update changes the incident's state
- State progression drives the incident lifecycle

**Available States:**
title: Incident Updates
description: Quick reference for posting timeline updates on incidents

- **IDENTIFIED** - Root cause found
- **MONITORING** - Fix applied, watching for stability
  Incident updates are timeline entries used to communicate progress and move incident state.

## Quick reference {#quick-reference}

When posting an update, choose one state:

- `INVESTIGATING`
- `IDENTIFIED`
- `MONITORING`
- `RESOLVED`

Setting `RESOLVED` closes the incident and sets end time.

- Aligning timeline with actual events
  Use concise, user-facing text and include only meaningful changes.

## See also {#see-also}

- [Creating and Managing Incidents](/docs/v4/incidents/creating-managing)
- [Impact on Monitoring](/docs/v4/incidents/impact-on-monitoring)
  **Important State Changes:**

**Moving to RESOLVED:**

- Sets incident end_date_time to update timestamp
- Closes the incident on status page
- Triggers resolution notifications

**Moving FROM RESOLVED:**

- Clears incident end_date_time
- Reopens the incident
- Shows as ongoing again

## Deleting Updates {#deleting-updates}

You can delete updates:

1. Find the update in the timeline
2. Click the **Delete** (trash icon) button
3. Confirm deletion

**Warning:** This cannot be undone.

**What Happens:**

- Update is permanently removed
- Incident state reverts to the previous update's state
- Timeline adjusts
- If you delete the most recent update, the incident takes the state of the second-most-recent update

**Special Case:** If you delete all updates, the incident retains its original state from creation.

## Update Status {#update-status}

Each update has a status field that controls visibility:

### ACTIVE (Default) {#active-status}

The update is visible on the public status page and in the incident timeline.

### INACTIVE {#inactive-status}

The update is hidden from public view but retained in the database.

**Use Cases:**

- Internal notes not meant for users
- Potentially sensitive information
- Draft updates
- Historical record keeping

**How to Set:**
Currently managed through API calls. Dashboard UI support may be added in the future.

## Update Best Practices {#best-practices}

### Frequency {#frequency-best-practices}

**Critical Incidents:**

- Update every 15-30 minutes
- Even if no progress ("Still investigating...")
- Keeps users informed

**Major Incidents:**

- Update every 30-60 minutes
- When significant progress made
- At state transitions

**Minor Incidents:**

- Update when state changes
- When fix is applied
- When resolved

### Content Guidelines {#content-guidelines}

**Be Clear:**

- Use simple language
- Avoid jargon and acronyms
- Explain technical terms if necessary

**Be Specific:**

- What IS affected, not just what you're doing
- What users can expect
- Estimated timelines (if available)

**Be Honest:**

- Admit uncertainty when present
- Don't promise what you can't deliver
- Update estimates as they change

**Good Examples:**

```markdown
## Investigating (Good)

We're seeing 20% of API requests failing with 503 errors.
Our team is investigating the cause. Retries should succeed,
but you may experience delays.
```

```markdown
## Identified (Good)

We've identified a database replication lag as the cause.
The secondary database is catching up. ETA for full resolution: 15 minutes.
```

```markdown
## Monitoring (Good)

Database replication is back in sync. Error rates have dropped to normal levels.
We're monitoring for the next 20 minutes to ensure stability before resolving.
```

```markdown
## Resolved (Good)

All systems are operating normally. Total incident duration: 47 minutes.

**Root Cause:** Database replication lag due to a large batch import.

**Prevention:** We've implemented rate limiting on batch imports and improved monitoring.
```

**Poor Examples:**

```markdown
## Bad - Too Vague

We're working on it.
```

```markdown
## Bad - Too Technical

Increased innodb_buffer_pool_size and optimized query Q47392.
```

```markdown
## Bad - Unprofessional

Really sorry about this mess! Not sure what happened.
```

### State Progression {#state-progression-best-practices}

**Don't Skip States Unnecessarily:**

- Helps users understand progress
- Provides detailed timeline
- Better transparency

**It's OK to Skip:**

- INVESTIGATING → RESOLVED (if quick fix)
- IDENTIFIED → RESOLVED (if no monitoring needed)

**States Can Go Backward:**

- MONITORING → INVESTIGATING (if issue returns)
- RESOLVED → INVESTIGATING (if reopened)
- This is normal for complex incidents

### Markdown Usage {#markdown-usage}

**Use Structure:**

```markdown
## Summary

Brief overview of current status

**Impact:**

- What's affected
- Who's affected

**Next Steps:**

- What we're doing
- Expected timeline
```

**Use Lists:**

- Easier to scan
- Clearer action items
- Better readability

**Use Bold for Emphasis:**

- Highlight important information
- Draw attention to key points
- **Don't overuse**

**Link to Resources:**

- Status page for related monitors
- Documentation for workarounds
- Support channels for help

## Special Use Cases {#special-use-cases}

### Backdating Updates {#backdating-updates}

If you're creating updates after the fact:

1. Add the update
2. Adjust the timestamp to when it actually occurred
3. Maintains accurate timeline
4. Preserves historical accuracy

**Example:**
Issue occurred at 10:00 AM, but you're recording it at 2:00 PM. Set update timestamps to 10:00 AM, 10:30 AM, etc.

### Multiple Updates at Once {#multiple-updates}

For complex incidents with many developments:

1. Add updates in chronological order
2. Adjust timestamps to spread them appropriately
3. Ensure state progression makes sense
4. Most recent update determines current state

### Resolution Updates {#resolution-updates}

When resolving an incident, include:

**Summary:**

- What was fixed
- Verification of resolution
- Confidence level

**Root Cause:**

- What caused the incident
- Why it happened
- Technical details (optional)

**Prevention:**

- Steps taken to prevent recurrence
- Monitoring improvements
- Process changes

**Example:**

```markdown
All services are fully operational. The incident has been resolved.

**Root Cause:**
A misconfigured load balancer was routing traffic to unhealthy backend servers.

**Resolution:**

- Fixed load balancer health check configuration
- Restarted affected backend servers
- Verified traffic routing correctly

**Prevention:**

- Added health check validation to deployment pipeline
- Implemented automated health check monitoring
- Updated runbooks for faster diagnosis

**Total Duration:** 1 hour 15 minutes
```

## Timeline Display {#timeline-display}

On the public status page, updates are displayed:

**Order:** Most recent first (reverse chronological)

**Information Shown:**

- State badge (color-coded)
- Timestamp
- Message content (rendered Markdown)

**Styling:**

- Each update in a card
- State-appropriate colors
- Clear visual separation

## Update Notifications {#update-notifications}

When configured with the subscription system:

**Users Receive:**

- Email notifications for new updates
- Subject includes incident ID and state
- Rendered HTML of update message
- Link to full incident page

**Notifications Sent When:**

- New update is added
- State changes
- Incident is created
- Incident is resolved

See [Subscription documentation](/docs/v4/subscriptions) for setup.

## Next Steps {#next-steps}

- [Incident Impact on Monitoring](/docs/incidents/impact-on-monitoring) - How incident state affects monitor status
- [Creating and Managing Incidents](/docs/incidents/creating-managing) - Back to incident management basics
- [Auto-Generated Incidents](/docs/incidents/auto-generated) - How alerts create and update incidents automatically
