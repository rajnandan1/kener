# Users Page

## Overview

This route serves `/manage/app/users`. It lists the dashboard users, invites new users, changes a user's roles, and turns a user on or off. A user is a row in the `users` table, and the user's roles are in `users_roles`. The page has no `load` function. It reads `userDb`, `userPermissions`, and `canSendEmail` from the layout data. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getUsers` (permission `users.read`) with `page`, `limit`, and `is_active` (1 or 0 from the status filter).
- The page sends `getRoles` (permission `roles.read`) to fill the role checkboxes.
- The invite dialog sends `createNewUser` (permission `users.write`) with `name`, `email`, and `role_ids`.
- The settings sheet sends `resendInvitation` (permission `users.write`) with `email`.
- The settings sheet sends `manualUpdate` (permission `users.write`) with the user and `updateType` `role` or `is_active`. `ManualUpdateUserData` in `src/lib/server/controllers/userController.ts` handles the action.
- The verify button sends `sendVerificationEmail` with `toId`. The action needs no permission for the user's own id and `users.write` for another user.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `users.read` open this route.
- The page shows the invite button and the settings button only with `users.write`. It hides the settings button on the current user's own row.
- The page shows the verify button only on the current user's own row, and only while that user is unverified. So the page never sends `sendVerificationEmail` for another user.
- The invite button and the resend button are disabled when `canSendEmail` is `false`, which means email is not set up.
- The settings sheet shows the resend button only for a user with no password whose `auth_provider` is not OIDC. `resendInvitationEmail` shows "Invitation email resent" without reading the response, so it also shows it when the server returns an error.
- An invite needs a name of 2 through 100 characters, a valid email, and at least one role.
- A role update needs at least one role. On the server, `ManualUpdateUserData` also rejects a role that does not exist or is not active. It keeps the `admin` role on the owner (`is_owner` `YES`), and it refuses to deactivate the owner.
- The page treats a user as verified when `is_verified` is set or `auth_provider` is OIDC.

## Side Effects

- `createNewUser` and `resendInvitation` send an invitation email. `sendVerificationEmail` sends a verification email.
- `manualUpdate` writes `users` and `users_roles`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
