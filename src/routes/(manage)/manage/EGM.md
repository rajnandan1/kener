# Dashboard Shell

## Overview

This folder holds the sidebar and header components of the admin dashboard, plus the manage API and the dashboard pages. It has no `+page.svelte`, so `/manage` serves no page itself. `src/routes/(manage)/+layout.svelte` renders `AppSidebar` and `SiteHeader` around every dashboard page.

## Interface

- `AppSidebar` (`app-sidebar.svelte`) takes the prop `navItems` (a list of `{ title, url, icon }`) and passes the other props to `Sidebar.Root`. Its header links to `/manage/app/site-configurations` and shows the logo and the app version. It renders `NavMain` with the items and `NavUser` in the footer.
- `NavMain` (`nav-main.svelte`) takes the prop `items` and renders one link for each item.
- `SiteHeader` (`site-header.svelte`) takes the prop `title`. It renders the sidebar toggle, the title, a "Status Page" link to `/`, and a "Documentation" link to `https://kener.ing/docs`. Both links open in a new tab.
- `NavUser` (`nav-user.svelte`) has no props. It shows the current user's menu: Account, the light and dark toggle, and Log out.
- The Account dialog sends `updateUser` with `{ updateKey: "name", updateValue }`, and `updatePassword` with `{ newPassword, newPlainPassword }`. Both actions go to the manage API, and they need only a session, no permission.
- [api](./api/EGM.md): the `POST /manage/api` endpoint, which runs a dashboard action by name after a session check and a permission check.
- [app](./app/EGM.md): the dashboard pages under `/manage/app/*`.

## Invariants

- `NavUser` copies `page.data.userDb` once, when it starts. A later change of the page data does not update it.
- `NavMain` marks an item as active when the current path starts with the item's URL.
- The name Save button is disabled when the name is empty after trim.
- The Update Password button is disabled unless the password has at least 8 characters, a digit, a lowercase letter, and an uppercase letter, and the confirm field matches. The server checks the password again with `ValidatePassword` in `src/lib/server/controllers/commonController.ts`.

## Side Effects

- `updateUser` writes the user's name to `users`. `updatePassword` writes the password hash.
- `UpdateUserData` in `src/lib/server/controllers/userController.ts` also accepts the `is_verified` key. The Account dialog sends only `name`.
- Log out is a native form `POST` to `/account/logout`, which loads a new page.
- The light and dark item calls `toggleMode` from `mode-watcher`.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
