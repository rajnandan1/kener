---
title: Kener Role Based Access Control (RBAC)
description: Role-Based Access Control (RBAC) in Kener
---

# Role-Based Access Control (RBAC) in Kener

Kener includes a comprehensive role-based access control system that allows you to manage user permissions and access to various features. This document explains the available roles, their permissions, and how to manage users effectively.

## Available Roles

Kener offers three different roles with varying levels of permissions:

| Role   | Description                                                                    |
| ------ | ------------------------------------------------------------------------------ |
| Admin  | Full access to all features including user management and system configuration |
| Editor | Can create and edit monitors, triggers, incidents, and other operational data  |
| Member | Read-only access with limited interaction capabilities                         |

## Role Permissions

### Admin

Admins have unrestricted access to the entire system:

- **User Management**:

    - Create, update, and deactivate users
    - Change user roles
    - Reset passwords for other users
    - Send verification emails

- **System Configuration**:

    - Configure all site settings
    - Manage API keys
    - Set up triggers and integrations

- **Operational Access**:
    - Full access to create and manage monitors
    - Create and update incidents
    - Run tests on monitors and triggers
    - Configure all notification channels

### Editor

Editors can manage most operational aspects but cannot administer users:

- **Content Management**:

    - Create and edit monitors
    - Configure monitor settings
    - Create and manage triggers
    - Create and update incidents
    - Add incident updates and comments

- **Limited Access**:
    - Cannot manage users
    - Cannot change role assignments
    - Cannot access certain system-level configurations

### Member

Members have read-only access with minimal interaction capabilities:

- **View Access**:

    - View all monitors and their status
    - View incidents and their history
    - See system configuration (but cannot modify)

- **Limited Interactions**:
    - Can test existing triggers but cannot create or edit them
    - Cannot create or update incidents
    - Cannot modify any system configuration

## Managing Users

### Adding New Users

Only Admins and Editors can add new users to the system:

1. Navigate to the **Users** page in the management dashboard
2. Click the **Add New User** button
3. Fill in the required information:
    - Name
    - Email
    - Password
    - Role (Member or Editor)
4. Click **Add User** to create the account

When a new user is added, a verification email can be sent to confirm their email address if email sending is configured.

### User Settings

Admins can manage user accounts through the user settings page:

- **Email Verification**: Send verification emails to users
- **Password Reset**: Reset a user's password
- **Role Management**: Change a user's role between Member and Editor
- **Account Status**: Activate or deactivate user accounts

### Best Practices

1. **Follow the Principle of Least Privilege**:

    - Assign the minimum necessary permissions for users to perform their job
    - Start users with the Member role and elevate as needed

2. **Regular Access Reviews**:

    - Periodically review user access and roles
    - Remove access for users who no longer need it

3. **Admin Accounts**:
    - Limit the number of Admin accounts
    - Use strong passwords for Admin accounts
    - Consider using email verification for all users

## Role Limitations

- The Admin role can only be assigned during initial setup
- Members cannot create or modify content
- Users cannot modify their own role (only an Admin can change roles)

## Email Verification

When email sending is configured, users can verify their email addresses:

1. Admins can send verification emails from the user management interface
2. Users receive an email with a verification link
3. After clicking the link, the user's email is marked as verified

Email verification improves security and ensures that users have provided valid email addresses for notifications.
