<script lang="ts">
  import { SvelteSet } from "svelte/reactivity";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import KeyIcon from "@lucide/svelte/icons/key";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import EyeOffIcon from "@lucide/svelte/icons/eye-off";
  import SaveIcon from "@lucide/svelte/icons/save";
  import XIcon from "@lucide/svelte/icons/x";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";

  // Types
  interface VaultSecret {
    id: number;
    secret_name: string;
    secret_value: string;
    created_at: string;
    updated_at: string;
  }

  // State
  let loading = $state(true);
  let saving = $state(false);
  let secrets = $state<VaultSecret[]>([]);
  let visibleSecrets = new SvelteSet<number>();

  // Form state
  let isEditing = $state(false);
  let editingId = $state<number | null>(null);
  let formName = $state("");
  let formValue = $state("");

  // Delete confirmation state
  let deleteDialogOpen = $state(false);
  let secretToDelete = $state<VaultSecret | null>(null);
  let isDeleting = $state(false);

  // API functions
  async function loadSecrets() {
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getVaultSecrets" })
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else if (Array.isArray(result)) {
        secrets = result;
      }
    } catch (error) {
      console.error("Error loading secrets:", error);
      toast.error("Failed to load secrets");
    }
  }

  async function saveSecret() {
    if (!formName.trim()) {
      toast.error("Secret name is required");
      return;
    }
    if (!formValue.trim()) {
      toast.error("Secret value is required");
      return;
    }

    saving = true;
    try {
      const action = editingId ? "updateVaultSecret" : "createVaultSecret";
      const payload: Record<string, unknown> = {
        action,
        data: {
          secret_name: formName.trim(),
          secret_value: formValue
        }
      };
      if (editingId) {
        payload.data = { ...(payload.data as object), id: editingId };
      }

      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(editingId ? "Secret updated successfully" : "Secret created successfully");
        resetForm();
        await loadSecrets();
      }
    } catch (error) {
      console.error("Error saving secret:", error);
      toast.error("Failed to save secret");
    } finally {
      saving = false;
    }
  }

  async function confirmDelete() {
    if (!secretToDelete) return;

    isDeleting = true;
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteVaultSecret",
          data: { id: secretToDelete.id }
        })
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Secret deleted successfully");
        await loadSecrets();
      }
    } catch (error) {
      console.error("Error deleting secret:", error);
      toast.error("Failed to delete secret");
    } finally {
      isDeleting = false;
      deleteDialogOpen = false;
      secretToDelete = null;
    }
  }

  function startEdit(secret: VaultSecret) {
    editingId = secret.id;
    formName = secret.secret_name;
    formValue = secret.secret_value;
    isEditing = true;
  }

  function startCreate() {
    editingId = null;
    formName = "";
    formValue = "";
    isEditing = true;
  }

  function resetForm() {
    editingId = null;
    formName = "";
    formValue = "";
    isEditing = false;
  }

  function openDeleteDialog(secret: VaultSecret) {
    secretToDelete = secret;
    deleteDialogOpen = true;
  }

  function toggleSecretVisibility(id: number) {
    if (visibleSecrets.has(id)) {
      visibleSecrets.delete(id);
    } else {
      visibleSecrets.add(id);
    }
  }

  function maskValue(value: string): string {
    return "*".repeat(Math.min(value.length, 20));
  }

  // Initial load
  onMount(async () => {
    await loadSecrets();
    loading = false;
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <KeyIcon class="text-muted-foreground size-6" />
      <div>
        <h1 class="text-2xl font-bold">Vault</h1>
        <p class="text-muted-foreground text-sm">Securely store and manage your secrets</p>
      </div>
    </div>
    {#if !isEditing}
      <Button onclick={startCreate}>
        <PlusIcon class="mr-2 size-4" />
        Add Secret
      </Button>
    {/if}
  </div>

  {#if loading}
    <div class="flex h-96 items-center justify-center">
      <Spinner class="size-8" />
    </div>
  {:else}
    <!-- Form Card -->
    {#if isEditing}
      <Card.Root>
        <Card.Header>
          <Card.Title>{editingId ? "Edit Secret" : "Add New Secret"}</Card.Title>
          <Card.Description>
            {editingId ? "Update the secret details below" : "Enter the secret name and value below"}
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
          <div class="space-y-2">
            <Label for="secret-name">Secret Name</Label>
            <Input id="secret-name" placeholder="e.g., API_KEY" bind:value={formName} disabled={saving} />
          </div>
          <div class="space-y-2">
            <Label for="secret-value">Secret Value</Label>
            <Textarea
              id="secret-value"
              placeholder="Enter secret value..."
              bind:value={formValue}
              disabled={saving}
              rows={4}
            />
          </div>
        </Card.Content>
        <Card.Footer class="flex justify-end gap-2">
          <Button variant="outline" onclick={resetForm} disabled={saving}>
            <XIcon class="mr-2 size-4" />
            Cancel
          </Button>
          <Button onclick={saveSecret} disabled={saving}>
            {#if saving}
              <Spinner class="mr-2 size-4" />
            {:else}
              <SaveIcon class="mr-2 size-4" />
            {/if}
            {editingId ? "Update Secret" : "Save Secret"}
          </Button>
        </Card.Footer>
      </Card.Root>
    {/if}

    <!-- Secrets List -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-2">
          <KeyIcon class="text-muted-foreground size-5" />
          <div>
            <Card.Title>Stored Secrets</Card.Title>
            <Card.Description>All secrets are encrypted using KENER_SECRET_KEY</Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        {#if secrets.length === 0}
          <div class="text-muted-foreground py-8 text-center">
            No secrets stored yet. Click "Add Secret" to create your first secret.
          </div>
        {:else}
          <div class="space-y-3">
            {#each secrets as secret (secret.id)}
              <div class="flex items-center justify-between rounded-lg border p-4">
                <div class="flex-1 space-y-1">
                  <div class="flex items-center gap-2">
                    <KeyIcon class="text-muted-foreground size-4" />
                    <span class="font-medium">{secret.secret_name}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <code class="bg-muted rounded px-2 py-1 font-mono text-sm">
                      {visibleSecrets.has(secret.id) ? secret.secret_value : maskValue(secret.secret_value)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="size-8 p-0"
                      onclick={() => toggleSecretVisibility(secret.id)}
                    >
                      {#if visibleSecrets.has(secret.id)}
                        <EyeOffIcon class="size-4" />
                      {:else}
                        <EyeIcon class="size-4" />
                      {/if}
                    </Button>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="sm" onclick={() => startEdit(secret)} disabled={isEditing}>
                    <PencilIcon class="mr-2 size-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onclick={() => openDeleteDialog(secret)} disabled={isEditing}>
                    <TrashIcon class="mr-2 size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Secret</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete the secret "{secretToDelete?.secret_name}"? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={isDeleting}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={confirmDelete}
        disabled={isDeleting}
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {#if isDeleting}
          <Spinner class="mr-2 size-4" />
        {/if}
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
