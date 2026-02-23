---
title: User Management
description: Manage users, roles, invitations, and role permissions in Kener
---

Use **Manage → Users** to invite teammates, control access, and manage account status.

## Roles overview {#roles-overview}

Kener uses three roles:

| Role     | What it means                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| `admin`  | Full access, including user administration and vault/API-key level operations                                |
| `editor` | Can run day-to-day operations (monitors, incidents, maintenances, site settings) but cannot administer users |
| `member` | Limited access; cannot administer users or change system settings                                            |

## What each role can do {#what-each-role-can-do}

### Admin {#admin}

Admin can:

- invite users
- resend invitations
- change user role (`member` / `editor`)
- activate/deactivate users
- send verification email to any user
- perform all editor-level operational actions
- manage admin-only areas like vault and certain privileged API actions

### Editor {#editor}

Editor can:

- invite users
- resend invitation emails
- manage monitors, incidents, maintenances, alerts, triggers, pages, subscriptions, and site data

Editor cannot:

- change user roles
- activate/deactivate users
- perform admin-only user administration actions

### Member {#member}

Member can:

- sign in and use allowed views
- send verification email for their own account (if unverified)

Member cannot:

- invite users
- resend invitations
- change roles
- activate/deactivate other users
- perform admin/editor configuration actions

## Invite flow {#invite-flow}

> [!IMPORTANT]
> Email must be configured before invitation flow can be used.

From **Manage → Users**:

1. Click **Add User**.
2. Enter name, email, and role (`editor` or `member`).
3. Invitation email is sent with a secure token link.

Current behavior:

- invited user is created with inactive account and empty password
- invitation token expires after 7 days

## How users accept invitation {#how-users-accept-invitation}

When user opens invitation link:

1. Token is validated (view + token + expiry).
2. User sets password on invitation page.
3. On success, account is activated and marked verified.
4. User signs in normally.

If link is invalid, expired, or already used, invitation page shows an error and user cannot activate from that link.

## Verification emails {#verification-emails}

- Admin/editor can send verification email to users.
- Member can only trigger verification for their own account.

## Common user management tasks {#common-user-management-tasks}

- **Promote/demote user**: admin updates role in user settings sheet.
- **Deactivate user**: admin toggles account inactive (session access removed).
- **Re-invite user**: resend invitation if user has not set password yet.

## Requirements and dependencies {#requirements-and-dependencies}

- Email setup is required for:
    - inviting users
    - resending invitation emails
    - verification emails

See [Email Setup](/docs/v4/setup/email-setup).

## Related pages {#related-pages}

- [Site Configuration](/docs/v4/setup/site-configuration)
- [User Subscriptions](/docs/v4/subscriptions)
