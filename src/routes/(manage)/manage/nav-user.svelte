<script lang="ts">
  import CreditCardIcon from "@lucide/svelte/icons/credit-card";
  import DotsVerticalIcon from "@lucide/svelte/icons/ellipsis-vertical";
  import LogoutIcon from "@lucide/svelte/icons/log-out";
  import NotificationIcon from "@lucide/svelte/icons/bell";
  import UserCircleIcon from "@lucide/svelte/icons/user-circle";
  import CheckIcon from "@lucide/svelte/icons/check";
  import LoaderIcon from "@lucide/svelte/icons/loader";

  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import type { UserRecordPublic } from "$lib/server/types/db";
  import { toggleMode, mode } from "mode-watcher";
  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";
  import clientResolver from "$lib/client/resolver.js";

  let base = resolve("/");
  let user = $state<UserRecordPublic>(page.data.userDb);
  let nameAbbr = $derived(
    user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  );

  const sidebar = Sidebar.useSidebar();

  // Account dialog state
  let accountDialogOpen = $state(false);
  let myName = $state(user.name);
  let myPassword = $state("");
  let plainPassword = $state("");
  let savingName = $state(false);
  let resettingPass = $state(false);
  let nameError = $state("");
  let passwordError = $state("");
  let nameSuccess = $state(false);
  let passwordSuccess = $state(false);

  // Password validation
  let hasDigit = $derived(/\d/.test(myPassword));
  let hasLowercase = $derived(/[a-z]/.test(myPassword));
  let hasUppercase = $derived(/[A-Z]/.test(myPassword));
  let hasLetter = $derived(/[a-zA-Z]/.test(myPassword));
  let hasMinLength = $derived(myPassword.length >= 8);
  let passwordsMatch = $derived(myPassword === plainPassword && myPassword !== "");
  let isPasswordValid = $derived(
    hasDigit && hasLowercase && hasUppercase && hasLetter && hasMinLength && passwordsMatch
  );

  // Role badge styling
  let roleBadgeClass = $derived(() => {
    switch (user.role) {
      case "admin":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300";
      case "editor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "member":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  });

  async function saveName() {
    savingName = true;
    nameError = "";
    nameSuccess = false;
    try {
      const response = await fetch(base + "/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateUser",
          data: { updateValue: myName, updateKey: "name" }
        })
      });
      const resp = await response.json();
      if (resp.error) {
        nameError = resp.error;
      } else {
        user.name = myName;
        nameSuccess = true;
        setTimeout(() => (nameSuccess = false), 2000);
      }
    } catch {
      nameError = "Error while saving name";
    } finally {
      savingName = false;
    }
  }

  async function updatePassword() {
    resettingPass = true;
    passwordError = "";
    passwordSuccess = false;
    try {
      const response = await fetch(base + "/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePassword",
          data: { newPassword: myPassword, newPlainPassword: plainPassword }
        })
      });
      const resp = await response.json();
      if (resp.error) {
        passwordError = resp.error;
      } else {
        myPassword = "";
        plainPassword = "";
        passwordSuccess = true;
        setTimeout(() => (passwordSuccess = false), 2000);
      }
    } catch {
      passwordError = "Error while updating password";
    } finally {
      resettingPass = false;
    }
  }

  function openAccountDialog() {
    myName = user.name;
    myPassword = "";
    plainPassword = "";
    nameError = "";
    passwordError = "";
    nameSuccess = false;
    passwordSuccess = false;
    accountDialogOpen = true;
  }
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            {...props}
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar.Root class="size-8 rounded-lg grayscale">
              <Avatar.Fallback class="rounded-lg">
                {nameAbbr}
              </Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{nameAbbr}</span>
              <span class="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            </div>
            <DotsVerticalIcon class="ms-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
        side={sidebar.isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
            <Avatar.Root class="size-8 rounded-lg">
              <Avatar.Fallback class="rounded-lg">{nameAbbr}</Avatar.Fallback>
            </Avatar.Root>
            <div class="grid flex-1 text-start text-sm leading-tight">
              <span class="truncate font-medium">{user.name}</span>
              <span class="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item onclick={openAccountDialog}>
            <UserCircleIcon />
            Account
          </DropdownMenu.Item>
          <DropdownMenu.Item class="relative" onclick={toggleMode}>
            <Sun class="absolute left-2  scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon class="absolute left-2  scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span class="pl-6">
              {mode.current === "light" ? "Light" : "Dark"}
            </span>
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onSelect={() => (window.location.href = `${base}/account/logout`)}>
          {#snippet child({ props })}
            <Button
              {...props}
              variant="ghost"
              href={clientResolver(resolve, "/account/logout")}
              class="w-full justify-start"
            >
              <LogoutIcon />
              Log out
            </Button>
          {/snippet}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>

<Dialog.Root bind:open={accountDialogOpen}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex flex-col  justify-between">
        <span>Account Settings</span>
      </Dialog.Title>
      <Dialog.Description class="flex flex-col gap-2">
        <span> Manage your profile information. </span>
        <div class="flex items-center justify-between">
          <span class="text-foreground rounded-sm font-medium">
            {user.email}
          </span>
          <span class="text-foreground rounded-sm font-medium uppercase">
            {user.role}
          </span>
        </div>
      </Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-6 py-4">
      <!-- Name Section -->

      <form
        class="flex flex-col gap-3"
        onsubmit={(e) => {
          e.preventDefault();
          saveName();
        }}
      >
        <Label for="account-name">Name</Label>
        <div class="flex gap-2">
          <Input id="account-name" bind:value={myName} placeholder="Your name" disabled={savingName} class="flex-1" />
          <Button type="submit" disabled={savingName || !myName.trim()}>
            {#if savingName}
              <LoaderIcon class="size-4 animate-spin" />
            {:else if nameSuccess}
              <CheckIcon class="size-4" />
            {:else}
              Save
            {/if}
          </Button>
        </div>
        {#if nameError}
          <p class="text-destructive text-sm">{nameError}</p>
        {/if}
      </form>

      <hr />

      <!-- Password Section -->
      <form
        class="flex flex-col gap-3"
        onsubmit={(e) => {
          e.preventDefault();
          updatePassword();
        }}
      >
        <Label for="new-password">Change Password</Label>
        <Input
          id="new-password"
          type="password"
          bind:value={myPassword}
          placeholder="New Password"
          disabled={resettingPass}
        />
        <Input
          id="confirm-password"
          type="password"
          bind:value={plainPassword}
          placeholder="Confirm Password"
          disabled={resettingPass}
        />

        <div class="text-muted-foreground text-xs">
          <p class="mb-1 font-medium">Password requirements:</p>
          <ul class="grid grid-cols-2 gap-1">
            <li class:text-green-500={hasDigit}>
              {#if hasDigit}<CheckIcon class="inline size-3" />{/if} One digit
            </li>
            <li class:text-green-500={hasLowercase}>
              {#if hasLowercase}<CheckIcon class="inline size-3" />{/if} One lowercase
            </li>
            <li class:text-green-500={hasUppercase}>
              {#if hasUppercase}<CheckIcon class="inline size-3" />{/if} One uppercase
            </li>
            <li class:text-green-500={hasMinLength}>
              {#if hasMinLength}<CheckIcon class="inline size-3" />{/if} 8+ characters
            </li>
            <li class:text-green-500={passwordsMatch}>
              {#if passwordsMatch}<CheckIcon class="inline size-3" />{/if} Passwords match
            </li>
          </ul>
        </div>

        <Button type="submit" disabled={resettingPass || !isPasswordValid}>
          {#if resettingPass}
            <LoaderIcon class="mr-2 size-4 animate-spin" />
            Updating...
          {:else if passwordSuccess}
            <CheckIcon class="mr-2 size-4" />
            Updated!
          {:else}
            Update Password
          {/if}
        </Button>
        {#if passwordError}
          <p class="text-destructive text-sm">{passwordError}</p>
        {/if}
      </form>
    </div>
  </Dialog.Content>
</Dialog.Root>
