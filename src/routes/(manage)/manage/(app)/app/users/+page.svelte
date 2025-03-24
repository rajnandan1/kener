<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import Loader from "lucide-svelte/icons/loader";
  import Info from "lucide-svelte/icons/info";
  import X from "lucide-svelte/icons/x";
  import CheckCheck from "lucide-svelte/icons/check-check";
  import MailWarning from "lucide-svelte/icons/mail-warning";
  import Settings from "lucide-svelte/icons/settings";
  import ArrowRight from "lucide-svelte/icons/arrow-right";
  import ChevronRight from "lucide-svelte/icons/chevron-right";
  import { base } from "$app/paths";
  import * as Alert from "$lib/components/ui/alert";
  import * as Select from "$lib/components/ui/select";
  import { clickOutsideAction, slide } from "svelte-legos";
  import { createEventDispatcher } from "svelte";
  import { onMount } from "svelte";
  import moment from "moment";

  let loadingData = false;
  export let data;
  let currentUser = data.user;
  let page = data.page;
  let limit = data.limit;
  let total = data.total;
  let users = data.users;
  let canSendEmail = data.canSendEmail;
  let isMounted = false;

  onMount(() => {
    isMounted = true;
  });

  let showAddNewUserModal = false;
  function openAddNewUserModal() {
    showAddNewUserModal = true;
  }

  let newUser = {
    name: "",
    email: "",
    password: "",
    role: "member",
    plainPassword: ""
  };

  let creatingUser = false;
  let creatingUserError = "";
  function callCreateNewUser() {
    creatingUser = true;
    creatingUserError = "";
    fetch(base + "/manage/app/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "createNewUser",
        data: newUser
      })
    })
      .then((resp) => resp.json())
      .then((resp) => {
        if (resp.error) {
          creatingUserError = resp.error;
        } else {
          users = [...users, resp];
          showAddNewUserModal = false;

          let createUser = resp;
          sendVerificationEmail(createUser.id);
        }
      })
      .catch((error) => {
        creatingUserError = "Error while creating user";
      })
      .finally(() => {
        creatingUser = false;
      });
  }
  let toEditUser = {};
  let showSettingsModalControl = false;
  let manualUpdateError = "";
  let manualSuccess = "";
  function openSettingsModal(user) {
    toEditUser = JSON.parse(JSON.stringify(user));
    toEditUser.password = "";
    toEditUser.passwordPlain = "";
    toEditUser.actions = {
      sendingVerificationEmail: false,
      updatingPassword: false,
      updatingRole: false,
      deactivatingUser: false,
      activatingUser: false
    };
    showSettingsModalControl = true;
  }

  $: {
    //broadcast a custom event named blockScroll
    if (!!isMounted) {
      window.dispatchEvent(
        new CustomEvent("noScroll", {
          detail: showSettingsModalControl
        })
      );
    }
    //if modal closed then clear url hashed
  }

  async function sendVerificationEmail(id) {
    return await fetch(base + "/manage/app/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "sendVerificationEmail",
        data: {
          toId: id
        }
      })
    });
  }

  async function manualUpdateData(updateType) {
    manualUpdateError = "";
    manualSuccess = "";
    try {
      let resp = await fetch(base + "/manage/app/api/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "manualUpdate",
          data: { ...toEditUser, ...{ updateType: updateType } }
        })
      });
      let data = await resp.json();
      if (data.error) {
        manualUpdateError = data.error;
      } else {
        users = users.map((user) => {
          if (user.id === toEditUser.id) {
            return data;
          }
          return user;
        });
        manualSuccess = `User ${updateType} updated successfully`;
      }
    } catch (error) {
      manualUpdateError = "Error while updating user";
    }
  }
</script>

{#if showSettingsModalControl}
  <div class="fixed left-0 top-0 z-50 h-screen w-screen bg-card bg-opacity-20 backdrop-blur-sm">
    <div
      transition:slide={{ direction: "right", duration: 200 }}
      use:clickOutsideAction
      on:clickoutside={(e) => {
        showSettingsModalControl = false;
      }}
      class="absolute right-0 top-0 h-screen w-[800px] bg-background px-3 shadow-xl"
    >
      <Button
        variant="outline"
        size="icon"
        class="absolute right-[785px] top-8  z-10 h-8 w-8 rounded-md"
        on:click={(e) => {
          showSettingsModalControl = false;
        }}
      >
        <ChevronRight class="h-6 w-6 " />
      </Button>
      <div class="absolute top-0 flex h-12 w-full justify-between gap-2 border-b p-3 pr-6">
        <h2 class="text-lg font-semibold">
          Settings - {toEditUser.name}
        </h2>
      </div>
      <div class="mt-12 w-full overflow-y-auto p-3" style="height: calc(100vh - 7rem);">
        <div class="flex flex-col gap-y-4">
          <p>
            <strong>User Created At:</strong>
            {moment.utc(toEditUser.created_at, "YYYY-MM-DD HH:mm:ss").local().format("dddd, MMMM Do YYYY, h:mm:ss a")}
          </p>
          <p>
            <strong>User Updated At:</strong>
            {moment.utc(toEditUser.updated_at, "YYYY-MM-DD HH:mm:ss").local().format("dddd, MMMM Do YYYY, h:mm:ss a")}
          </p>
          <p>
            <strong>Name:</strong>
            {toEditUser.name}
          </p>
          {#if !toEditUser.is_verified && canSendEmail}
            <div class="flex flex-col gap-y-2 rounded-md border p-4">
              <p>The email is not verified. Send a verification email to the user at {toEditUser.email}.</p>
              <Button
                class="w-56"
                variant="secondary"
                disabled={toEditUser.actions.sendingVerificationEmail}
                on:click={(e) => {
                  toEditUser.actions.sendingVerificationEmail = true;
                  manualSuccess = "";
                  sendVerificationEmail(toEditUser.id).then(() => {
                    toEditUser.actions.sendingVerificationEmail = false;
                    manualSuccess = "Verification email sent successfully";
                  });
                }}
              >
                Send Verification Email
                {#if toEditUser.actions.sendingVerificationEmail}
                  <Loader class="ml-2 h-4 w-4 animate-spin" />
                {/if}
              </Button>
            </div>
          {/if}
          <form
            class="flex flex-col gap-y-2 rounded-md border p-4"
            on:submit|preventDefault={(e) => {
              toEditUser.actions.updatingPassword = true;
              manualUpdateData("password").then(() => {
                toEditUser.actions.updatingPassword = false;
              });
            }}
          >
            <p>Update password for the user</p>
            <div class="flex flex-row gap-x-2">
              <div>
                <div class="flex flex-col gap-y-2">
                  <Label for="password2">Password</Label>
                  <Input
                    type="password"
                    disabled={toEditUser.actions.updatingPassword}
                    name="password2"
                    id="password2"
                    bind:value={toEditUser.password}
                    placeholder="********"
                    required
                  />
                </div>
              </div>
              <div>
                <div class="flex flex-col gap-y-2">
                  <Label for="passwordPlain2">Confirm Password</Label>
                  <Input
                    type="text"
                    name="passwordPlain2"
                    disabled={toEditUser.actions.updatingPassword}
                    id="passwordPlain2"
                    bind:value={toEditUser.passwordPlain}
                    placeholder="********"
                    required
                  />
                </div>
              </div>
              <div>
                <Button
                  class="mt-5 w-48"
                  type="submit"
                  variant="secondary"
                  disabled={toEditUser.actions.updatingPassword}
                >
                  Update Password
                  {#if toEditUser.actions.updatingPassword}
                    <Loader class="ml-2 h-4 w-4 animate-spin" />
                  {/if}
                </Button>
              </div>
            </div>
          </form>
          <div class="flex flex-col gap-y-2 rounded-md border p-4">
            <p class="">Change the role of the user. The user will have different permissions based on the role.</p>
            <div class="flex flex-row gap-x-2">
              <div>
                <Select.Root
                  portal={null}
                  disabled={toEditUser.actions.updatingRole}
                  onSelectedChange={(e) => {
                    toEditUser.role = e.value;
                  }}
                  selected={{
                    value: toEditUser.role,
                    label: toEditUser.role.toUpperCase()
                  }}
                >
                  <Select.Trigger id="role2" class="w-48">
                    <Select.Value placeholder="Role" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Group>
                      <Select.Label>Select Role</Select.Label>
                      <Select.Item value="editor" class="text-sm font-medium uppercase">editor</Select.Item>
                      <Select.Item value="member" class="text-sm font-medium uppercase">member</Select.Item>
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>
              <div>
                <Button
                  class="w-48"
                  variant="secondary"
                  disabled={toEditUser.actions.updatingRole}
                  on:click={(e) => {
                    toEditUser.actions.updatingRole = true;
                    manualUpdateData("role").then(() => {
                      toEditUser.actions.updatingRole = false;
                    });
                  }}
                >
                  Update Role
                  {#if toEditUser.actions.updatingRole}
                    <Loader class="ml-2 h-4 w-4 animate-spin" />
                  {/if}
                </Button>
              </div>
            </div>
          </div>
          {#if !!toEditUser.is_active}
            <div class="flex flex-col gap-y-2 rounded-md border border-destructive p-4">
              <p class="">
                Deactivate User. The user will not be able to login. Existing session will get invalidated.
              </p>
              <Button
                variant="destructive"
                class="w-48"
                disabled={toEditUser.actions.deactivatingUser}
                on:click={(e) => {
                  toEditUser.actions.deactivatingUser = true;
                  toEditUser.is_active = 0;
                  manualUpdateData("is_active").then(() => {
                    toEditUser.actions.deactivatingUser = false;
                  });
                }}
              >
                Deactivate User
                {#if toEditUser.actions.deactivatingUser}
                  <Loader class="ml-2 h-4 w-4 animate-spin" />
                {/if}
              </Button>
            </div>
          {:else}
            <div class="flex flex-col gap-y-2 rounded-md border p-4">
              <p class="">Activate User. The user will be able to login.</p>
              <Button
                class="w-48"
                variant="secondary"
                disabled={toEditUser.actions.activatingUser}
                on:click={(e) => {
                  toEditUser.actions.activatingUser = true;
                  toEditUser.is_active = 1;
                  manualUpdateData("is_active").then(() => {
                    toEditUser.actions.activatingUser = false;
                  });
                }}
              >
                Activate User
                {#if toEditUser.actions.activatingUser}
                  <Loader class="ml-2 h-4 w-4 animate-spin" />
                {/if}
              </Button>
            </div>
          {/if}
          {#if !!manualUpdateError}
            <p class="rounded-md border border-destructive p-2 text-sm font-medium text-destructive">
              {manualUpdateError}
            </p>
          {/if}
          {#if !!manualSuccess}
            <p class="rounded-md border border-green-500 p-2 text-sm font-medium text-green-500">{manualSuccess}</p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

{#if showAddNewUserModal}
  <div class="moldal-container fixed left-0 top-0 z-50 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm">
    <div
      class="absolute left-1/2 top-1/2 h-fit w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg"
    >
      <Button
        variant="ghost"
        on:click={() => {
          showAddNewUserModal = false;
        }}
        class="absolute right-2 top-2 z-40 h-6 w-6   rounded-full border bg-background p-1"
      >
        <X class="h-4 w-4   text-muted-foreground" />
      </Button>
      <div class="content px-4 py-4">
        <h2 class="text-lg font-semibold">Add New User</h2>
        <p class="text-xs text-muted-foreground">Add a new user to your project</p>
        <div class="mt-4 flex flex-col">
          <form on:submit|preventDefault={callCreateNewUser}>
            <div class="flex flex-col gap-y-4">
              <div class="flex flex-col gap-y-2">
                <Label for="name">Name</Label>
                <Input type="text" name="name" id="name" bind:value={newUser.name} placeholder="John Doe" required />
              </div>
              <div class="flex flex-col gap-y-2">
                <Label for="email">Email</Label>
                <Input
                  type="email"
                  name="email"
                  id="email"
                  bind:value={newUser.email}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div class="flex flex-col gap-y-2">
                <Label for="password">Password</Label>
                <Input
                  type="password"
                  name="password"
                  id="password"
                  bind:value={newUser.password}
                  placeholder="********"
                  required
                />
                <p class="text-xs font-medium text-muted-foreground">
                  Set a dummy password. Ask the user to reset the password once they log in.
                </p>
              </div>
              <div class="flex flex-col gap-y-2">
                <Label for="plainPassword">Confirm Password</Label>
                <Input
                  type="text"
                  name="plainPassword"
                  id="plainPassword"
                  bind:value={newUser.plainPassword}
                  placeholder="********"
                  required
                />
                {#if !!newUser.plainPassword && newUser.password !== newUser.plainPassword}
                  <p class="text-xs font-medium text-destructive">Passwords do not match</p>
                {/if}
              </div>
              <div class="flex flex-col gap-y-2">
                <Label for="role">Role</Label>
                <Select.Root
                  portal={null}
                  onSelectedChange={(e) => {
                    newUser.role = e.value;
                  }}
                  selected={{
                    value: newUser.role,
                    label: newUser.role.toUpperCase()
                  }}
                >
                  <Select.Trigger id="role">
                    <Select.Value placeholder="Role" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Group>
                      <Select.Label>Select Role</Select.Label>
                      <Select.Item value="editor" class="text-sm font-medium uppercase">editor</Select.Item>
                      <Select.Item value="member" class="text-sm font-medium uppercase">member</Select.Item>
                    </Select.Group>
                  </Select.Content>
                </Select.Root>
              </div>
              {#if !!creatingUserError}
                <p class="text-xs font-medium text-destructive">{creatingUserError}</p>
              {/if}
              <div class="flex flex-col gap-y-2">
                <Button type="submit" variant="primary" disabled={creatingUser}>
                  <span>Add User</span>
                  {#if creatingUser}
                    <Loader class="ml-2 h-4 w-4 animate-spin" />
                  {/if}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
{/if}

<div class="min-h-[70vh]">
  <div class="mt-8">
    <div class="mb-4 flex justify-between">
      <div>
        {#if loadingData}
          <Loader class="mt-6 h-4 w-4 animate-spin" />
        {/if}
      </div>
      {#if !!currentUser.role && currentUser.role !== "member"}
        <div>
          <Button on:click={openAddNewUserModal}>
            <span>Add New User</span>
          </Button>
        </div>
      {/if}

      <!-- End Pagination -->
    </div>
    <div class="flex flex-col">
      <div class="-m-1.5 overflow-x-auto">
        <div class="inline-block min-w-full p-1.5 align-middle">
          <div class="overflow-hidden rounded-lg border dark:border-neutral-700">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead>
                <tr>
                  <th
                    scope="col"
                    class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                    >Name</th
                  >
                  <th
                    scope="col"
                    class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                    >Email</th
                  >
                  <th
                    scope="col"
                    class="px-6 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                    >Verified</th
                  >
                  <th
                    scope="col"
                    class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                    >Role</th
                  >

                  <th
                    scope="col"
                    class="px-6 py-3 text-start text-xs font-medium uppercase text-gray-500 dark:text-neutral-500"
                    >Status</th
                  >
                  <th scope="col" class="flex w-[130px] gap-x-2 px-1 py-3 text-start text-xs font-medium uppercase">
                    <Select.Root
                      portal={null}
                      class="w-full"
                      onSelectedChange={(e) => {
                        page = e.value;
                        window.location.href = `${base}/manage/app/users?page=${page}&limit=${limit}`;
                      }}
                      selected={{
                        value: page,
                        label: "Page " + page
                      }}
                    >
                      <Select.Trigger id="page" class="h-6 w-full px-2 py-1">
                        <Select.Value placeholder="Page" class="text-xs" />
                      </Select.Trigger>
                      <Select.Content class="text-xs">
                        <Select.Group>
                          <Select.Label class="text-xs">Pages</Select.Label>
                          {#each Array.from({ length: total }, (_, i) => i + 1) as page}
                            <Select.Item value={page} class="text-xs font-medium uppercase">Page {page}</Select.Item>
                          {/each}
                        </Select.Group>
                      </Select.Content>
                    </Select.Root>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-neutral-700">
                {#each users as user}
                  <tr>
                    <td class="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      {user.name}
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      {user.email}
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 text-center text-sm">
                      {#if !!user.is_verified}
                        <CheckCheck class="mx-auto h-4 w-4 text-blue-500" />
                      {:else}
                        <MailWarning class="mx-auto h-4 w-4 text-yellow-500" />
                      {/if}
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase">
                      {#if user.role === "editor"}
                        <span
                          class="me-2 rounded-sm bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                        >
                          {user.role}
                        </span>
                      {:else if user.role === "member"}
                        <span
                          class="me-2 rounded-sm bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                        >
                          {user.role}
                        </span>
                      {:else if user.role === "admin"}
                        <span
                          class="me-2 rounded-sm bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-800 dark:bg-pink-900 dark:text-pink-300"
                        >
                          {user.role}
                        </span>
                      {/if}
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 text-xs">
                      {#if !!user.is_active}
                        <span class="h-4 w-4 font-semibold text-green-500">ACTIVE</span>
                      {:else}
                        <span class="h-4 w-4 font-semibold text-pink-500">INACTIVE</span>
                      {/if}
                    </td>
                    <td class="whitespace-nowrap text-center text-xs font-semibold">
                      {#if !!currentUser.role && currentUser.role === "admin" && currentUser.id !== user.id}
                        <Button size="icon" class="h-6 w-6" variant="ghost" on:click={() => openSettingsModal(user)}>
                          <Settings class="h-4 w-4 " />
                        </Button>
                      {/if}
                      {#if currentUser.id === user.id}
                        <Button size="icon" class="h-6 w-6" variant="ghost" href={`${base}/manage/app/profile`}>
                          <ArrowRight class="h-4 w-4 " />
                        </Button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
