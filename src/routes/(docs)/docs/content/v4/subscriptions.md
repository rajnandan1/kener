---
title: User Subscriptions
description: Let users subscribe to incident and maintenance email updates
---

Use subscriptions to let users receive email updates for **incidents** and **maintenances**.

## How subscriptions work {#how-subscriptions-work}

1. Admin enables subscriptions in dashboard settings.
2. Email must be configured (SMTP/Resend) so verification and update emails can be sent.
3. User subscribes from the public status page using email + OTP verification.
4. User enables incidents and/or maintenances preferences.
5. When events are triggered, Kener sends emails to active subscribers for that event type.

## Prerequisites {#prerequisites}

Before users can subscribe:

- Subscriptions must be enabled in **Manage → Subscriptions**.
- At least one email subscription type must be enabled (`incidents` and/or `maintenances`).
- Email setup must be valid.

> [!IMPORTANT]
> The subscribe UI is shown only when subscriptions are enabled **and** email sending is available.

See [Email Setup](/docs/v4/setup/email-setup).

## Enable subscriptions (admin) {#enable-subscriptions-admin}

Go to **Manage → Subscriptions**:

1. Turn on **Enable Subscriptions**.
2. Enable one or both:
    - **Incident Updates**
    - **Maintenance Updates**
3. Save.

This writes the `subscriptionsSettings` site configuration used by the subscription API.

## How users subscribe (public flow) {#how-users-subscribe-public-flow}

From the status page, user clicks **Subscribe**:

1. Enter email.
2. Kener sends a 6-digit verification code.
3. User enters OTP to verify.
4. Kener stores a subscriber session token in browser storage.
5. User toggles preferences for incidents and/or maintenances.

If token is invalid/expired, user is asked to verify again.

## Add subscriber from backend (admin) {#add-subscriber-from-backend-admin}

You can add subscribers manually from **Manage → Subscriptions**:

1. Click **Add Subscriber**.
2. Enter email.
3. Select event types (incidents, maintenances).
4. Save.

Admins can also:

- Toggle incident/maintenance subscription per subscriber
- Delete subscribers

## When notifications are triggered {#when-notifications-are-triggered}

### Incident notifications {#incident-notifications}

Incident subscription emails are queued when alert-driven incident lifecycle changes happen, including:

- Incident created from alert trigger
- Incident resolved from alert recovery

### Maintenance notifications {#maintenance-notifications}

Maintenance subscription emails are queued on maintenance event status transitions:

- `READY` (starting soon)
- `ONGOING`
- `COMPLETED`

## How emails are delivered {#how-emails-are-delivered}

When an event is queued:

1. Kener selects active subscribers for that `event_type`.
2. Kener renders the `subscription_update` email template with event/site variables.
3. Kener enqueues **one email per recipient** (privacy-safe fan-out).
4. Email sender queue sends the final emails.

## Verify your setup {#verify-your-setup}

- Enable subscriptions in dashboard.
- Confirm email setup works.
- Subscribe with a test email from public status page.
- Enable incident and/or maintenance preferences.
- Trigger a test incident or wait for maintenance state transition.
- Confirm email arrives.
