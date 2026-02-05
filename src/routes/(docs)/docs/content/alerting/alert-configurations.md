# Alert Configurations {#alert-configurations}

Alert configurations define the rules that determine when alerts should be triggered. Each configuration monitors a specific metric on a monitor and sends notifications through configured triggers when conditions are met.

## Accessing Alerts {#accessing-alerts}

Navigate to **Manage > Alerts** or visit `/manage/app/alerts` to view all your alert configurations.

The alerts page shows:

- All configured alerts across your monitors
- Alert status (Active/Inactive)
- Alert type (STATUS, LATENCY, UPTIME)
- Severity level (CRITICAL, WARNING)
- Associated triggers
- Quick actions to edit or view logs

## Creating an Alert Configuration {#creating-alert-configuration}

Click **Create Alert** to create a new alert configuration.

### 1. Select Monitor {#select-monitor}

Choose which monitor this alert should watch. This cannot be changed after creation, so choose carefully.

### 2. Choose Alert Type {#choose-alert-type}

Kener supports three types of alerts:

#### STATUS Alerts {#status-alerts}

Monitor the health status of your service.

**Alert Values:**

- `DOWN` - Service is completely unavailable
- `DEGRADED` - Service is partially unavailable or degraded

**Example Use Case:**
Alert when a critical API endpoint goes down:

- Alert Type: STATUS
- Alert Value: DOWN
- Failure Threshold: 1 (immediate alert)
- Success Threshold: 2 (ensure it's stable before resolving)

#### LATENCY Alerts {#latency-alerts}

Monitor response time and performance.

**Alert Value:** Threshold in milliseconds

**Example Use Case:**
Alert when API response time exceeds 1000ms:

- Alert Type: LATENCY
- Alert Value: 1000 (ms)
- Failure Threshold: 3 (three consecutive slow responses)
- Success Threshold: 5 (five fast responses to resolve)

#### UPTIME Alerts {#uptime-alerts}

Monitor overall availability over time.

**Alert Value:** Minimum uptime percentage (0-100)

**Example Use Case:**
Alert when uptime falls below 99.9%:

- Alert Type: UPTIME
- Alert Value: 99.9 (%)
- Failure Threshold: 5 (check over 5 measurement periods)
- Success Threshold: 3 (recover after 3 good periods)

### 3. Configure Thresholds {#configure-thresholds}

Thresholds prevent false alarms and ensure issues are real before alerting.

#### Failure Threshold {#failure-threshold}

Number of consecutive failing checks before triggering an alert.

**Recommended Values:**

- **1-2**: Critical services where any failure matters (production databases, payment systems)
- **3-5**: Normal services where occasional failures are tolerable
- **5+**: Services with known intermittent issues where you want to filter noise

#### Success Threshold {#success-threshold}

Number of consecutive successful checks before resolving an alert.

**Recommended Values:**

- **1-2**: Non-critical services where quick resolution is fine
- **3-5**: Critical services where you want to ensure stability
- **5+**: Services that have flaky recovery patterns

### 4. Set Severity {#set-severity}

Choose the severity level for this alert:

- **CRITICAL**: Immediate attention required, major impact
- **WARNING**: Attention needed, minor or potential impact

Severity helps prioritize alerts and can be used in templates to customize notification appearance.

### 5. Incident Creation {#incident-creation}

**Create Incident:** YES / NO

When set to YES:

- An incident is automatically created when the alert triggers
- The incident appears on your status page
- Subscribe users receive notifications about the incident
- The incident is linked to the alert in alert logs

When set to NO:

- Alert triggers but no incident is created
- Good for internal monitoring that shouldn't appear on status page
- Alert logs still track all events

### 6. Description (Optional) {#description}

Add a description to help your team understand:

- Why this alert exists
- What the threshold means
- What actions to take when it triggers
- Known false positives or edge cases

The description is for internal use and doesn't appear in notifications.

### 7. Select Triggers {#select-triggers}

Choose which notification channels should receive alerts:

- Select one or more triggers (Discord, Slack, Email, Webhook)
- You must create triggers first if none exist
- All selected triggers will receive notifications on both TRIGGERED and RESOLVED events
- Different alerts can use different triggers

**Tip:** Create a test trigger first to validate your alert configuration before using production channels.

### 8. Save Configuration {#save-configuration}

Click **Create Alert** to save your configuration.

- New alerts are active by default
- You'll be redirected to the alert edit page where you can view the ID
- The alert will start evaluating on the next monitor check

## Managing Alert Configurations {#managing-alert-configurations}

### Editing Alerts {#editing-alerts}

Click **Edit** on any alert to modify its configuration.

You can change:

- Alert type and value
- Thresholds
- Severity
- Incident creation setting
- Description
- Associated triggers
- Active status

**Note:** You cannot change the monitor after creation. Create a new alert if you need a different monitor.

### Activating/Deactivating Alerts {#activating-deactivating-alerts}

Use the toggle switch on each alert card to quickly activate or deactivate alerts without deleting them.

**When to Deactivate:**
-During planned maintenance

- When testing a monitor
- When temporarily not needed
- To prevent alert fatigue during known issues

Deactivated alerts:

- Don't evaluate conditions
- Don't send notifications
- Retain all historical data and configuration
- Can be reactivated instantly

### Viewing Alert Logs {#viewing-alert-logs}

Click ** Logs** on any alert to view its alert event history.

Alert logs show:

- All TRIGGERED and RESOLVED events
- Timestamp of each event
- Associated incidents (if any)
- Actions: Change status or delete events

**Filtering:**

- ALL: Show all alert events
- TRIGGERED: Show only active alerts
- RESOLVED: Show only resolved alerts

**Managing Alert Events:**
-Click the status dropdown to manually change between TRIGGERED/RESOLVED

- Click the trash icon to delete an alert event
- If event has an incident, you can choose to also delete the incident

### Deleting Alert Configurations {#deleting-alert-configurations}

1. Open the alert configuration you want to delete
2. Scroll to the **Danger Zone** section
3. Click **Delete Alert**
4. Confirm deletion

**Warning:** This action cannot be undone.

**What Gets Deleted:**

- The alert configuration
- All associated alert events (cascading delete)
- Scheduled evaluations

**What Doesn't Get Deleted:**

- The monitor
- Associated triggers
- Created incidents (they become orphaned but remain on status page)

## Filtering and Organization {#filtering-organization}

### Filter by Monitor {#filter-by-monitor}

Use the monitor dropdown to view alerts for a specific monitor. This helps when:

- Reviewing alerts for a critical service
- Auditing alert coverage for a monitor
- Troubleshooting alert behavior

### Pagination {#pagination}

Alert configurations are paginated (20 per page) for performance. Use the pagination controls to browse all your alerts.

## Best Practices {#best-practices}

### Start Conservative {#start-conservative}

Begin with higher thresholds (3-5 failures) to prevent alert fatigue. Lower thresholds after validating alert accuracy.

### Use Descriptive Names {#use-descriptive-names}

The alert is automatically named based on monitor + alert type, but add descriptions to explain the "why" behind each alert.

### Group Related Alerts {#group-related-alerts}

For critical services:

- STATUS alert with threshold 1 (immediate)
- LATENCY alert with threshold 3 (performance degradation)
- UPTIME alert with threshold 5 (trend monitoring)

### Severity Guidelines {#severity-guidelines}

**CRITICAL:**

- Production outages
- Data loss risks
- Security incidents
- Revenue-impacting issues

**WARNING:**

- Performance degradation
- Approaching limits
- Non-critical service issues
- Maintenance reminders

### Test Before Production {#test-before-production}

1. Create a test trigger (webhook to a test endpoint)
2. Create your alert with the test trigger
3. Verify it triggers correctly
4. Replace test trigger with production triggers

### Document Actions {#document-actions}

In the description field, include:

```
Purpose: Monitor API response time for checkout endpoint
Threshold: 500ms indicates database query issues
Action: Check DB slow query log, restart API if needed
Escalation: Page on-call after 10 minutes
Known Issues: Spikes during daily batch job (3-4am UTC)
```

### Review Regularly {#review-regularly}

Quarterly review:

- Are alerts still relevant?
- Are thresholds tuned correctly?
- Are there false positives?
- Are there gaps in coverage?
- Are triggers up to date?

## Alert Configuration Examples {#alert-configuration-examples}

### Simple Status Alert {#simple-status-alert}

```
Monitor: Production API
Alert Type: STATUS
Alert Value: DOWN
Failure Threshold: 1
Success Threshold: 2
Severity: CRITICAL
Create Incident: YES
Triggers: PagerDuty, Slack #oncall
```

### Performance Degradation {#performance-degradation}

```
Monitor: Web Application
Alert Type: LATENCY
Alert Value: 2000
Failure Threshold: 5
Success Threshold: 10
Severity: WARNING
Create Incident: NO
Triggers: Slack #performance
```

### SLA Monitoring {#sla-monitoring}

```
Monitor: Payment Gateway
Alert Type: UPTIME
Alert Value: 99.9
Failure Threshold: 6
Success Threshold: 12
Severity: CRITICAL
Create Incident: YES
Triggers: Email (SRE Team), PagerDuty
```

## Troubleshooting {#troubleshooting}

### Alert Not Triggering {#alert-not-triggering}

**Check:**

1. Is the alert active? (toggle switch on)
2. Is the monitor running? (check monitor schedule)
3. Are conditions actually met? (check monitor data)
4. Are thresholds too high? (lower failure threshold temporarily to test)
5. View alert logs to see evaluation history

### Too Many Alerts (False Positives) {#too-many-alerts}

**Solutions:**

1. Increase failure threshold
2. Adjust alert value to be less sensitive
3. Review if monitor is checking correctly
4. Add description documenting known false positive patterns
5. Temporarily deactivate during maintenance

### Alert Not Resolving {#alert-not-resolving}

**Check**:

1. Success threshold may be too high
2. Monitor may still be failing intermittently
3. Manually resolve from alert logs if needed
4. Review success threshold setting

### Missing Notifications {#missing-notifications}

**Check:**

1. Are triggers configured and active?
2. Check trigger logs for errors
3. Verify trigger authentication/tokens
4. Test trigger independently
5. Check if trigger rate limits are hit

## Next Steps {#next-steps-configs}

- [Triggers](/docs/alerting/triggers) - Set up notification channels
- [Templates](/docs/alerting/templates) - Customize notification messages
- [Webhook Examples](/docs/alerting/webhook-examples) - See webhook integration examples
