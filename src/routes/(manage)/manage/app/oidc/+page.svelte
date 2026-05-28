<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import PlayIcon from "@lucide/svelte/icons/play";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
  import XCircleIcon from "@lucide/svelte/icons/x-circle";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import EyeOffIcon from "@lucide/svelte/icons/eye-off";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import type { RoleRecord } from "$lib/server/types/db.js";

  // ============ Types ============

  interface OidcSettings {
    enabled: boolean;
    provider_name: string;
    issuer_url: string;
    client_id: string;
    client_secret: string;
    scopes: string;
    groups_claim: string;
    allow_local_login: boolean;
    auto_create_users: boolean;
    default_role_id: string;
  }

  interface GroupRoleMapping {
    id: number;
    oidc_group: string;
    role_id: string;
    created_at: string;
    updated_at: string;
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
    auto_create_users: true,
    default_role_id: "member",
  });

  let testResult = $state<{
    success: boolean;
    issuer?: string;
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    userinfoEndpoint?: string;
    error?: string;
  } | null>(null);

  // Group-Role Mappings
  let mappings = $state<GroupRoleMapping[]>([]);
  let loadingMappings = $state(true);
  let newMappingGroup = $state("");
  let newMappingRoleId = $state("");
  let addingMapping = $state(false);
  let deleteDialogOpen = $state(false);
  let mappingToDelete = $state<GroupRoleMapping | null>(null);
  let deletingMapping = $state(false);

  // Available roles
  let roles = $state<RoleRecord[]>([]);

  // ============ API Helpers ============

  async function apiCall(action: string, data: Record<string, unknown> = {}): Promise<unknown> {
    const response = await fetch(clientResolver(resolve, "/manage/api"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    return await response.json();
  }

  // ============ Settings ============

  async function loadSettings() {
    loading = true;
    try {
      const result = await apiCall("getSiteDataByKey", { key: "oidcSettings" }) as OidcSettings | { error: string };
      if (result && !("error" in result)) {
        settings = { ...settings, ...result };
      }
    } catch {
      toast.error("Failed to load OIDC settings");
    } finally {
      loading = false;
    }
  }

  async function saveSettings() {
    saving = true;
    try {
      const result = await apiCall("storeSiteData", { oidcSettings: JSON.stringify(settings) }) as { error?: string };
      if (result?.error) {
        toast.error(result.error);
      } else {
        // Clear the cached OIDC configuration so changes take effect
        await apiCall("clearOidcCache");
        toast.success("OIDC settings saved");
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
      const result = await apiCall("testOidcConnection", { settings }) as {
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

  // ============ Group-Role Mappings ============

  async function loadMappings() {
    loadingMappings = true;
    try {
      const result = await apiCall("getOidcGroupRoleMappings") as GroupRoleMapping[] | { error: string };
      if (Array.isArray(result)) {
        mappings = result;
      }
    } catch {
      toast.error("Failed to load group mappings");
    } finally {
      loadingMappings = false;
    }
  }

  async function loadRoles() {
    try {
      const result = await apiCall("getRoles") as RoleRecord[] | { error: string };
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
      const result = await apiCall("upsertOidcGroupRoleMapping", {
        oidc_group: newMappingGroup.trim(),
        role_id: newMappingRoleId,
      }) as { error?: string };
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

  function openDeleteMappingDialog(mapping: GroupRoleMapping) {
    mappingToDelete = mapping;
    deleteDialogOpen = true;
  }

  async function deleteMapping() {
    if (!mappingToDelete) return;
    deletingMapping = true;
    try {
      const result = await apiCall("deleteOidcGroupRoleMapping", {
        id: mappingToDelete.id,
      }) as { error?: string };
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
          Configure an OIDC provider (e.g. Keycloak, Azure AD, Authentik) to allow
          single sign-on for your users.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-6">
          <!-- Enable/Disable -->
          <div class="flex items-center justify-between">
            <div>
              <Label>Enable OpenID Connect</Label>
              <p class="text-muted-foreground text-sm">
                Allow users to sign in using an external identity provider.
              </p>
            </div>
            <Switch bind:checked={settings.enabled} />
          </div>

          <Separator />

          {#if settings.enabled}
            <!-- Provider Name -->
            <div class="grid gap-2">
              <Label for="provider_name">Provider Name</Label>
              <Input
                id="provider_name"
                bind:value={settings.provider_name}
                placeholder="e.g. Keycloak, Azure AD, Authentik"
              />
              <p class="text-muted-foreground text-xs">
                Displayed on the login button: "Sign in with {settings.provider_name || '...'}"
              </p>
            </div>

            <!-- Issuer URL -->
            <div class="grid gap-2">
              <Label for="issuer_url">Issuer URL</Label>
              <Input
                id="issuer_url"
                bind:value={settings.issuer_url}
                placeholder="https://keycloak.example.com/realms/myrealm"
              />
              <p class="text-muted-foreground text-xs">
                The base URL of the OIDC provider. Must support
                <code>.well-known/openid-configuration</code> discovery.
              </p>
            </div>

            <!-- Client ID -->
            <div class="grid gap-2">
              <Label for="client_id">Client ID</Label>
              <Input
                id="client_id"
                bind:value={settings.client_id}
                placeholder="kener-client"
              />
            </div>

            <!-- Client Secret -->
            <div class="grid gap-2">
              <Label for="client_secret">Client Secret</Label>
              <div class="relative">
                <Input
                  id="client_secret"
                  type={showSecret ? "text" : "password"}
                  bind:value={settings.client_secret}
                  placeholder="••••••••"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  class="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                  onclick={() => (showSecret = !showSecret)}
                >
                  {#if showSecret}
                    <EyeOffIcon class="h-4 w-4" />
                  {:else}
                    <EyeIcon class="h-4 w-4" />
                  {/if}
                </Button>
              </div>
            </div>

            <!-- Scopes -->
            <div class="grid gap-2">
              <Label for="scopes">Scopes</Label>
              <Input
                id="scopes"
                bind:value={settings.scopes}
                placeholder="openid profile email"
              />
              <p class="text-muted-foreground text-xs">
                Space-separated list of OIDC scopes. Add your provider's group scope
                if needed (e.g. "openid profile email groups").
              </p>
            </div>

            <!-- Groups Claim -->
            <div class="grid gap-2">
              <Label for="groups_claim">Groups Claim Name</Label>
              <Input
                id="groups_claim"
                bind:value={settings.groups_claim}
                placeholder="groups"
              />
              <p class="text-muted-foreground text-xs">
                The claim in the ID token that contains the user's group memberships.
                Common values: "groups" (Keycloak, Authentik), "roles",
                "cognito:groups" (AWS).
              </p>
            </div>

            <Separator />

            <!-- Allow Local Login -->
            <div class="flex items-center justify-between">
              <div>
                <Label>Allow local login</Label>
                <p class="text-muted-foreground text-sm">
                  When disabled, users can only sign in via the OIDC provider.
                  The password login form will be hidden.
                </p>
              </div>
              <Switch bind:checked={settings.allow_local_login} />
            </div>

            <!-- Auto-Create Users -->
            <div class="flex items-center justify-between">
              <div>
                <Label>Auto-create users on first login</Label>
                <p class="text-muted-foreground text-sm">
                  When enabled, a new Kener user is created automatically on
                  first OIDC login. When disabled, users must be pre-created.
                </p>
              </div>
              <Switch bind:checked={settings.auto_create_users} />
            </div>

            <!-- Default Role -->
            <div class="grid gap-2">
              <Label>Default Role</Label>
              <Select.Root
                type="single"
                value={settings.default_role_id}
                onValueChange={(val) => {
                  if (val) settings.default_role_id = val;
                }}
              >
                <Select.Trigger class="w-full">
                  {getRoleName(settings.default_role_id) || "Select a role..."}
                </Select.Trigger>
                <Select.Content>
                  {#each roles as role (role.id)}
                    <Select.Item value={role.id}>
                      {role.role_name}
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <p class="text-muted-foreground text-xs">
                Assigned when a user's OIDC groups don't match any mapping below.
              </p>
            </div>

            <Separator />

            <!-- Test Connection -->
            {#if testResult}
              <div class="rounded-lg border p-4 {testResult.success ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20' : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20'}">
                <div class="flex items-center gap-2 mb-2">
                  {#if testResult.success}
                    <CheckCircleIcon class="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span class="font-medium text-green-800 dark:text-green-200">Connection successful</span>
                  {:else}
                    <XCircleIcon class="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span class="font-medium text-red-800 dark:text-red-200">Connection failed</span>
                  {/if}
                </div>
                {#if testResult.success}
                  <div class="text-sm text-green-700 dark:text-green-300 space-y-1">
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
          <Card.Title>Group → Role Mapping</Card.Title>
          <Card.Description>
            Map OIDC group names to Kener roles. When a user signs in via OIDC,
            their group memberships determine which roles they get in Kener.
            Roles are synchronized on every login.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <!-- Add new mapping -->
          <div class="mb-6 flex items-end gap-3">
            <div class="flex-1 grid gap-2">
              <Label for="new_group">OIDC Group</Label>
              <Input
                id="new_group"
                bind:value={newMappingGroup}
                placeholder="e.g. Windows-Admins"
              />
            </div>
            <div class="flex-1 grid gap-2">
              <Label>Kener Role</Label>
              <Select.Root
                type="single"
                value={newMappingRoleId}
                onValueChange={(val) => {
                  if (val) newMappingRoleId = val;
                }}
              >
                <Select.Trigger class="w-full">
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
            <Button disabled={addingMapping} onclick={addMapping}>
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
              <p>No group mappings configured yet.</p>
              <p class="text-sm mt-1">
                Add a mapping above to assign Kener roles based on OIDC groups.
              </p>
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
                {#each mappings as mapping (mapping.id)}
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
              <strong>On every OIDC login</strong>, Kener reads the user's group
              memberships from the ID token (using the claim name configured above)
              and updates their roles accordingly.
            </p>
            <p>
              <strong>Roles from OIDC mappings</strong> are fully synchronized:
              if a user is removed from an OIDC group, they lose the corresponding
              Kener role on next login.
            </p>
            <p>
              <strong>Manually assigned roles</strong> (roles that don't appear in
              any mapping above) are preserved and not affected by OIDC sync.
            </p>
            <p>
              <strong>If no groups match</strong>, the default role (configured above)
              is assigned.
            </p>
            <p>
              <strong>Callback URL</strong> to configure in your OIDC provider:<br />
              <code class="bg-muted rounded px-2 py-1 text-xs">
                {typeof window !== "undefined" ? window.location.origin : "https://your-kener-domain"}/account/oidc/callback
              </code>
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
        Remove the mapping for OIDC group "{mappingToDelete?.oidc_group}"?
        Users in this group will no longer receive the
        "{mappingToDelete ? getRoleName(mappingToDelete.role_id) : ''}" role
        on their next login.
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
