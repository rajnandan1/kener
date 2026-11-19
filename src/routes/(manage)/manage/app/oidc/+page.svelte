<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

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
  import type { OidcSettings } from "$lib/types/site.js";

  // ============ Types ============

  interface GroupRoleMapping {
    id: number;
    oidc_group: string;
    role_id: string;
    created_at: string;
    updated_at: string;
  }

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

  let originalMaskedSecret = $state("");

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
      body: JSON.stringify({ action, data })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as Record<string, string>).error || `Request failed with status ${response.status}`);
    }
    return await response.json();
  }

  // ============ Settings ============

  async function loadSettings() {
    loading = true;
    try {
      const result = (await apiCall("getOidcSettingsMasked")) as OidcSettings | { error: string };
      if (result && !("error" in result)) {
        settings = { ...settings, ...result };
        originalMaskedSecret = settings.client_secret;
      }
    } catch {
      toast.error($adminT("Failed to load OIDC settings"));
    } finally {
      loading = false;
    }
  }

  async function saveSettings() {
    saving = true;
    try {
      // Only include client_secret if it was changed from the masked value
      const settingsToSave = { ...settings };
      if (settingsToSave.client_secret === originalMaskedSecret) {
        delete (settingsToSave as Record<string, unknown>).client_secret;
      }
      const result = (await apiCall("storeSiteData", { oidcSettings: JSON.stringify(settingsToSave) })) as {
        error?: string;
      };
      if (result?.error) {
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("OIDC settings saved"));
      }
    } catch {
      toast.error($adminT("Failed to save OIDC settings"));
    } finally {
      saving = false;
    }
  }

  async function testConnection() {
    testing = true;
    testResult = null;
    try {
      const result = (await apiCall("testOidcConnection", { settings })) as {
        success: boolean;
        issuer?: string;
        authorizationEndpoint?: string;
        tokenEndpoint?: string;
        userinfoEndpoint?: string;
        error?: string;
      };
      testResult = result;
      if (result.success) {
        toast.success($adminT("Connection successful"));
      } else {
        toast.error($adminT(result.error || "Connection failed"));
      }
    } catch {
      toast.error($adminT("Connection test failed"));
      testResult = { success: false, error: "Network error" };
    } finally {
      testing = false;
    }
  }

  // ============ Group-Role Mappings ============

  async function loadMappings() {
    loadingMappings = true;
    try {
      const result = (await apiCall("getOidcGroupRoleMappings")) as GroupRoleMapping[] | { error: string };
      if (Array.isArray(result)) {
        mappings = result;
      }
    } catch {
      toast.error($adminT("Failed to load group mappings"));
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
      toast.error($adminT("Please enter an OIDC group name"));
      return;
    }
    if (!newMappingRoleId) {
      toast.error($adminT("Please select a Kener role"));
      return;
    }

    addingMapping = true;
    try {
      const result = (await apiCall("upsertOidcGroupRoleMapping", {
        oidc_group: newMappingGroup.trim(),
        role_id: newMappingRoleId
      })) as { error?: string };
      if (result?.error) {
        toast.error($adminT(result.error));
      } else {
        toast.success(
          $adminT('Mapping added: "{newMappingGroup}" → "{value2}"', {
            newMappingGroup: newMappingGroup,
            value2: getRoleName(newMappingRoleId)
          })
        );
        newMappingGroup = "";
        newMappingRoleId = "";
        await loadMappings();
      }
    } catch {
      toast.error($adminT("Failed to add mapping"));
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
      const result = (await apiCall("deleteOidcGroupRoleMapping", {
        id: mappingToDelete.id
      })) as { error?: string };
      if (result?.error) {
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("Mapping deleted"));
        await loadMappings();
      }
    } catch {
      toast.error($adminT("Failed to delete mapping"));
    } finally {
      deletingMapping = false;
      deleteDialogOpen = false;
      mappingToDelete = null;
    }
  }

  // ============ Helpers ============

  function getRoleName(roleId: string): string {
    const role = roles.find((r) => r.id === roleId);
    return role ? (role.readonly === 1 ? $adminT(role.role_name) : role.role_name) : roleId;
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
        <Card.Title>{$adminT("OpenID Connect Settings")}</Card.Title>
        <Card.Description>
          {$adminT(
            "Configure an OIDC provider (e.g. Keycloak, Azure AD, Authentik) to allow single sign-on for your users."
          )}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-6">
          <!-- Enable/Disable -->
          <div class="flex items-center justify-between">
            <div>
              <Label>{$adminT("Enable OpenID Connect")}</Label>
              <p class="text-muted-foreground text-sm">
                {$adminT("Allow users to sign in using an external identity provider.")}
              </p>
            </div>
            <Switch bind:checked={settings.enabled} />
          </div>

          <Separator />

          {#if settings.enabled}
            <!-- Provider Name -->
            <div class="grid gap-2">
              <Label for="provider_name">{$adminT("Provider Name")}</Label>
              <Input
                id="provider_name"
                bind:value={settings.provider_name}
                placeholder={$adminT("e.g. Keycloak, Azure AD, Authentik")}
              />
              <p class="text-muted-foreground text-xs">
                {$adminT('Displayed on the login button: "Sign in with {provider}"', {
                  provider: settings.provider_name || "..."
                })}
              </p>
            </div>

            <!-- Issuer URL -->
            <div class="grid gap-2">
              <Label for="issuer_url">{$adminT("Issuer URL")}</Label>
              <Input
                id="issuer_url"
                bind:value={settings.issuer_url}
                placeholder="https://keycloak.example.com/realms/myrealm"
              />
              <p class="text-muted-foreground text-xs">
                {$adminT("The base URL of the OIDC provider. Must support discovery through {path}.", {
                  path: ".well-known/openid-configuration"
                })}
              </p>
            </div>

            <!-- Client ID -->
            <div class="grid gap-2">
              <Label for="client_id">{$adminT("Client ID")}</Label>
              <Input id="client_id" bind:value={settings.client_id} placeholder={$adminT("kener-client")} />
            </div>

            <!-- Client Secret -->
            <div class="grid gap-2">
              <Label for="client_secret">{$adminT("Client Secret")}</Label>
              <div class="relative">
                <Input
                  id="client_secret"
                  type={showSecret ? "text" : "password"}
                  bind:value={settings.client_secret}
                  placeholder="••••••••"
                />
                <Button
                  aria-label={showSecret ? $adminT("Hide client secret") : $adminT("Show client secret")}
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
              <Label for="scopes">{$adminT("Scopes")}</Label>
              <Input id="scopes" bind:value={settings.scopes} placeholder={$adminT("openid profile email")} />
              <p class="text-muted-foreground text-xs">
                {$adminT(
                  'Space-separated list of OIDC scopes. Add your provider\'s group scope if needed (e.g. "openid profile email groups").'
                )}
              </p>
            </div>

            <!-- Groups Claim -->
            <div class="grid gap-2">
              <Label for="groups_claim">{$adminT("Groups Claim Name")}</Label>
              <Input id="groups_claim" bind:value={settings.groups_claim} placeholder={$adminT("groups")} />
              <p class="text-muted-foreground text-xs">
                {$adminT(
                  'The claim in the ID token that contains the user\'s group memberships. Common values: "groups" (Keycloak, Authentik), "roles", "cognito:groups" (AWS).'
                )}
              </p>
            </div>

            <Separator />

            <!-- Allow Local Login -->
            <div class="flex items-center justify-between">
              <div>
                <Label>{$adminT("Allow local login")}</Label>
                <p class="text-muted-foreground text-sm">
                  {$adminT(
                    "When disabled, users can only sign in via the OIDC provider. The password login form will be hidden."
                  )}
                </p>
              </div>
              <Switch bind:checked={settings.allow_local_login} />
            </div>

            <!-- Auto-Create Users -->
            <div class="flex items-center justify-between">
              <div>
                <Label>{$adminT("Auto-create users on first login")}</Label>
                <p class="text-muted-foreground text-sm">
                  {$adminT(
                    "When enabled, a new Kener user is created automatically on first OIDC login. When disabled, users must be pre-created."
                  )}
                </p>
              </div>
              <Switch bind:checked={settings.auto_create_users} />
            </div>

            <!-- Default Role -->
            <div class="grid gap-2">
              <Label for="oidc-default-role">{$adminT("Default Role")}</Label>
              <Select.Root
                type="single"
                value={settings.default_role_id}
                onValueChange={(val) => {
                  if (val) settings.default_role_id = val;
                }}
              >
                <Select.Trigger id="oidc-default-role" class="w-full">
                  {getRoleName(settings.default_role_id) || $adminT("Select a role...")}
                </Select.Trigger>
                <Select.Content>
                  {#each roles as role (role.id)}
                    <Select.Item value={role.id}>
                      {role.readonly === 1 ? $adminT(role.role_name) : role.role_name}
                    </Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              <p class="text-muted-foreground text-xs">
                {$adminT("Assigned when a user's OIDC groups don't match any mapping below.")}
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
                    <span class="font-medium text-green-800 dark:text-green-200"
                      >{$adminT("Connection successful")}</span
                    >
                  {:else}
                    <XCircleIcon class="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span class="font-medium text-red-800 dark:text-red-200">{$adminT("Connection failed")}</span>
                  {/if}
                </div>
                {#if testResult.success}
                  <div class="space-y-1 text-sm text-green-700 dark:text-green-300">
                    <p>{$adminT("Issuer:")} <code class="text-xs">{testResult.issuer}</code></p>
                    <p>{$adminT("Authorization:")} <code class="text-xs">{testResult.authorizationEndpoint}</code></p>
                    <p>{$adminT("Token:")} <code class="text-xs">{testResult.tokenEndpoint}</code></p>
                    {#if testResult.userinfoEndpoint}
                      <p>{$adminT("Userinfo:")} <code class="text-xs">{testResult.userinfoEndpoint}</code></p>
                    {/if}
                  </div>
                {:else}
                  <p class="text-sm text-red-700 dark:text-red-300">{$adminT(String(testResult.error ?? ""))}</p>
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
            {$adminT("Test Connection")}
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
          {$adminT("Save Settings")}
        </Button>
      </Card.Footer>
    </Card.Root>

    <!-- ============ Group-Role Mapping Card ============ -->
    {#if settings.enabled}
      <Card.Root>
        <Card.Header>
          <Card.Title>{$adminT("Group → Role Mapping")}</Card.Title>
          <Card.Description>
            {$adminT(
              "Map OIDC group names to Kener roles. When a user signs in via OIDC, their group memberships determine which roles they get in Kener. Roles are synchronized on every login."
            )}
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <!-- Add new mapping -->
          <div class="mb-6 flex items-end gap-3">
            <div class="grid flex-1 gap-2">
              <Label for="new_group">{$adminT("OIDC Group")}</Label>
              <Input id="new_group" bind:value={newMappingGroup} placeholder={$adminT("e.g. Windows-Admins")} />
            </div>
            <div class="grid flex-1 gap-2">
              <Label for="oidc-mapping-role">{$adminT("Kener Role")}</Label>
              <Select.Root
                type="single"
                value={newMappingRoleId}
                onValueChange={(val) => {
                  if (val) newMappingRoleId = val;
                }}
              >
                <Select.Trigger id="oidc-mapping-role" class="w-full">
                  {newMappingRoleId ? getRoleName(newMappingRoleId) : $adminT("Select a role...")}
                </Select.Trigger>
                <Select.Content>
                  {#each roles as role (role.id)}
                    <Select.Item value={role.id}>
                      {role.readonly === 1 ? $adminT(role.role_name) : role.role_name}
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
              {$adminT("Add")}
            </Button>
          </div>

          <!-- Mappings table -->
          {#if loadingMappings}
            <div class="flex items-center justify-center py-8">
              <Spinner class="h-6 w-6" />
            </div>
          {:else if mappings.length === 0}
            <div class="text-muted-foreground rounded-lg border border-dashed py-8 text-center">
              <p>{$adminT("No group mappings configured yet.")}</p>
              <p class="mt-1 text-sm">{$adminT("Add a mapping above to assign Kener roles based on OIDC groups.")}</p>
            </div>
          {:else}
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head class="pl-4">{$adminT("OIDC Group")}</Table.Head>
                  <Table.Head>{$adminT("Kener Role")}</Table.Head>
                  <Table.Head class="pr-4 text-right">{$adminT("Actions")}</Table.Head>
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
                        aria-label={$adminT("Delete Group Mapping")}
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
          <Card.Title>{$adminT("How it works")}</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="text-muted-foreground space-y-3 text-sm">
            <p>
              {$adminT(
                "On every OIDC login, Kener reads the user's group memberships from the ID token (using the claim name configured above) and updates their roles accordingly."
              )}
            </p>
            <p>
              {$adminT(
                "Roles from OIDC mappings are fully synchronized: if a user is removed from an OIDC group, they lose the corresponding Kener role on next login."
              )}
            </p>
            <p>
              {$adminT(
                "Manually assigned roles (roles that don't appear in any mapping above) are preserved and not affected by OIDC sync."
              )}
            </p>
            <p>{$adminT("If no groups match, the default role (configured above) is assigned.")}</p>
            <p>
              <strong>{$adminT("Callback URL")}</strong>
              {$adminT("to configure in your OIDC provider:")}<br />
              <code class="bg-muted rounded px-2 py-1 text-xs">
                {typeof window !== "undefined" ? window.location.origin : "https://your-kener-domain"}{resolve(
                  "/account/oidc/callback"
                )}
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
      <AlertDialog.Title>{$adminT("Delete Group Mapping")}</AlertDialog.Title>
      <AlertDialog.Description>
        {$adminT(
          'Remove the mapping for OIDC group "{group}"? Users in this group will no longer receive the "{role}" role on their next login.',
          {
            group: mappingToDelete?.oidc_group ?? "",
            role: mappingToDelete ? getRoleName(mappingToDelete.role_id) : ""
          }
        )}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={deletingMapping}>{$adminT("Cancel")}</AlertDialog.Cancel>
      <AlertDialog.Action onclick={deleteMapping} disabled={deletingMapping}>
        {#if deletingMapping}
          <Spinner class="h-4 w-4" />
        {/if}
        {$adminT("Delete")}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
