---
title: User Management
description: Manage users, roles, permissions, and invitations in Kener
---

Use **Manage → Users** to invite teammates and manage account status. Use **Manage → Roles** to control access with fine-grained permissions.

## Roles and permissions {#roles-and-permissions}

Kener uses a role-based access control (RBAC) system. Each user can be assigned one or more **roles**, and each role has a set of **permissions** that determine what actions the user can perform.

### Built-in roles {#built-in-roles}

Three readonly roles are seeded automatically:

| Role     | Permissions | Notes |
| -------- | ----------- | ----- |
| `admin`  | All permissions | Full access including `api_keys.delete` |
| `editor` | All except `api_keys.delete` | Day-to-day operations |
| `member` | All `.read` permissions only | View-only access |

Built-in roles cannot be edited or deleted.

### Custom roles {#custom-roles}

From **Manage → Roles**, users with the `roles.write` permission can create custom roles:

1. Click **Create Role**.
2. Enter a role ID (lowercase, numbers, underscores, hyphens) and display name.
3. Optionally clone permissions from an existing role.
4. After creation, assign permissions in the **Permissions** panel.

Custom roles can be edited, deactivated, or deleted. When deleting a custom role, you can either remove user assignments or migrate them to another role.

### Permission domains {#permission-domains}

Permissions follow a `domain.action` format:

| Domain | Actions |
| ------ | ------- |
| `monitors` | `read`, `write` |
| `incidents` | `read`, `write` |
| `maintenances` | `read`, `write` |
| `pages` | `read`, `write` |
| `triggers` | `read`, `write` |
| `alerts` | `read`, `write` |
| `api_keys` | `read`, `write`, `delete` |
| `users` | `read`, `write` |
| `settings` | `read`, `write` |
| `subscribers` | `read`, `write` |
| `email_templates` | `read`, `write` |
| `images` | `write` |
| `roles` | `read`, `write`, `assign_permissions`, `assign_users` |

Permissions are enforced at both the **route level** (page access) and the **action level** (API operations).

### Managing role permissions {#managing-role-permissions}

From the roles table, click **Permissions** on any role to view or edit its permissions. Permissions are grouped by domain and can be toggled individually. Readonly (built-in) roles show permissions in read-only mode.

### Managing role users {#managing-role-users}

Click **Users** on any role to see assigned users. Users with `roles.assign_users` permission can add or remove users from roles.

## User management {#user-management}

Users with the `users.write` permission can:

- invite new users
- resend invitation emails
- update user roles
- activate/deactivate users
- send verification emails

Owner-specific restrictions:

- the owner must always retain the `admin` role
- the owner account cannot be deactivated

## Invite flow {#invite-flow}

> [!IMPORTANT]
> Email must be configured before invitation flow can be used.

From **Manage → Users**:

1. Click **Add User**.
2. Enter name, email, and select one or more roles.
3. Invitation email is sent with a secure token link.

Current behavior:

- invited user is created with inactive account and empty password
- invitation token expires after 7 days
- all selected roles must be active

## How users accept invitation {#how-users-accept-invitation}

When user opens invitation link:

1. Token is validated (view + token + expiry).
2. User sets password on invitation page.
3. On success, account is activated and marked verified.
4. User signs in normally.

If link is invalid, expired, or already used, invitation page shows an error and user cannot activate from that link.

## Verification emails {#verification-emails}

- Users with `users.write` permission can send verification emails to other users.
- Any user can trigger verification for their own account (if unverified).

## Common tasks {#common-tasks}

- **Change user roles**: open user settings sheet, toggle roles, and click **Update Roles**. Users can be assigned multiple roles simultaneously.
- **Deactivate user**: toggle account inactive in user settings sheet. Existing sessions are invalidated.
- **Re-invite user**: resend invitation if user has not set password yet.

## UI behavior notes {#ui-behavior-notes}

- The current signed-in user is highlighted in the users table.
- Users table can be filtered by active/inactive status.
- Role badges show the user's assigned role IDs.

## Requirements and dependencies {#requirements-and-dependencies}

- Email setup is required for:
    - inviting users
    - resending invitation emails
    - verification emails

See [Email Setup](/docs/v4/setup/email-setup).

## Related pages {#related-pages}

- [Site Configuration](/docs/v4/setup/site-configuration)
- [User Subscriptions](/docs/v4/subscriptions)
