---
title: User Subscriptions
description: Let users subscribe to email updates about the monitors they choose
---

Use subscriptions to let users follow specific **monitors** by email. A subscriber hears about a monitor's status changes and about the incidents and maintenances that affect it, and about nothing else.

## How subscriptions work {#how-subscriptions-work}

1. Admin enables subscriptions in dashboard settings.
2. Email must be configured (SMTP/Resend) so verification and update emails can be sent.
3. User subscribes from the public status page using email + OTP verification.
4. User picks the monitors to follow.
5. When one of those monitors changes status, or an incident or maintenance affects it, Kener emails the user.

## Prerequisites {#prerequisites}

Before users can subscribe:

- Subscriptions must be enabled in **Manage → Subscriptions**, with **Monitor Updates** on.
- Email setup must be valid.

> [!IMPORTANT]
> The subscribe UI is shown only when subscriptions are enabled **and** email sending is available.

See [Email Setup](/docs/v4/setup/email-setup).

## Enable subscriptions (admin) {#enable-subscriptions-admin}

Go to **Manage → Subscriptions**:

1. Turn on **Enable Subscriptions**.
2. Keep **Monitor Updates** on.

This writes the `subscriptionsSettings` site configuration used by the subscription API. Turning subscriptions off also stops the emails to existing subscribers.

## How users subscribe (public flow) {#how-users-subscribe-public-flow}

From the status page, user clicks **Subscribe**:

1. Enter email. If a [Captcha provider](/docs/v4/captcha) is enabled, solve the challenge first.
2. Kener sends a 6-digit verification code.
3. User enters OTP to verify.
4. Kener stores a subscriber session token in browser storage.
5. User searches the monitor list and ticks the monitors to follow. Each change saves at once.

The list holds every monitor that is `ACTIVE` and not hidden. If the token is invalid or expired, the user is asked to verify again.

## Manage subscribers (admin) {#add-subscriber-from-backend-admin}

From **Manage → Subscriptions**, admins can:

- Click **Add Subscriber**, enter an email, pick monitors, and save.
- Click a subscriber's **Monitors** cell to change the monitors they follow.
- Delete subscribers.

## When notifications are triggered {#when-notifications-are-triggered}

Each email goes only to the subscribers of the monitors it is about. A hidden monitor has no subscribers: it is not offered, and a monitor hidden after users subscribed stops sending them email. An incident or maintenance that affects no visible monitor reaches no one, even when it is global (`is_global = YES`). See [Monitor visibility](/docs/v4/monitors/visibility#where-each-rule-applies).

### Status changes {#status-change-notifications}

Kener emails a monitor's subscribers when its status changes between `UP`, `DEGRADED`, and `DOWN`:

- The status is the one the status page shows, after the [grace period](/docs/v4/monitors/grace-period).
- A `NO_DATA` gap is not a change. After the gap, Kener compares with the status before it.
- Status set by an incident or maintenance does not send this email. The incident or maintenance email covers it.
- The first status Kener sees after its cache is cleared, such as after a Redis reset, only sets the starting point.

### Incident notifications {#incident-notifications}

Kener queues an incident email for each update posted on an incident, from any source, to the subscribers of the incident's monitors:

- An update added in the dashboard
- An update added through the API (`POST /api/v4/incidents/{incident_id}/comments`)
- The update an alert adds when it creates the incident, and when it resolves it

Each incident email ends with the incident's affected monitors and their impact, such as `Kener.ing: DOWN`, so subscribers see which of their monitors is hit. When a monitor is added to an incident that already has an update and is not resolved, that monitor's subscribers get the latest update, which names the added monitor.

Status set by an incident does not send a separate [status change](/docs/v4/subscriptions#status-change-notifications) email: the incident email covers it.

Updates on legacy incidents of type `MAINTENANCE` (from before v4 maintenances) do not queue this email.

### Maintenance notifications {#maintenance-notifications}

Maintenance emails go to the subscribers of the maintenance's monitors on the lifecycle events turned on in [maintenance notification settings](/docs/v4/setup/site-configuration): created, starting soon, in progress, completed, and cancelled. See [Maintenance Events](/docs/v4/maintenances/events#subscriber-notifications).

When a monitor is added to an active maintenance with a window still to come, that monitor's subscribers get a **Maintenance Updated** email about the next window, if creation emails are on.

## How emails are delivered {#how-emails-are-delivered}

When an event is queued:

1. Kener selects the active subscribers of the event's monitors, each email address once.
2. Kener renders the `subscription_update` email template with event/site variables. `{{event_type}}` is `incidents`, `maintenances`, or `monitors` for a status change. See [Email Templates](/docs/v4/guides/email-templates#subscription-update-variables).
3. Kener enqueues **one email per recipient** (privacy-safe fan-out).
4. Email sender queue sends the final emails.

## Upgrading from earlier subscriptions {#upgrading}

On the first start after upgrading, the `20261023120000_add_monitor_subscriptions` migration creates the `subscriber_monitor_subscriptions` table and copies earlier subscribers into it, once. It only reads the old tables and never changes them.

| Earlier subscription                                 | Becomes                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Kener 3: a monitor, by tag or by name                | That monitor; a subscription turned off in Kener 3 stays turned off        |
| Kener 3: all monitors (`ALL` or `_`)                 | Every monitor that is `ACTIVE` and not hidden at upgrade time              |
| Kener 4.0–4.1: all incidents and/or all maintenances | Every monitor that is `ACTIVE` and not hidden, so status changes are added |

- One email gets one subscriber, whatever its case. An email that is already a Kener 4 subscriber is reused, not duplicated.
- A Kener 3 subscriber who never confirmed their email is copied, but gets no mail until they sign in from the status page.
- Kener 3 sign-ins saved in visitors' browsers do not carry over. Subscribers sign in again with a code to change their monitors.
- Monitors added after the upgrade are not added to anyone's subscriptions.

Unfollowing a monitor later sets its row in `subscriber_monitor_subscriptions` to `INACTIVE`; following it again sets it back to `ACTIVE`.

### Review the copy {#review-the-migration}

Rows Kener cannot copy are not dropped: a monitor that no longer exists, an invalid email, a subscriber type other than email, or a subscription whose subscriber is gone. Kener writes each to the `subscription_migration_report` table with its source row and reason, and logs a warning during the migration.

**Manage → Subscriptions** shows these rows under **Subscribers the upgrade could not copy**. Fix a subscriber from the **Monitors** cell if needed.

> [!TIP]
> Back up the database before upgrading.

Subscriptions stay enabled if either earlier setting, incident or maintenance updates, was on.

## Verify your setup {#verify-your-setup}

- Enable subscriptions in dashboard.
- Confirm email setup works.
- Subscribe with a test email from the public status page and pick a monitor.
- Post an update on an incident that affects that monitor.
- Confirm the email arrives, and that a subscriber who follows another monitor gets nothing.
