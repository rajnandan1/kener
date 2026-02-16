---
title: "RRULE Patterns"
description: "Advanced RRULE patterns and examples for scheduling recurring maintenance windows in Kener."
---

This guide provides comprehensive examples and patterns for using iCalendar RRULE format to schedule recurring maintenance windows.

## RRULE Format Reference {#rrule-reference}

Kener uses the [iCalendar RRULE specification](http://www.kanzaki.com/docs/ical/rrule.html) for recurring maintenance schedules.

### Basic Syntax {#basic-syntax}

```
FREQ=frequency[;INTERVAL=n][;BYDAY=days][;BYMONTHDAY=day][;COUNT=n][;UNTIL=date]
```

### Supported Components {#supported-components}

**FREQ** (Required)

- `DAILY` - Daily recurrence
- `WEEKLY` - Weekly recurrence
- `MONTHLY` - Monthly recurrence

**INTERVAL** (Optional)

- Default: 1
- Integer value: 2 = every other, 3 = every third, etc.

**BYDAY** (Optional, for WEEKLY)

- Day codes: `MO`, `TU`, `WE`, `TH`, `FR`, `SA`, `SU`
- Multiple days: `MO,WE,FR`

**BYMONTHDAY** (Optional, for MONTHLY)

- Day of month: 1-31
- Example: `BYMONTHDAY=1` (first of month)

**COUNT** (For one-time only)

- `COUNT=1` - Single occurrence
- Used for one-time maintenances

## Common Patterns {#common-patterns}

### Daily Patterns {#daily-patterns}

#### Every Day {#every-day}

**RRULE:** `FREQ=DAILY`

**Description:** Maintenance occurs every single day at the configured time

**Use Case:** Daily backup windows, nightly cleanup tasks

**Example:**

```
Title: Nightly Database Backup
Start: 2:00 AM (any day)
RRULE: FREQ=DAILY
Duration: 30 minutes

Occurrences:
- Today at 2:00 AM
- Tomorrow at 2:00 AM
- Day after at 2:00 AM
- Continues daily...
```

#### Every Other Day {#every-other-day}

**RRULE:** `FREQ=DAILY;INTERVAL=2`

**Description:** Maintenance occurs every 2 days

**Use Case:** Bi-daily tasks

**Example:**

```
Title: System Cache Clear
Start: Monday, May 15 at 3:00 AM
RRULE: FREQ=DAILY;INTERVAL=2
Duration: 15 minutes

Occurrences:
- Mon, May 15 at 3:00 AM
- Wed, May 17 at 3:00 AM
- Fri, May 19 at 3:00 AM
- Continues every 2 days...
```

#### Every Weekday {#every-weekday}

**RRULE:** `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`

**Description:** Maintenance occurs Monday through Friday only

**Use Case:** Business-day maintenance windows

**Example:**

```
Title: Daily Business Hours Maintenance
Start: Monday, May 15 at 6:00 AM
RRULE: FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
Duration: 1 hour

Occurrences:
- Mon, May 15 at 6:00 AM
- Tue, May 16 at 6:00 AM
- Wed, May 17 at 6:00 AM
- Thu, May 18 at 6:00 AM
- Fri, May 19 at 6:00 AM
- Mon, May 22 at 6:00 AM (skips weekend)
- Continues Mon-Fri...
```

### Weekly Patterns {#weekly-patterns}

#### Every Week (Single Day) {#every-week-single}

**RRULE:** `FREQ=WEEKLY;BYDAY=SU`

**Description:** Maintenance occurs every Sunday

**Use Case:** Weekly security updates, routine maintenance

**Example:**

```
Title: Weekly Security Patches
Start: Sunday, May 15 at 3:00 AM
RRULE: FREQ=WEEKLY;BYDAY=SU
Duration: 2 hours

Occurrences:
- Sun, May 15 at 3:00 AM
- Sun, May 22 at 3:00 AM
- Sun, May 29 at 3:00 AM
- Continues every Sunday...
```

#### Every Week (Multiple Days) {#every-week-multiple}

**RRULE:** `FREQ=WEEKLY;BYDAY=TU,TH`

**Description:** Maintenance occurs every Tuesday and Thursday

**Use Case:** Bi-weekly per week updates

**Example:**

```
Title: Database Optimization
Start: Tuesday, May 16 at 2:00 AM
RRULE: FREQ=WEEKLY;BYDAY=TU,TH
Duration: 1 hour

Occurrences:
- Tue, May 16 at 2:00 AM
- Thu, May 18 at 2:00 AM
- Tue, May 23 at 2:00 AM
- Thu, May 25 at 2:00 AM
- Continues Tue & Thu...
```

#### Bi-Weekly {#bi-weekly}

**RRULE:** `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO`

**Description:** Maintenance occurs every other Monday

**Use Case:** Bi-weekly deployment windows

**Example:**

```
Title: Bi-Weekly Deployment
Start: Monday, May 15 at 10:00 PM
RRULE: FREQ=WEEKLY;INTERVAL=2;BYDAY=MO
Duration: 3 hours

Occurrences:
- Mon, May 15 at 10:00 PM
- Mon, May 29 at 10:00 PM (2 weeks later)
- Mon, Jun 12 at 10:00 PM (2 weeks later)
- Continues every 2 weeks...
```

#### Every Weekend {#every-weekend}

**RRULE:** `FREQ=WEEKLY;BYDAY=SA,SU`

**Description:** Maintenance occurs every Saturday and Sunday

**Use Case:** Weekend maintenance windows

**Example:**

```
Title: Weekend Server Maintenance
Start: Saturday, May 13 at 1:00 AM
RRULE: FREQ=WEEKLY;BYDAY=SA,SU
Duration: 4 hours

Occurrences:
- Sat, May 13 at 1:00 AM
- Sun, May 14 at 1:00 AM
- Sat, May 20 at 1:00 AM
- Sun, May 21 at 1:00 AM
- Continues every weekend...
```

### Monthly Patterns {#monthly-patterns}

#### First of Every Month {#first-of-month}

**RRULE:** `FREQ=MONTHLY;BYMONTHDAY=1`

**Description:** Maintenance occurs on the 1st of each month

**Use Case:** Monthly billing maintenance, monthly reports

**Example:**

```
Title: Monthly Billing Processing
Start: June 1, 2026 at 12:00 AM
RRULE: FREQ=MONTHLY;BYMONTHDAY=1
Duration: 2 hours

Occurrences:
- Jun 1, 2026 at 12:00 AM
- Jul 1, 2026 at 12:00 AM
- Aug 1, 2026 at 12:00 AM
- Continues monthly...
```

#### Middle of Month {#middle-of-month}

**RRULE:** `FREQ=MONTHLY;BYMONTHDAY=15`

**Description:** Maintenance occurs on the 15th of each month

**Use Case:** Mid-month updates

**Example:**

```
Title: Mid-Month Database Optimization
Start: May 15, 2026 at 2:00 AM
RRULE: FREQ=MONTHLY;BYMONTHDAY=15
Duration: 3 hours

Occurrences:
- May 15, 2026 at 2:00 AM
- Jun 15, 2026 at 2:00 AM
- Jul 15, 2026 at 2:00 AM
- Continues monthly...
```

#### Last Day of Month {#last-of-month}

**RRULE:** `FREQ=MONTHLY;BYMONTHDAY=-1`

**Description:** Maintenance occurs on the last day of each month

**Use Case:** End-of-month processing

**Example:**

```
Title: End of Month Reports
Start: May 31, 2026 at 11:00 PM
RRULE: FREQ=MONTHLY;BYMONTHDAY=-1
Duration: 1 hour

Occurrences:
- May 31, 2026 at 11:00 PM
- Jun 30, 2026 at 11:00 PM
- Jul 31, 2026 at 11:00 PM
- Continues monthly...
```

#### Quarterly {#quarterly}

**RRULE:** `FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1`

**Description:** Maintenance occurs every 3 months on the 1st

**Use Case:** Quarterly system upgrades

**Example:**

```
Title: Quarterly System Review
Start: January 1, 2026 at 3:00 AM
RRULE: FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1
Duration: 4 hours

Occurrences:
- Jan 1, 2026 at 3:00 AM
- Apr 1, 2026 at 3:00 AM
- Jul 1, 2026 at 3:00 AM
- Oct 1, 2026 at 3:00 AM
- Continues quarterly...
```

## Real-World Examples {#real-world-examples}

### Example 1: Production Deploy Window {#example-deploy}

**Scenario:** Deploy updates every Tuesday and Thursday at 10 PM for 2 hours

**Configuration:**

```yaml
Title: Production Deployment Window
Description: Bi-weekly production deployments with potential service disruption
Start Date: Tuesday, May 16, 2026 at 10:00 PM
RRULE: FREQ=WEEKLY;BYDAY=TU,TH
Duration: 7200 seconds (2 hours)
Affected Monitors:
    - API Server: DEGRADED
    - Web Frontend: DEGRADED
    - Admin Portal: MAINTENANCE
```

**Result:** Deployments every Tuesday and Thursday night, users see degraded performance notice.

### Example 2: Weekend Database Maintenance {#example-database}

**Scenario:** Database optimization every Sunday at 3 AM for 3 hours

**Configuration:**

```yaml
Title: Weekly Database Optimization
Description: Routine database maintenance including index rebuilding and cleanup
Start Date: Sunday, May 14, 2026 at 3:00 AM
RRULE: FREQ=WEEKLY;BYDAY=SU
Duration: 10800 seconds (3 hours)
Affected Monitors:
    - Primary Database: MAINTENANCE
    - API Server: DEGRADED
    - Background Jobs: DOWN
```

**Result:** Every Sunday morning, database shows maintenance while APIs show degraded.

### Example 3: Monthly Security Patches {#example-security}

**Scenario:** Security patches first Sunday of each month at 2 AM for 1 hour

**Configuration:**

```yaml
Title: Monthly Security Updates
Description: Critical security patches and system updates
Start Date: Sunday, June 4, 2026 at 2:00 AM
RRULE: FREQ=MONTHLY;BYMONTHDAY=1
Duration: 3600 seconds (1 hour)
Affected Monitors:
    - All Servers: MAINTENANCE
```

**Note:** Since RRULE doesn't support "first Sunday", use BYMONTHDAY=1 and choose first occurrence that falls on Sunday, or use BYDAY with ordinal (not supported in Kener UI currently).

**Workaround:** Create as weekly and manage manually or use BYMONTHDAY for specific date.

### Example 4: Business Hours Backup {#example-backup}

**Scenario:** Weekday backups at 6 AM for 30 minutes

**Configuration:**

```yaml
Title: Daily Business Backup
Description: Incremental backup of business data
Start Date: Monday, May 15, 2026 at 6:00 AM
RRULE: FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
Duration: 1800 seconds (30 minutes)
Affected Monitors:
    - File Server: DEGRADED
    - Backup Service: MAINTENANCE
```

**Result:** Backups run Mon-Fri mornings, users see brief degradation notice.

### Example 5: One-Time Major Upgrade {#example-upgrade}

**Scenario:** Database migration on specific date for extended period

**Configuration:**

```yaml
Title: Database Migration to v2.0
Description: Major database upgrade requiring extended downtime
Start Date: Saturday, June 10, 2026 at 11:00 PM
RRULE: FREQ=MINUTELY;COUNT=1
Duration: 21600 seconds (6 hours)
Affected Monitors:
    - Primary Database: DOWN
    - API Server: DOWN
    - Web Application: DOWN
    - Mobile App: DOWN
```

**Result:** One-time event on specific date/time, full outage for 6 hours.

## Advanced Techniques {#advanced-techniques}

### Combining Patterns {#combining-patterns}

While a single RRULE supports one pattern, you can create multiple maintenances for complex schedules:

**Scenario:** Maintenance on weekends AND first of month

**Solution:**

```yaml
Maintenance 1:
    Title: Weekend Maintenance
    RRULE: FREQ=WEEKLY;BYDAY=SA,SU

Maintenance 2:
    Title: Monthly Maintenance
    RRULE: FREQ=MONTHLY;BYMONTHDAY=1
```

### Avoiding Holidays {#avoiding-holidays}

RRULE doesn't support holiday exclusions directly.

**Workaround:**

1. Create recurring maintenance as usual
2. Manually cancel events that fall on holidays
3. Or schedule maintenance to avoid common holiday dates

### Time Zone Considerations {#timezone-considerations}

**Important:** Start times are stored in UTC but displayed in local timezone.

**Best Practice:**

- Choose start times that work across time zones
- Be aware of DST changes
- Document timezone in maintenance description

**Example:**

```yaml
Title: Global Maintenance Window
Description: Scheduled at 2 AM UTC (6 PM PST, 10 PM EST)
Start: 2:00 AM UTC
```

## RRULE Validation {#validation}

### Valid RRULEs {#valid-rrules}

✅ `FREQ=DAILY`
✅ `FREQ=WEEKLY;BYDAY=MO`
✅ `FREQ=WEEKLY;BYDAY=MO,WE,FR`
✅ `FREQ=WEEKLY;INTERVAL=2;BYDAY=SU`
✅ `FREQ=MONTHLY;BYMONTHDAY=1`
✅ `FREQ=MINUTELY;COUNT=1`

### Invalid RRULEs {#invalid-rrules}

❌ `FREQ=WEEKLY` (missing BYDAY for weekly)
❌ `BYDAY=MO` (missing FREQ)
❌ `FREQ=YEARLY` (yearly not supported)
❌ `FREQ=HOURLY` (hourly not supported)
❌ `FREQ=WEEKLY;BYDAY=` (empty BYDAY)

### Common Errors {#common-errors}

**Error:** "BYDAY required for WEEKLY frequency"

```
Problem: FREQ=WEEKLY without BYDAY
Solution: Add BYDAY=MO,TU,WE,TH,FR,SA,SU or specific days
```

**Error:** "Invalid RRULE format"

```
Problem: Syntax error in RRULE
Solution: Check semicolons, equals signs, comma separators
```

## Testing Your RRULE {#testing-rrule}

### Using Dashboard Preview {#dashboard-preview}

The maintenance creation form shows the generated RRULE at the bottom:

1. Configure frequency, interval, days
2. Check "Generated RRULE" preview
3. Verify it matches your intent

### Checking Generated Events {#checking-events}

After creating a maintenance:

1. View the maintenance edit page
2. Scroll to "Maintenance Events" section
3. Verify events appear on expected dates/times

### Online RRULE Tools {#online-tools}

Test your RRULE with external tools:

- [iCalendar.org Validator](https://icalendar.org/validator.html)
- [RRULE Tool](https://icalendar.org/rrule-tool.html)
- [Recurr Documentation](https://github.com/simshaun/recurr)

**Note:** Paste your RRULE with DTSTART prefix:

```
DTSTART:20260515T030000Z
RRULE:FREQ=WEEKLY;BYDAY=SU
```

## Troubleshooting {#troubleshooting}

**Problem:** Events not generating as expected

**Solutions:**

- Verify RRULE syntax is correct
- Check maintenance status is ACTIVE
- Wait for hourly scheduler to run
- Verify start_date_time is reasonable

**Problem:** Wrong days selected

**Solutions:**

- Check BYDAY codes (MO=Monday, TU=Tuesday, etc.)
- Verify no typos in day codes
- Remember to separate multiple days with commas

**Problem:** Events appearing on wrong dates

**Solutions:**

- Check start_date_time is correct
- Verify time zone interpretation
- Confirm INTERVAL matches expectation

## Best Practices {#best-practices}

**Keep It Simple:**

```
✅ FREQ=WEEKLY;BYDAY=SU
❌ Complex patterns that are hard to explain
```

**Document Complex Schedules:**

```yaml
Title: Bi-Weekly Tue/Thu Deployment
Description: |
    Occurs every other week on Tuesday and Thursday
    RRULE: FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH
```

**Test Before Production:**

```
1. Create maintenance with INACTIVE status
2. Verify events generate correctly
3. Check dates and times
4. Set to ACTIVE when confirmed
```

**Use Descriptive Titles:**

```
✅ "Weekly Sunday 3AM Security Updates"
❌ "Maintenance"
```

## Reference Card {#reference-card}

**Quick Reference:**

| Pattern           | RRULE                                  |
| :---------------- | :------------------------------------- |
| One-time          | `FREQ=MINUTELY;COUNT=1`                |
| Every day         | `FREQ=DAILY`                           |
| Every other day   | `FREQ=DAILY;INTERVAL=2`                |
| Weekdays          | `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`     |
| Every Sunday      | `FREQ=WEEKLY;BYDAY=SU`                 |
| Bi-weekly Mondays | `FREQ=WEEKLY;INTERVAL=2;BYDAY=MO`      |
| First of month    | `FREQ=MONTHLY;BYMONTHDAY=1`            |
| 15th of month     | `FREQ=MONTHLY;BYMONTHDAY=15`           |
| Quarterly         | `FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1` |

**Day Codes:**

- MO = Monday
- TU = Tuesday
- WE = Wednesday
- TH = Thursday
- FR = Friday
- SA = Saturday
- SU = Sunday

## Next Steps {#next-steps}

- [Creating and Managing Maintenances](/docs/maintenances/creating-managing) - Apply these patterns in the dashboard
- [Maintenance Events](/docs/maintenances/events) - Understand how RRULE generates events
- [Maintenance Overview](/docs/maintenances/overview) - Learn maintenance fundamentals
