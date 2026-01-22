<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Sheet from "$lib/components/ui/sheet/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import UsersIcon from "@lucide/svelte/icons/users";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
  import CheckCheckIcon from "@lucide/svelte/icons/check-check";
  import MailWarningIcon from "@lucide/svelte/icons/mail-warning";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import { toast } from "svelte-sonner";
  import { format } from "date-fns";

  // Types
  interface User {
    id: number;
    email: string;
    name: string;
    is_active: number;
    is_verified: number;
    role: string;
    created_at: string;
    updated_at: string;
  }

  interface NewUser {
    name: string;
    email: string;
    password: string;
    plainPassword: string;
    role: string;
  }

  interface EditUser extends User {
    password: string;
    passwordPlain: string;
    actions: {
      sendingVerificationEmail: boolean;
      updatingPassword: boolean;
      updatingRole: boolean;
      deactivatingUser: boolean;
      activatingUser: boolean;
    };
  }

  interface PageData {
    user: User;
    canSendEmail: boolean;
  }

  let { data }: { data: PageData } = $props();

  // Derived from data
  let currentUser = $derived(data.user);
  let canSendEmail = $derived(data.canSendEmail);

  // State
  let loading = $state(true);
  let users = $state<User[]>([]);
  let page = $state(1);
  let limit = $state(10);
  let total = $state(0);
  let totalPages = $state(0);

  // Add user modal state
  let showAddUserDialog = $state(false);
  let creatingUser = $state(false);
  let creatingUserError = $state("");
  let newUser = $state<NewUser>({
    name: "",
    email: "",
    password: "",
    plainPassword: "",
    role: "member"
  });

  // Edit user sheet state
  let showSettingsSheet = $state(false);
  let toEditUser = $state<EditUser | null>(null);
  let manualUpdateError = $state("");
  let manualSuccess = $state("");

  // Fetch users
  async function fetchUsers() {
    loading = true;
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getUsers",
          data: { page, limit }
        })
      });
      const result = await res.json();
      if (!result.error) {
        users = result.users || [];
        total = result.total || 0;
        totalPages = Math.ceil(total / limit);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      loading = false;
    }
  }

  // Create new user
  async function createNewUser() {
    if (newUser.password !== newUser.plainPassword) {
      creatingUserError = "Passwords do not match";
      return;
    }

    creatingUser = true;
    creatingUserError = "";

    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createNewUser",
          data: newUser
        })
      });
      const result = await res.json();

      if (result.error) {
        creatingUserError = result.error;
      } else {
        users = [...users, result];
        showAddUserDialog = false;
        resetNewUser();
        toast.success("User created successfully");

        // Send verification email
        if (canSendEmail) {
          await sendVerificationEmail(result.id);
        }
      }
    } catch (error) {
      creatingUserError = "Error while creating user";
    } finally {
      creatingUser = false;
    }
  }

  function resetNewUser() {
    newUser = {
      name: "",
      email: "",
      password: "",
      plainPassword: "",
      role: "member"
    };
  }

  // Open settings for a user
  function openSettingsSheet(user: User) {
    toEditUser = {
      ...JSON.parse(JSON.stringify(user)),
      password: "",
      passwordPlain: "",
      actions: {
        sendingVerificationEmail: false,
        updatingPassword: false,
        updatingRole: false,
        deactivatingUser: false,
        activatingUser: false
      }
    };
    manualUpdateError = "";
    manualSuccess = "";
    showSettingsSheet = true;
  }

  // Send verification email
  async function sendVerificationEmail(id: number) {
    try {
      await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendVerificationEmail",
          data: { toId: id }
        })
      });
      toast.success("Verification email sent");
    } catch (error) {
      toast.error("Failed to send verification email");
    }
  }

  // Manual update user data
  async function manualUpdateData(updateType: string) {
    if (!toEditUser) return;

    manualUpdateError = "";
    manualSuccess = "";

    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manualUpdate",
          data: { ...toEditUser, updateType }
        })
      });
      const result = await res.json();

      if (result.error) {
        manualUpdateError = result.error;
      } else {
        users = users.map((user) => (user.id === toEditUser!.id ? result : user));
        manualSuccess = `User ${updateType} updated successfully`;

        // Update toEditUser with the result
        toEditUser = {
          ...result,
          password: "",
          passwordPlain: "",
          actions: toEditUser.actions
        };
      }
    } catch (error) {
      manualUpdateError = "Error while updating user";
    }
  }

  // Pagination
  function goToPage(newPage: number) {
    page = newPage;
    fetchUsers();
  }

  // Format date
  function formatDate(dateStr: string): string {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy HH:mm");
    } catch {
      return dateStr;
    }
  }

  // Role badge variant
  function getRoleBadgeVariant(role: string): "default" | "secondary" | "outline" {
    switch (role) {
      case "admin":
        return "default";
      case "editor":
        return "secondary";
      default:
        return "outline";
    }
  }

  // Initial load
  $effect(() => {
    fetchUsers();
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <UsersIcon class="h-6 w-6" />
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Users</h1>
        <p class="text-muted-foreground text-sm">Manage users and their permissions</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      {#if loading}
        <Spinner class="size-5" />
      {/if}
      {#if currentUser.role === "admin"}
        <Button onclick={() => (showAddUserDialog = true)}>
          <PlusIcon class="mr-2 h-4 w-4" />
          Add User
        </Button>
      {/if}
    </div>
  </div>

  <!-- Users Table -->
  <div class="ktable rounded-xl border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Name</Table.Head>
          <Table.Head>Email</Table.Head>
          <Table.Head class="text-center">Verified</Table.Head>
          <Table.Head>Role</Table.Head>
          <Table.Head>Status</Table.Head>
          <Table.Head class="w-20 text-center">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if loading && users.length === 0}
          <Table.Row>
            <Table.Cell colspan={6} class="py-8 text-center">
              <div class="flex items-center justify-center gap-2">
                <Spinner class="size-4" />
                <span class="text-muted-foreground text-sm">Loading users...</span>
              </div>
            </Table.Cell>
          </Table.Row>
        {:else if users.length === 0}
          <Table.Row>
            <Table.Cell colspan={6} class="text-muted-foreground py-8 text-center">No users found.</Table.Cell>
          </Table.Row>
        {:else}
          {#each users as user}
            <Table.Row>
              <Table.Cell class="font-medium">{user.name}</Table.Cell>
              <Table.Cell>{user.email}</Table.Cell>
              <Table.Cell class="text-center">
                {#if user.is_verified}
                  <CheckCheckIcon class="mx-auto h-4 w-4 text-blue-500" />
                {:else}
                  <MailWarningIcon class="mx-auto h-4 w-4 text-yellow-500" />
                {/if}
              </Table.Cell>
              <Table.Cell>
                <Badge variant={getRoleBadgeVariant(user.role)} class="uppercase">
                  {user.role}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                {#if user.is_active}
                  <span class="text-sm font-semibold text-green-500">ACTIVE</span>
                {:else}
                  <span class="text-sm font-semibold text-pink-500">INACTIVE</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="text-center">
                {#if currentUser.role === "admin" && currentUser.id !== user.id}
                  <Button variant="ghost" size="icon" class="h-8 w-8" onclick={() => openSettingsSheet(user)}>
                    <SettingsIcon class="h-4 w-4" />
                  </Button>
                {/if}
                {#if currentUser.id === user.id}
                  <Button variant="ghost" size="icon" class="h-8 w-8" href="/manage/app/profile">
                    <ArrowRightIcon class="h-4 w-4" />
                  </Button>
                {/if}
              </Table.Cell>
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Pagination -->
  {#if total > 0}
    {@const startItem = (page - 1) * limit + 1}
    {@const endItem = Math.min(page * limit, total)}
    <div class="flex items-center justify-between">
      <span class="text-muted-foreground text-sm">Showing {startItem}-{endItem} of {total}</span>
      {#if totalPages > 1}
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={page === 1} onclick={() => goToPage(page - 1)}>
            <ChevronLeftIcon class="size-4" />
          </Button>
          <div class="flex items-center gap-1">
            {#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
              {#if pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)}
                <Button variant={pageNum === page ? "default" : "ghost"} size="sm" onclick={() => goToPage(pageNum)}>
                  {pageNum}
                </Button>
              {:else if pageNum === page - 2 || pageNum === page + 2}
                <span class="text-muted-foreground px-1">...</span>
              {/if}
            {/each}
          </div>
          <Button variant="outline" size="icon" disabled={page === totalPages} onclick={() => goToPage(page + 1)}>
            <ChevronRightIcon class="size-4" />
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Add User Dialog -->
<Dialog.Root bind:open={showAddUserDialog}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Add New User</Dialog.Title>
      <Dialog.Description>Add a new user to your project</Dialog.Description>
    </Dialog.Header>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        createNewUser();
      }}
    >
      <div class="space-y-4 py-4">
        <div class="space-y-2">
          <Label for="name">Name</Label>
          <Input id="name" type="text" placeholder="John Doe" bind:value={newUser.name} required />
        </div>
        <div class="space-y-2">
          <Label for="email">Email</Label>
          <Input id="email" type="email" placeholder="email@example.com" bind:value={newUser.email} required />
        </div>
        <div class="space-y-2">
          <Label for="password">Password</Label>
          <Input id="password" type="password" placeholder="********" bind:value={newUser.password} required />
          <p class="text-muted-foreground text-xs">
            Set a dummy password. Ask the user to reset the password once they log in.
          </p>
        </div>
        <div class="space-y-2">
          <Label for="plainPassword">Confirm Password</Label>
          <Input
            id="plainPassword"
            type="password"
            placeholder="********"
            bind:value={newUser.plainPassword}
            required
          />
          {#if newUser.plainPassword && newUser.password !== newUser.plainPassword}
            <p class="text-destructive text-xs font-medium">Passwords do not match</p>
          {/if}
        </div>
        <div class="space-y-2">
          <Label for="role">Role</Label>
          <Select.Root type="single" value={newUser.role} onValueChange={(v) => v && (newUser.role = v)}>
            <Select.Trigger class="w-full">
              {newUser.role.toUpperCase()}
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="editor">EDITOR</Select.Item>
              <Select.Item value="member">MEMBER</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
        {#if creatingUserError}
          <p class="text-destructive text-sm font-medium">{creatingUserError}</p>
        {/if}
      </div>
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (showAddUserDialog = false)}>Cancel</Button>
        <Button type="submit" disabled={creatingUser}>
          {#if creatingUser}
            <Spinner class="mr-2 size-4" />
          {/if}
          Add User
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<!-- Edit User Sheet -->
<Sheet.Root bind:open={showSettingsSheet}>
  <Sheet.Content side="right" class="w-full overflow-y-auto sm:max-w-xl">
    <Sheet.Header>
      <Sheet.Title>Settings - {toEditUser?.name}</Sheet.Title>
      <Sheet.Description>Manage user settings and permissions</Sheet.Description>
    </Sheet.Header>

    {#if toEditUser}
      <div class="space-y-6 py-6">
        <!-- User Info -->
        <div class="space-y-2 text-sm">
          <p>
            <strong>Created At:</strong>
            {formatDate(toEditUser.created_at)}
          </p>
          <p>
            <strong>Updated At:</strong>
            {formatDate(toEditUser.updated_at)}
          </p>
          <p>
            <strong>Name:</strong>
            {toEditUser.name}
          </p>
        </div>

        <!-- Send Verification Email -->
        {#if !toEditUser.is_verified && canSendEmail}
          <Card.Root>
            <Card.Content class="p-4">
              <p class="mb-3 text-sm">
                The email is not verified. Send a verification email to the user at {toEditUser.email}.
              </p>
              <Button
                variant="secondary"
                disabled={toEditUser.actions.sendingVerificationEmail}
                onclick={async () => {
                  toEditUser!.actions.sendingVerificationEmail = true;
                  manualSuccess = "";
                  await sendVerificationEmail(toEditUser!.id);
                  toEditUser!.actions.sendingVerificationEmail = false;
                  manualSuccess = "Verification email sent successfully";
                }}
              >
                {#if toEditUser.actions.sendingVerificationEmail}
                  <Spinner class="mr-2 size-4" />
                {/if}
                Send Verification Email
              </Button>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Update Password -->
        <Card.Root>
          <Card.Content class="p-4">
            <p class="mb-3 text-sm">Update password for the user</p>
            <form
              class="space-y-3"
              onsubmit={(e) => {
                e.preventDefault();
                toEditUser!.actions.updatingPassword = true;
                manualUpdateData("password").then(() => {
                  toEditUser!.actions.updatingPassword = false;
                });
              }}
            >
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-2">
                  <Label for="password2">Password</Label>
                  <Input
                    id="password2"
                    type="password"
                    placeholder="********"
                    bind:value={toEditUser.password}
                    disabled={toEditUser.actions.updatingPassword}
                    required
                  />
                </div>
                <div class="space-y-2">
                  <Label for="passwordPlain2">Confirm Password</Label>
                  <Input
                    id="passwordPlain2"
                    type="text"
                    placeholder="********"
                    bind:value={toEditUser.passwordPlain}
                    disabled={toEditUser.actions.updatingPassword}
                    required
                  />
                </div>
              </div>
              <Button type="submit" variant="secondary" disabled={toEditUser.actions.updatingPassword}>
                {#if toEditUser.actions.updatingPassword}
                  <Spinner class="mr-2 size-4" />
                {/if}
                Update Password
              </Button>
            </form>
          </Card.Content>
        </Card.Root>

        <!-- Update Role -->
        <Card.Root>
          <Card.Content class="p-4">
            <p class="mb-3 text-sm">
              Change the role of the user. The user will have different permissions based on the role.
            </p>
            <div class="flex items-center gap-3">
              <Select.Root
                type="single"
                value={toEditUser.role}
                onValueChange={(v) => v && (toEditUser!.role = v)}
                disabled={toEditUser.actions.updatingRole}
              >
                <Select.Trigger class="w-48">
                  {toEditUser.role.toUpperCase()}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="editor">EDITOR</Select.Item>
                  <Select.Item value="member">MEMBER</Select.Item>
                </Select.Content>
              </Select.Root>
              <Button
                variant="secondary"
                disabled={toEditUser.actions.updatingRole}
                onclick={() => {
                  toEditUser!.actions.updatingRole = true;
                  manualUpdateData("role").then(() => {
                    toEditUser!.actions.updatingRole = false;
                  });
                }}
              >
                {#if toEditUser.actions.updatingRole}
                  <Spinner class="mr-2 size-4" />
                {/if}
                Update Role
              </Button>
            </div>
          </Card.Content>
        </Card.Root>

        <!-- Activate/Deactivate User -->
        {#if toEditUser.is_active}
          <Card.Root class="border-destructive">
            <Card.Content class="p-4">
              <p class="mb-3 text-sm">
                Deactivate User. The user will not be able to login. Existing session will get invalidated.
              </p>
              <Button
                variant="destructive"
                disabled={toEditUser.actions.deactivatingUser}
                onclick={() => {
                  toEditUser!.actions.deactivatingUser = true;
                  toEditUser!.is_active = 0;
                  manualUpdateData("is_active").then(() => {
                    toEditUser!.actions.deactivatingUser = false;
                  });
                }}
              >
                {#if toEditUser.actions.deactivatingUser}
                  <Spinner class="mr-2 size-4" />
                {/if}
                Deactivate User
              </Button>
            </Card.Content>
          </Card.Root>
        {:else}
          <Card.Root>
            <Card.Content class="p-4">
              <p class="mb-3 text-sm">Activate User. The user will be able to login.</p>
              <Button
                variant="secondary"
                disabled={toEditUser.actions.activatingUser}
                onclick={() => {
                  toEditUser!.actions.activatingUser = true;
                  toEditUser!.is_active = 1;
                  manualUpdateData("is_active").then(() => {
                    toEditUser!.actions.activatingUser = false;
                  });
                }}
              >
                {#if toEditUser.actions.activatingUser}
                  <Spinner class="mr-2 size-4" />
                {/if}
                Activate User
              </Button>
            </Card.Content>
          </Card.Root>
        {/if}

        <!-- Status Messages -->
        {#if manualUpdateError}
          <Alert.Root variant="destructive">
            <Alert.Description>{manualUpdateError}</Alert.Description>
          </Alert.Root>
        {/if}
        {#if manualSuccess}
          <Alert.Root class="border-green-500 text-green-500">
            <Alert.Description>{manualSuccess}</Alert.Description>
          </Alert.Root>
        {/if}
      </div>
    {/if}
  </Sheet.Content>
</Sheet.Root>
