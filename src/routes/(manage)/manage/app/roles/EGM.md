# Roles Page

## Overview

This route serves `/manage/app/roles`. It creates, clones, edits, and deletes roles, sets each role's permissions, and adds users to or removes users from a role. A role is a named set of permissions in the `roles` table. Its links are in `roles_permissions` and `users_roles`. The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page reads `userPermissions` from the layout data. `hasPermission(perm)` checks that list.
- The page sends `getRoles`, `getAllPermissions`, `getRolePermissions`, and `getRoleUsers` (permission `roles.read`). When the users sheet opens and the user has `roles.assign_users`, it sends `getUsers` (permission `users.read`) with `page` 1 and `limit` 1000.
- Create sends `createRole` (permission `roles.write`) with `role_id` and `name`. Clone mode then copies the source role's permissions with `getRolePermissions` and `updateRolePermissions`.
- Edit sends `updateRole` (permission `roles.write`) with `roleId`, `name`, and `status`.
- Delete sends `deleteRole` (permission `roles.write`) with `roleId` and `options`. `options` is `{ action: "remove" }` or `{ action: "migrate", targetRoleId }`.
- The permissions sheet saves with `updateRolePermissions` (permission `roles.assign_permissions`) and `permissionIds`.
- The users sheet sends `addUserToRole` and `removeUserFromRole` (permission `roles.assign_users`) with `roleId` and `userId`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `roles.read` open this route.
- The page hides the create, clone, edit, and delete buttons without `roles.write`. It disables the permission checkboxes without `roles.assign_permissions`. It hides the user add and remove controls without `roles.assign_users`.
- A role with `readonly === 1` cannot be edited or deleted, and its permissions cannot change. The user can still clone it.
- Create needs a `role_id` and a name. After a create, the page finds the new role by `role_id` lowercased, with spaces changed to `_`.
- Create plus clone is several requests. When a later request fails, the new role exists without the copied permissions.
- In migrate mode, the delete needs a target role. The target cannot be the deleted role or an inactive role. A clone source must be an `ACTIVE` role.
- The page removes a user from a role with no confirmation.

## Side Effects

- The actions write `roles`, `roles_permissions`, and `users_roles`. `updateRolePermissions` replaces the whole permission set of the role.
- A migrate delete moves the role's users to the target role.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
