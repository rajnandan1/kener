# Alerting Overview {#alerting-overview}

Kener's alerting system enables you to get notified when your monitors detect issues. The alerting system is designed to be flexible and powerful, allowing you to configure exactly when and how you want to be notified.

## How Alerting Works {#how-alerting-works}

The alerting flow in Kener follows this sequence:

```
Monitor → Alert Configuration → Condition Met → Alert Event → Trigger → Notification
```

1. **Monitor** - Your monitor runs and collects data (status, latency, etc.)
2. **Alert Configuration** - Defines the conditions that should trigger an alert
3. **Condition Met** - The alert configuration thresholds are reached
4. **Alert Event** - An alert record is created in the system
5. **Trigger** - The notification channel (Discord, Slack, Email, Webhook, etc.)
6. **Notification** - You receive the alert through your configured channel(s)

## Key Concepts {#key-concepts}

### Alert Configurations {#alert-configurations}

Alert configurations are rules that define when alerts should be triggered. Each configuration includes:

- **Monitor** - Which monitor to watch
- **Alert Type** - What metric to monitor (STATUS, LATENCY, or UPTIME)
- **Thresholds** - How many consecutive failures/successes before triggering/resolving
- **Severity** - CRITICAL or WARNING
- **Triggers** - Which notification channels to use

### Alert Types {#alert-types}

Kener supports three types of alerts:

**STATUS Alerts**
Monitor the status of your service (DOWN or DEGRADED). Use this when you want to be notified immediately when a service goes down.

**LATENCY Alerts**
Monitor response time. Trigger alerts when latency exceeds a threshold (in milliseconds) for consecutive checks.

**UPTIME Alerts**
Monitor overall uptime percentage. Trigger alerts when uptime falls below a specified percentage over a time period.

### Triggers (Notification Channels) {#triggers}

Triggers are the notification channels where alerts are sent. Kener supports:

- **Webhook** - Send HTTP POST requests to custom endpoints
- **Discord** - Send messages to Discord channels
- **Slack** - Send messages to Slack channels
- **Email** - Send emails via Resend or SMTP

Each trigger can be configured with:

- Custom templates using mustache syntax
- Environment variables for secrets (tokens, API keys)
- Headers and authentication

### Alert Events {#alert-events}

When an alert configuration's conditions are met, an alert event is created. Alert events have two states:

- **TRIGGERED** - The alert condition has been met
- **RESOLVED** - The alert condition has been resolved (success threshold met)

You can view all alert events for a specific configuration in the alert logs page.

### Thresholds {#thresholds}

Thresholds control when alerts trigger and resolve:

**Failure Threshold**
Number of consecutive failing checks before triggering an alert. This prevents false positives from temporary glitches.

**Success Threshold**
Number of consecutive successful checks before resolving an alert. This ensures the issue is truly fixed before stopping notifications.

## When to Use Each Alert Type {#when-to-use-each-alert-type}

### Use STATUS Alerts When: {#use-status-alerts}

- You need immediate notification when a service goes down
- You're monitoring critical services where any downtime matters
- You want separate alerts for DEGRADED vs DOWN states

### Use LATENCY Alerts When: {#use-latency-alerts}

- Performance degradation is as important as outages
- You have SLAs based on response times
- You want to catch issues before they cause complete failures

### Use UPTIME Alerts When: {#use-uptime-alerts}

- You're monitoring overall reliability over time
- You have uptime SLAs (e.g., 99.9% uptime)
- You want to be notified about reliability trends

## Alert Lifecycle {#alert-lifecycle}

1. **Monitor Checks** - Your monitor runs on its schedule
2. **Condition Evaluation** - Alert configurations check if their conditions are met
3. **Threshold Counting** - Consecutive failures/successes are counted
4. **Alert Triggered** - When failure threshold is reached, alert is TRIGGERED
5. **Notification Sent** - All configured triggers send notifications
6. **Incident Created** (Optional) - If enabled, an incident is automatically created
7. **Alert Resolved** - When success threshold is reached, alert changes to RESOLVED
8. **Resolution Notification** - Triggers send resolution notifications

## Next Steps {#next-steps}

- [Alert Configurations](/docs/alerting/alert-configurations) - Learn how to create and manage alert configurations
- [Triggers](/docs/alerting/triggers) - Set up notification channels
- [Templates](/docs/alerting/templates) - Customize notification templates
- [Webhook Examples](/docs/alerting/webhook-examples) - See practical webhook examples
