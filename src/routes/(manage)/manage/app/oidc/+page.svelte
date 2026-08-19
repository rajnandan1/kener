<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Switch } from "$lib/components/ui/switch";
  import { Spinner } from "$lib/components/ui/spinner";
  import { Badge } from "$lib/components/ui/badge";
  import { Separator } from "$lib/components/ui/separator";
  import * as Card from "$lib/components/ui/card";
  import * as Table from "$lib/components/ui/table";
  import * as Select from "$lib/components/ui/select";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import SaveIcon from "@lucide/svelte/icons/save";
  import PlayIcon from "@lucide/svelte/icons/play";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
  import XCircleIcon from "@lucide/svelte/icons/x-circle";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import EyeOffIcon from "@lucide/svelte/icons/eye-off";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import type {
    OidcGroupRoleMappingEntry,
    OidcGroupRoleMappingInvalidEntry,
    OidcGroupRoleMappingsView,
    OidcSettings,
    OidcSettingsMasked
  } from "$lib/types/site";

  // ============ Types ============

  interface RoleRecord {
    id: string;
    role_name: string;
    readonly: number;
    status: string;
  }

  // ============ State ============

  let loading = $state(true);
  let saving = $state(false);
  let testing = $state(false);
  let showSecret = $state(false);

  let settings = $state<OidcSettings>({
    enabled: false,
    provider_name: "",
    issuer_url: "",
    client_id: "",
    client_secret: "",
    scopes: "openid profile email",
    groups_claim: "groups",
    allow_local_login: true,
    auto_create_users: false,
    default_role_id: "member"
  });

  let envLocked = $state<string[]>([]);
  let hasClientSecret = $state(false);
  let redirectUri = $state("");
  const isLocked = (field: keyof OidcSettings) => envLocked.includes(field);

  let testResult = $state<{
    success: boolean;
    issuer?: string;
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    userinfoEndpoint?: string;
    error?: string;
  } | null>(null);

  /** Select value standing in for default_role_id = "" (bits-ui treats "" as "nothing selected"). */
  const NO_DEFAULT_ROLE = "__none__";

  // Group-Role Mappings
  const MAPPINGS_ENV = "KENER_OIDC_GROUP_ROLE_MAP";
  let mappings = $state<OidcGroupRoleMappingEntry[]>([]);
  let mappingsSource = $state<"env" | "db">("db");
  let invalidMappings = $state<OidcGroupRoleMappingInvalidEntry[]>([]);
  let mappingsEnvError = $state("");
  const mappingsLocked = $derived(mappingsSource === "env");
  let loadingMappings = $state(true);
  let newMappingGroup = $state("");
  let newMappingRoleId = $state("");
  let addingMapping = $state(false);
  let deleteDialogOpen = $state(false);
  let mappingToDelete = $state<OidcGroupRoleMappingEntry | null>(null);
  let deletingMapping = $state(false);

  // Available roles
  let roles = $state<RoleRecord[]>([]);

  // ============ API Helpers ============

  async function apiCall(action: string, data: Record<string, unknown> = {}): Promise<unknown> {
    const response = await fetch(clientResolver(resolve, "/manage/api"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as Record<string, string>).error || `Request failed with status ${response.status}`);
    }
    return await response.json();
  }

  // ============ Settings ============

  async function loadSettings(options: { silent?: boolean } = {}) {
    if (!options.silent) loading = true;
    try {
      const result = (await apiCall("getOidcSettingsMasked")) as
        | (OidcSettingsMasked & { env_locked: string[]; redirect_uri: string })
        | { error: string };
      if (result && !("error" in result)) {
        const { env_locked, redirect_uri, has_client_secret, client_secret: _masked, ...rest } = result;
        settings = { ...settings, ...rest, client_secret: "" }; // the input starts empty; the secret never comes to the browser
        envLocked = env_locked ?? [];
        hasClientSecret = !!has_client_secret;
        redirectUri = redirect_uri ?? "";
      }
    } catch {
      toast.error("Failed to load OIDC settings");
    } finally {
      if (!options.silent) loading = false;
    }
  }

  /** Form values minus env-locked fields; the secret is only sent when the admin typed one. */
  function settingsPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = { ...settings };
    if (!settings.client_secret) delete payload.client_secret;
    for (const field of envLocked) delete payload[field];
    return payload;
  }

  async function saveSettings() {
    saving = true;
    try {
      const result = (await apiCall("storeSiteData", { oidcSettings: settingsPayload() })) as { error?: string };
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("OIDC settings saved");
        await loadSettings({ silent: true });
      }
    } catch {
      toast.error("Failed to save OIDC settings");
    } finally {
      saving = false;
    }
  }

  async function testConnection() {
    testing = true;
    testResult = null;
    try {
      const result = (await apiCall("testOidcConnection", { settings: settingsPayload() })) as {
        success: boolean;
        issuer?: string;
        authorizationEndpoint?: string;
        tokenEndpoint?: string;
        userinfoEndpoint?: string;
        error?: string;
      };
      testResult = result;
      if (result.success) {
        toast.success("Connection successful");
      } else {
        toast.error(result.error || "Connection failed");
      }
    } catch {
      toast.error("Connection test failed");
      testResult = { success: false, error: "Network error" };
    } finally {
      testing = false;
    }
  }

  async function copyRedirectUri() {
    try {
      await navigator.clipboard.writeText(redirectUri);
      toast.success("Redirect URI copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  // ============ Group-Role Mappings ============

  async function loadMappings() {
    loadingMappings = true;
    try {
      const result = (await apiCall("getOidcGroupRoleMappings")) as OidcGroupRoleMappingsView | { error: string };
      if (result && typeof result === "object" && "mappings" in result) {
        mappings = result.mappings;
        mappingsSource = result.source;
        invalidMappings = result.invalid;
        mappingsEnvError = result.error ?? "";
      } else {
        toast.error(result?.error || "Failed to load group mappings");
      }
    } catch {
      toast.error("Failed to load group mappings");
    } finally {
      loadingMappings = false;
    }
  }

  async function loadRoles() {
    try {
      const result = (await apiCall("getRoles")) as RoleRecord[] | { error: string };
      if (Array.isArray(result)) {
        roles = result.filter((r) => r.status === "ACTIVE");
      }
    } catch {
      // Roles list is non-critical
    }
  }

  async function addMapping() {
    if (!newMappingGroup.trim()) {
      toast.error("Please enter an OIDC group name");
      return;
    }
    if (!newMappingRoleId) {
      toast.error("Please select a Kener role");
      return;
    }

    addingMapping = true;
    try {
      const result = (await apiCall("upsertOidcGroupRoleMapping", {
        oidc_group: newMappingGroup.trim(),
        role_id: newMappingRoleId
      })) as { error?: string };
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Mapping added: "${newMappingGroup}" → "${getRoleName(newMappingRoleId)}"`);
        newMappingGroup = "";
        newMappingRoleId = "";
        await loadMappings();
      }
    } catch {
      toast.error("Failed to add mapping");
    } finally {
      addingMapping = false;
    }
  }

  function openDeleteMappingDialog(mapping: OidcGroupRoleMappingEntry) {
    mappingToDelete = mapping;
    deleteDialogOpen = true;
  }

  async function deleteMapping() {
    if (!mappingToDelete || mappingToDelete.id === undefined) return;
    deletingMapping = true;
    try {
      const result = (await apiCall("deleteOidcGroupRoleMapping", {
        id: mappingToDelete.id
      })) as { error?: string };
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Mapping deleted");
        await loadMappings();
      }
    } catch {
      toast.error("Failed to delete mapping");
    } finally {
      deletingMapping = false;
      deleteDialogOpen = false;
      mappingToDelete = null;
    }
  }

  // ============ Helpers ============

  function getRoleName(roleId: string): string {
    const role = roles.find((r) => r.id === roleId);
    return role?.role_name || roleId;
  }

  // ============ Lifecycle ============

  onMount(async () => {
    await Promise.all([loadSettings(), loadMappings(), loadRoles()]);
  });
</script>

<div class="flex w-full flex-col gap-6 p-4">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="h-6 w-6" />
    </div>
  {:else}
    <!-- ============ OIDC Settings Card ============ -->
    <Card.Root>
      <Card.Header>
        <Card.Title>OpenID Connect Settings</Card.Title>
        <Card.Description>
          Configure an OIDC provider (e.g. Keycloak, Azure AD, Authentik) to allow single sign-on for your users. Fields
          marked "Set by environment" come from KENER_OIDC_* variables and cannot be edited here.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-6">
          <!-- Enable/Disable -->
          <div class="flex items-center justify-between">
            <div>
              <Label for="oidc_enabled">Enable OpenID Connect</Label>
              {#if isLocked("enabled")}<Badge variant="secondary">Set by environment</Badge>{/if}
              <p class="text-muted-foreground text-sm">Allow users to sign in using an external identity provider.</p>
            </div>
            <Switch id="oidc_enabled" bind:checked={settings.enabled} disabled={isLocked("enabled")} />
          </div>

          <Separator />

          {#if settings.enabled}
            <!-- Provider Name -->
            <div class="grid gap-2">
              <Label for="provider_name">Provider Name</Label>
              {#if isLocked("provider_name")}<Badge variant="secondary">Set by environment</Badge>{/if}
              <Input
                id="provider_name"
                bind:value={settings.provider_name}
                placeholder="e.g. Keycloak, Azure AD, Authentik"
                disabled={isLocked("provider_name")}
              />
              <p class="text-muted-foreground text-xs">
                Displayed on the login button: "Sign in with {settings.provider_name || "..."}"
              </p>
            </div>

            <!-- Issuer URL -->
            <div class="grid gap-2">
              <Label for="issuer_url">Issuer URL</Label>
              {#if isLocked("issuer_url")}<Badge variant="secondary">Set by environment</Badge>{/if}
              <Input
                id="issuer_url"
                bind:value={settings.issuer_url}
                placeholder="https://keycloak.example.com/realms/myrealm"
                disabled={isLocked("issuer_url")}
              />
              <p class="text-muted-foreground text-xs">
                The base URL of the OIDC provider. Must support
                <code>.well-known/openid-configuration</code> discovery.
              </p>
            </div>

            <!-- Redirect URI -->
            <div class="grid gap-2">
              <Label>Redirect URI</Label>
              <div class="flex items-center gap-2">
                <code class="bg-muted flex-1 truncate rounded px-2 py-1 text-xs">{redirectUri}</code>
                <Button variant="outline" size="icon-sm" title="Copy redirect URI" onclick={copyRedirectUri}>
                  <CopyIcon class="h-4 w-4" />
                </Button>
              </div>
              <p class="text-muted-foreground text-xs">
                Register this exact URL as the redirect / callback URI of the client at your identity provider.
              </p>
            </div>

            <!-- Client ID -->
            <div class="grid gap-2">
              <Label for="client_id">Client ID</Label>
              {#if isLocked("client_id")}<Badge variant="secondary">Set by environment</Badge>{/if}
              <Input
                id="client_id"
                bind:value={settings.client_id}
                placeholder="kener-client"
                disabled={isLocked("client_id")}
              />
            </div>

            <!-- Client Secret -->
            <div class="grid gap-2">
              <Label for="client_secret">Client Secret</Label>
              {#if isLocked("client_secret")}<Badge variant="secondary">Set by environment</Badge>{/if}
              <div class="relative">
                <Input
                  id="client_secret"
                  type={showSecret ? "text" : "password"}
                  bind:value={settings.client_secret}
                  placeholder={isLocked("client_secret")
                    ? "Set by environment"
                    : hasClientSecret
                      ? "•••••••• (stored — leave empty to keep)"
                      : "Enter client secret"}
                  disabled={isLocked("client_secret")}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  class="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                  aria-label={showSecret ? "Hide client secret" : "Show client secret"}
                  aria-pressed={showSecret}
                  onclick={() => (showSecret = !showSecret)}
                >
                  {#if showSecret}
                    <EyeOffIcon class="h-4 w-4" />
                  {:else}
                    <EyeIcon class="h-4 w-4" />
                  {/if}
                </Button>
              </div>
              {#if hasClientSecret && !isLocked("client_secret")}
                <p class="text-muted-foreground text-xs">
                  A client secret is stored. Leave the field empty to keep it, or enter a new one to replace it.
                </p>
              {/if}
            </div>

            <!-- Scopes -->
            <div class="grid gap-2">
              <Label for="scopes">Scopes</Label>
              {#if isLocked("scopes")}<Badge variant="secondary">Set by environment</Badge>{/if}
              <Input
                id="scopes"
                bind:value={settings.scopes}
                placeholder="openid profile email"
                disabled={isLocked("scopes")}
              />
              <p class="text-muted-foreground text-xs">
                Space-separated list of OIDC scopes. Add your provider's group scope if needed (e.g. "openid profile
                email groups").
              </p>
            </div>

            <!-- Groups Claim -->
            <div class="grid gap-2">
              <Label for="groups_claim">Groups Claim Name</Label>
              {#if isLocked("groups_claim")}<Badge variant="secondary">Set by environment</Badge>{/if}
              <Input
                id="groups_claim"
                bind:value={settings.groups_claim}
                placeholder="groups"
                disabled={isLocked("groups_claim")}
              />
              <p class="text-muted-foreground text-xs">
                The claim in the ID token that contains the user's group memberships. Common values: "groups" (Keycloak,
                Authentik), "roles", "cognito:groups" (AWS).
              </p>
            </div>

            <Separator />

            <!-- Allow Local Login -->
            <div class="flex items-center justify-between">
              <div>
                <Label for="allow_local_login">Allow local login</Label>
                {#if isLocked("allow_local_login")}<Badge variant="secondary">Set by environment</Badge>{/if}
                <p class="text-muted-foreground text-sm">
                  When disabled, users can only sign in via the OIDC provider. The password login form will be hidden.
                </p>
              </div>
              <Switch
                id="allow_local_login"
                bind:checked={settings.allow_local_login}
                disabled={isLocked("allow_local_login")}
              />
            </div>

            <!-- Auto-Create Users -->
            <div class="flex items-center justify-between">
              <div>
                <Label for="auto_create_users">Auto-create users on first login</Label>
                {#if isLocked("auto_create_users")}<Badge variant="secondary">Set by environment</Badge>{/if}
                <p class="text-muted-foreground text-sm">
                  Required for a user's first sign-in — the account is created and linked to the provider on that login.
                  Turn off afterwards to stop new identities from being provisioned; there is no manual linking.
                </p>
              </div>
              <Switch
                id="auto_create_users"
                bind:checked={settings.auto_create_users}
                disabled={isLocked("auto_create_users")}
              />
            </div>

            <!-- Default Role -->
            <div class="grid gap-2">
              <Label for="default_role_id">Default Role</Label>
              {#if isLocked("default_role_id")}<Badge variant="secondary">Set by environment</Badge>{/if}
              <Select.Root
                type="single"
                value={settings.default_role_id || NO_DEFAULT_ROLE}
                onValueChange={(val) => {
                  if (val) settings.default_role_id = val === NO_DEFAULT_ROLE ? "" : val;
                }}
                disabled={isLocked("default_role_id")}
              >
                <Select.Trigger id="default_role_id" class="w-full">
                  {settings.default_role_id ? getRoleName(settings.default_role_id) : "No default role"}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={NO_DEFAULT_ROLE}
                    >No default role — refuse users without a matching group</Select.Item
                  >
                  <Select.Separator />
                  {#each roles as role (role.id)}
                    <Select.Item value={role.id}>
                      {role.role_name}
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <p class="text-muted-foreground text-xs">
                Assigned when a user's OIDC groups don't match any mapping below. Without a default role such users are
                refused: a first sign-in as "not provisioned", an existing user left with no roles as "no roles".
              </p>
            </div>

            <Separator />

            <!-- Test Connection -->
            {#if testResult}
              <div
                class="rounded-lg border p-4 {testResult.success
                  ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                  : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20'}"
              >
                <div class="mb-2 flex items-center gap-2">
                  {#if testResult.success}
                    <CheckCircleIcon class="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span class="font-medium text-green-800 dark:text-green-200">Connection successful</span>
                  {:else}
                    <XCircleIcon class="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span class="font-medium text-red-800 dark:text-red-200">Connection failed</span>
                  {/if}
                </div>
                {#if testResult.success}
                  <div class="space-y-1 text-sm text-green-700 dark:text-green-300">
                    <p>Issuer: <code class="text-xs">{testResult.issuer}</code></p>
                    <p>Authorization: <code class="text-xs">{testResult.authorizationEndpoint}</code></p>
                    <p>Token: <code class="text-xs">{testResult.tokenEndpoint}</code></p>
                    {#if testResult.userinfoEndpoint}
                      <p>Userinfo: <code class="text-xs">{testResult.userinfoEndpoint}</code></p>
                    {/if}
                  </div>
                {:else}
                  <p class="text-sm text-red-700 dark:text-red-300">{testResult.error}</p>
                {/if}
              </div>
            {/if}
          {/if}
        </div>
      </Card.Content>
      <Card.Footer class="flex justify-between">
        {#if settings.enabled}
          <Button
            variant="outline"
            disabled={testing || !settings.issuer_url || !settings.client_id}
            onclick={testConnection}
          >
            {#if testing}
              <Spinner class="mr-2 h-4 w-4" />
            {:else}
              <PlayIcon class="mr-2 h-4 w-4" />
            {/if}
            Test Connection
          </Button>
        {:else}
          <div></div>
        {/if}
        <Button disabled={saving} onclick={saveSettings}>
          {#if saving}
            <Spinner class="mr-2 h-4 w-4" />
          {:else}
            <SaveIcon class="mr-2 h-4 w-4" />
          {/if}
          Save Settings
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- ============ Group-Role Mapping Card ============ -->
    {#if settings.enabled}
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            Group → Role Mapping
            {#if mappingsLocked}<Badge variant="secondary">Set by environment</Badge>{/if}
          </Card.Title>
          <Card.Description>
            {#if mappingsLocked}
              Mappings are managed by <code class="text-xs">{MAPPINGS_ENV}</code> and cannot be edited here; the mappings
              saved in the database are ignored while it is set. Roles are synchronized on every login.
            {:else}
              Map OIDC group names to Kener roles. When a user signs in via OIDC, their group memberships determine
              which roles they get in Kener. Roles are synchronized on every login.
            {/if}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          {#if mappingsEnvError}
            <div
              class="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
            >
              <strong>{MAPPINGS_ENV} is set but was ignored:</strong>
              {mappingsEnvError}. The mappings below (from the database) are in effect.
            </div>
          {/if}

          <!-- Add new mapping -->
          <div class="mb-6 flex items-end gap-3">
            <div class="grid flex-1 gap-2">
              <Label for="new_group">OIDC Group</Label>
              <Input
                id="new_group"
                bind:value={newMappingGroup}
                placeholder="e.g. Windows-Admins"
                disabled={mappingsLocked}
              />
            </div>
            <div class="grid flex-1 gap-2">
              <Label for="new_mapping_role">Kener Role</Label>
              <Select.Root
                type="single"
                value={newMappingRoleId}
                disabled={mappingsLocked}
                onValueChange={(val) => {
                  if (val) newMappingRoleId = val;
                }}
              >
                <Select.Trigger id="new_mapping_role" class="w-full" disabled={mappingsLocked}>
                  {newMappingRoleId ? getRoleName(newMappingRoleId) : "Select a role..."}
                </Select.Trigger>
                <Select.Content>
                  {#each roles as role (role.id)}
                    <Select.Item value={role.id}>
                      {role.role_name}
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </div>
            <Button disabled={addingMapping || mappingsLocked} onclick={addMapping}>
              {#if addingMapping}
                <Spinner class="mr-2 h-4 w-4" />
              {:else}
                <PlusIcon class="mr-2 h-4 w-4" />
              {/if}
              Add
            </Button>
          </div>

          <!-- Mappings table -->
          {#if loadingMappings}
            <div class="flex items-center justify-center py-8">
              <Spinner class="h-6 w-6" />
            </div>
          {:else if mappings.length === 0}
            <div class="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
              {#if mappingsLocked}
                <p>{MAPPINGS_ENV} contains no usable mappings.</p>
                <p class="mt-1 text-sm">
                  {settings.default_role_id
                    ? "Every OIDC user receives the default role."
                    : "No default role is set either, so every OIDC sign-in is refused."}
                </p>
              {:else}
                <p>No group mappings configured yet.</p>
                <p class="mt-1 text-sm">Add a mapping above to assign Kener roles based on OIDC groups.</p>
              {/if}
            </div>
          {:else}
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head class="pl-4">OIDC Group</Table.Head>
                  <Table.Head>Kener Role</Table.Head>
                  <Table.Head class="pr-4 text-right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each mappings as mapping (mapping.oidc_group)}
                  <Table.Row>
                    <Table.Cell class="pl-4">
                      <code class="text-sm">{mapping.oidc_group}</code>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant="outline">{getRoleName(mapping.role_id)}</Badge>
                    </Table.Cell>
                    <Table.Cell class="pr-4 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={mappingsLocked}
                        aria-label={`Delete mapping for ${mapping.oidc_group}`}
                        onclick={() => openDeleteMappingDialog(mapping)}
                      >
                        <TrashIcon class="h-4 w-4" />
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          {/if}

          {#if invalidMappings.length > 0}
            <div
              class="mt-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200"
            >
              <p class="font-medium">Ignored entries in {MAPPINGS_ENV}</p>
              <ul class="mt-2 list-disc space-y-1 pl-5">
                {#each invalidMappings as entry, i (i)}
                  <li>
                    <code class="text-xs">{JSON.stringify(entry.oidc_group)} → {JSON.stringify(entry.role_id)}</code>
                    — {entry.reason}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- ============ Info Card ============ -->
      <Card.Root>
        <Card.Header>
          <Card.Title>How it works</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-muted-foreground space-y-3 text-sm">
            <p>
              <strong>On every OIDC login</strong>, Kener reads the user's group memberships from the ID token (using
              the claim name configured above) and updates their roles accordingly.
            </p>
            <p>
              <strong>Roles from OIDC mappings</strong> are fully synchronized: Kener remembers which roles it granted, and
              on the next login a user loses a granted role when they leave the group, when the mapping is deleted, or when
              it is changed to a different role.
            </p>
            <p>
              <strong>Manually assigned roles</strong> (granted under Users rather than by a mapping) are preserved and not
              affected by OIDC sync — even if a mapping names the same role.
            </p>
            <p>
              <strong>If no groups match</strong>, the default role (configured above) is assigned. Without a default
              role the sign-in is refused — there is no built-in fallback role.
            </p>
          </div>
        </Card.Content>
      </Card.Root>
    {/if}
  {/if}
</div>

<!-- Delete Mapping Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Group Mapping</AlertDialog.Title>
      <AlertDialog.Description>
        Remove the mapping for OIDC group "{mappingToDelete?.oidc_group}"? Users in this group will no longer receive
        the "{mappingToDelete ? getRoleName(mappingToDelete.role_id) : ""}" role on their next login.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={deletingMapping}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={deleteMapping} disabled={deletingMapping}>
        {#if deletingMapping}
          <Spinner class="h-4 w-4" />
        {/if}
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
