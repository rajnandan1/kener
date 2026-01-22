<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import Plus from "@lucide/svelte/icons/plus";
  import Loader from "@lucide/svelte/icons/loader";
  import Copy from "@lucide/svelte/icons/copy";
  import Check from "@lucide/svelte/icons/check";
  import KeyIcon from "@lucide/svelte/icons/key";
  import { toast } from "svelte-sonner";
  import { format } from "date-fns";

  interface ApiKey {
    id: number;
    name: string;
    masked_key: string;
    status: string;
    created_at: string;
  }

  // State
  let apiKeys = $state<ApiKey[]>([]);
  let loading = $state(true);
  let creating = $state(false);
  let showCreateDialog = $state(false);
  let newAPIKeyName = $state("");
  let newKeyResp = $state<{ apiKey?: string }>({});
  let copied = $state(false);

  async function loadAPIKeys() {
    loading = true;
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAPIKeys", data: {} })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        apiKeys = result;
      }
    } catch (e) {
      toast.error("Failed to load API keys");
    } finally {
      loading = false;
    }
  }

  async function createNewAPIKey() {
    if (!newAPIKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    creating = true;
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createNewApiKey",
          data: { name: newAPIKeyName }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        newKeyResp = result;
        toast.success("API key created successfully");
        loadAPIKeys();
        showCreateDialog = false;
        newAPIKeyName = "";
      }
    } catch (e) {
      toast.error("Failed to create API key");
    } finally {
      creating = false;
    }
  }

  async function updateStatus(apiKey: ApiKey) {
    const newStatus = apiKey.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateApiKeyStatus",
          data: { id: apiKey.id, status: newStatus }
        })
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        apiKey.status = newStatus;
        apiKeys = [...apiKeys];
        toast.success(`API key ${newStatus === "ACTIVE" ? "activated" : "deactivated"}`);
      }
    } catch (e) {
      toast.error("Failed to update API key status");
    }
  }

  function copyKey() {
    if (newKeyResp.apiKey) {
      navigator.clipboard.writeText(newKeyResp.apiKey);
      copied = true;
      toast.success("API key copied to clipboard");
      setTimeout(() => {
        copied = false;
      }, 2000);
    }
  }

  function formatDate(dateStr: string): string {
    try {
      return format(new Date(dateStr), "MMM d, yyyy HH:mm");
    } catch {
      return dateStr;
    }
  }

  function dismissNewKey() {
    newKeyResp = {};
  }

  $effect(() => {
    loadAPIKeys();
  });
</script>

<div class="flex w-full flex-col gap-4 p-4">
  <!-- Breadcrumb -->

  <!-- Header with Create Button -->
  <div class="flex items-center justify-end">
    <Button onclick={() => (showCreateDialog = true)}>
      <Plus class="mr-2 h-4 w-4" />
      Create New API Key
    </Button>
  </div>

  <!-- New Key Alert -->
  {#if newKeyResp.apiKey}
    <Card.Root class="border-green-600 bg-green-50 dark:bg-green-950/20">
      <Card.Content class="pt-6">
        <div class="flex items-start gap-3">
          <div class="flex-1">
            <p class="font-medium text-green-800 dark:text-green-200">🎉 API Key Created Successfully</p>
            <div class="relative mt-2">
              <code class="bg-background block rounded-md border px-4 py-2 pr-12 font-mono text-sm">
                {newKeyResp.apiKey}
              </code>
              <Button
                size="icon"
                variant="ghost"
                class="absolute top-1/2 right-2 h-7 w-7 -translate-y-1/2"
                onclick={copyKey}
              >
                {#if copied}
                  <Check class="h-4 w-4 text-green-500" />
                {:else}
                  <Copy class="h-4 w-4" />
                {/if}
              </Button>
            </div>
            <p class="text-muted-foreground mt-2 text-xs">
              Your new API key has been created. It will <strong class="uppercase underline">not be shown again</strong
              >, so make sure to save it.
            </p>
          </div>
          <Button size="sm" variant="ghost" onclick={dismissNewKey}>Dismiss</Button>
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- API Keys Table -->
  <Card.Root>
    <Card.Content class="p-0">
      {#if loading}
        <div class="flex items-center justify-center py-12">
          <Spinner class="h-6 w-6" />
        </div>
      {:else if apiKeys.length === 0}
        <div class="text-muted-foreground py-12 text-center">
          <KeyIcon class="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No API keys found</p>
          <p class="text-sm">Create your first API key to get started</p>
        </div>
      {:else}
        <Table.Root class="p-4">
          <Table.Header>
            <Table.Row>
              <Table.Head class="pl-4">Name</Table.Head>
              <Table.Head>Key</Table.Head>
              <Table.Head>Created At</Table.Head>
              <Table.Head class="pr-4 text-right">Status</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each apiKeys as apiKey (apiKey.id)}
              <Table.Row>
                <Table.Cell class="pl-4 font-medium">{apiKey.name}</Table.Cell>
                <Table.Cell>
                  <code class="text-muted-foreground text-xs">
                    {apiKey.masked_key.slice(-32)}
                  </code>
                </Table.Cell>
                <Table.Cell class="text-muted-foreground text-sm">
                  {formatDate(apiKey.created_at)}
                </Table.Cell>
                <Table.Cell class="pr-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <span class="text-muted-foreground text-xs">
                      {apiKey.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                    <Switch checked={apiKey.status === "ACTIVE"} onCheckedChange={() => updateStatus(apiKey)} />
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
<Dialog.Root bind:open={showCreateDialog}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Create a new API Key</Dialog.Title>
      <Dialog.Description>
        API keys are used to authenticate your requests to the API. They are unique to your account and should be kept
        secret.
      </Dialog.Description>
    </Dialog.Header>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        createNewAPIKey();
      }}
    >
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="newAPIKeyName">Name</Label>
          <Input id="newAPIKeyName" bind:value={newAPIKeyName} placeholder="eg. My API Key" required />
        </div>
      </div>
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (showCreateDialog = false)}>Cancel</Button>
        <Button type="submit" disabled={creating}>
          {#if creating}
            <Loader class="mr-2 h-4 w-4 animate-spin" />
          {/if}
          Create
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
