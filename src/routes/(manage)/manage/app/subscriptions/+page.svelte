<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { toast } from "svelte-sonner";
  import { format } from "date-fns";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { page as pageData } from "$app/state";
  import Bell from "@lucide/svelte/icons/bell";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import Wrench from "@lucide/svelte/icons/wrench";
  import Mail from "@lucide/svelte/icons/mail";

  import type { SubscriptionsConfig } from "$lib/server/types/db.js";
  import AlertCircleIcon from "@lucide/svelte/icons/octagon-alert";
  import Activity from "@lucide/svelte/icons/activity";

  // Config state
  let config = $state<SubscriptionsConfig>({
    enable: false,
    methods: {
      emails: {
        incidents: true,
        maintenances: true,
        monitors: true
      }
    }
  });
  let loadingConfig = $state(true);
  let savingConfig = $state(false);

  // Subscribers state
  interface Subscriber {
    user_id: number;
    method_id: number;
    email: string;
    incidents_enabled: boolean;
    maintenances_enabled: boolean;
    monitors_enabled: boolean;
    incidents_subscription_id: number | null;
    maintenances_subscription_id: number | null;
    monitors_subscription_id: number | null;
    incidents_monitor_tags: string[] | null;
    maintenances_monitor_tags: string[] | null;
    monitors_monitor_tags: string[] | null;
    created_at: string;
  }

  let subscribers = $state<Subscriber[]>([]);
  let loadingSubscribers = $state(true);
  let page = $state(1);
  let limit = $state(10);
  let total = $state(0);
  let totalPages = $state(0);

  // Available monitors
  interface MonitorOption {
    tag: string;
    name: string;
  }
  let monitors = $state<MonitorOption[]>([]);
  let loadingMonitors = $state(true);
  let monitorSearch = $state("");

  // Selected monitors for each event type in the add dialog
  // Empty array = all monitors
  let selectedIncidentMonitors = $state<string[]>([]);
  let selectedMaintenanceMonitors = $state<string[]>([]);
  let selectedMonitorStatusMonitors = $state<string[]>([]);

  // Add subscriber dialog
  let showAddDialog = $state(false);
  let addingSubscriber = $state(false);
  let newEmail = $state("");
  let newIncidents = $state(true);
  let newMaintenances = $state(true);
  let newMonitors = $state(true);
  let addError = $state("");

  // Delete confirmation
  let showDeleteDialog = $state(false);
  let deletingSubscriber = $state<Subscriber | null>(null);
  let isDeleting = $state(false);

  // Updating toggles
  let updatingToggle = $state<Record<string, boolean>>({});

  // Fetch config
  async function fetchConfig() {
    loadingConfig = true;
    try {
      const res = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getSubscriptionsConfig" })
      });
      config = await res.json();
    } catch (error) {
      toast.error("Failed to load configuration");
    } finally {
      loadingConfig = false;
    }
  }

  // Save config
  async function saveConfig() {
    savingConfig = true;
    try {
      await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSubscriptionsConfig",
          data: config
        })
      });
      toast.success("Configuration saved");
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      savingConfig = false;
    }
  }

  // Fetch subscribers
  async function fetchSubscribers() {
    loadingSubscribers = true;
    try {
      const res = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getAdminSubscribers",
          data: { page, limit }
        })
      });
      const result = await res.json();
      if (!result.error) {
        subscribers = result.subscribers || [];
        total = result.total || 0;
        totalPages = result.totalPages || 0;
      }
    } catch (error) {
      toast.error("Failed to load subscribers");
    } finally {
      loadingSubscribers = false;
    }
  }

  // Toggle subscription status
  async function toggleSubscription(subscriber: Subscriber, eventType: "incidents" | "maintenances" | "monitors", enabled: boolean) {
    const key = `${subscriber.method_id}-${eventType}`;
    updatingToggle[key] = true;

    try {
      const res = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adminUpdateSubscriptionStatus",
          data: {
            methodId: subscriber.method_id,
            eventType,
            enabled
          }
        })
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
        // Revert toggle
        if (eventType === "incidents") {
          subscriber.incidents_enabled = !enabled;
        } else if (eventType === "maintenances") {
          subscriber.maintenances_enabled = !enabled;
        } else {
          subscriber.monitors_enabled = !enabled;
        }
      } else {
        // Update local state
        if (eventType === "incidents") {
          subscriber.incidents_enabled = enabled;
        } else if (eventType === "maintenances") {
          subscriber.maintenances_enabled = enabled;
        } else {
          subscriber.monitors_enabled = enabled;
        }
      }
    } catch (error) {
      toast.error("Failed to update subscription");
      // Revert
      if (eventType === "incidents") {
        subscriber.incidents_enabled = !enabled;
      } else if (eventType === "maintenances") {
        subscriber.maintenances_enabled = !enabled;
      } else {
        subscriber.monitors_enabled = !enabled;
      }
    } finally {
      updatingToggle[key] = false;
    }
  }

  // Add subscriber
  async function addSubscriber() {
    if (!newEmail.trim()) {
      addError = "Email is required";
      return;
    }

    addingSubscriber = true;
    addError = "";

    try {
      const res = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "adminAddSubscriber",
            data: {
              email: newEmail.trim(),
              incidents: newIncidents,
              maintenances: newMaintenances,
              monitors: newMonitors,
              incidentsMonitorTags: selectedIncidentMonitors,
              maintenancesMonitorTags: selectedMaintenanceMonitors,
              monitorsMonitorTags: selectedMonitorStatusMonitors
            }
          })
      });
      const result = await res.json();
      if (result.error) {
        addError = result.error;
      } else {
        showAddDialog = false;
        resetAddForm();
        toast.success("Subscriber added successfully");
        await fetchSubscribers();
      }
    } catch (error) {
      addError = "Failed to add subscriber";
    } finally {
      addingSubscriber = false;
    }
  }

  function resetAddForm() {
    newEmail = "";
    newIncidents = true;
    newMaintenances = true;
    newMonitors = true;
    selectedIncidentMonitors = [];
    selectedMaintenanceMonitors = [];
    selectedMonitorStatusMonitors = [];
    addError = "";
  }

  // Delete subscriber
  async function deleteSubscriber() {
    if (!deletingSubscriber) return;

    isDeleting = true;
    try {
      const res = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adminDeleteSubscriber",
          data: { methodId: deletingSubscriber.method_id }
        })
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        showDeleteDialog = false;
        deletingSubscriber = null;
        toast.success("Subscriber deleted");
        await fetchSubscribers();
      }
    } catch (error) {
      toast.error("Failed to delete subscriber");
    } finally {
      isDeleting = false;
    }
  }

  function confirmDelete(subscriber: Subscriber) {
    deletingSubscriber = subscriber;
    showDeleteDialog = true;
  }

  function goToPage(newPage: number) {
    page = newPage;
    fetchSubscribers();
  }

  function handleConfigChange() {
    saveConfig();
  }

  // Fetch available monitors
  async function fetchMonitors() {
    loadingMonitors = true;
    try {
      const res = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAvailableMonitors" })
      });
      monitors = await res.json();
    } catch (error) {
      console.error("Failed to load monitors", error);
    } finally {
      loadingMonitors = false;
    }
  }

  function toggleMonitorTag(selected: string[], tag: string): string[] {
    if (selected.includes(tag)) {
      return selected.filter((t) => t !== tag);
    }
    return [...selected, tag];
  }

  function monitorTagNames(tags: string[] | null): string {
    if (!tags || tags.length === 0) return "All monitors";
    return tags
      .map((tag) => monitors.find((m) => m.tag === tag)?.name || tag)
      .join(", ");
  }

  let filteredMonitors = $derived(
    monitors.filter((m) => m.name.toLowerCase().includes(monitorSearch.toLowerCase()) || m.tag.toLowerCase().includes(monitorSearch.toLowerCase()))
  );

  onMount(() => {
    fetchConfig();
    fetchSubscribers();
    fetchMonitors();
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Settings Card -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <Bell class="h-5 w-5" />
        Subscriptions Settings
      </Card.Title>
      <Card.Description>Configure subscription options for your status page</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if pageData.data.canSendEmail === false}
        <Alert.Root variant="destructive">
          <AlertCircleIcon />
          <Alert.Title>Email is not setup</Alert.Title>
          <Alert.Description>
            <p>
              Please visit the email set up documentation <a
                class="underline"
                href={clientResolver(resolve, "https://kener.ing/docs/v4/setup/email-setup")}>here</a
              >.
            </p>
          </Alert.Description>
        </Alert.Root>
      {/if}
      {#if loadingConfig}
        <div class="flex justify-center py-10">
          <Spinner />
        </div>
      {:else}
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <Label for="enable-subscriptions" class="mb-0">Enable Subscriptions</Label>
            <Switch
              id="enable-subscriptions"
              checked={config.enable}
              onCheckedChange={(e) => {
                config.enable = e;
                config.methods.emails.incidents = e;
                config.methods.emails.maintenances = e;
                config.methods.emails.monitors = e;
                handleConfigChange();
              }}
            />
          </div>

          {#if config.enable}
            <div class="space-y-4 border-l-2 pl-4">
              <p class="flex items-center gap-2 text-sm font-semibold">
                <Mail class="h-4 w-4" />
                Email Notifications
              </p>
              <div class="space-y-4 pl-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <AlertTriangle class="h-4 w-4 text-orange-500" />
                    <Label for="enable-email-incidents" class="mb-0">Incident Updates</Label>
                  </div>
                  <Switch
                    id="enable-email-incidents"
                    checked={config.methods.emails.incidents}
                    onCheckedChange={(e) => {
                      config.methods.emails.incidents = e;
                      handleConfigChange();
                    }}
                  />
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Wrench class="h-4 w-4 text-blue-500" />
                    <Label for="enable-email-maintenances" class="mb-0">Maintenance Updates</Label>
                  </div>
                  <Switch
                    id="enable-email-maintenances"
                    checked={config.methods.emails.maintenances}
                    onCheckedChange={(e) => {
                      config.methods.emails.maintenances = e;
                      handleConfigChange();
                    }}
                  />
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Activity class="h-4 w-4 text-green-500" />
                    <Label for="enable-email-monitors" class="mb-0">Monitor Status</Label>
                  </div>
                  <Switch
                    id="enable-email-monitors"
                    checked={config.methods.emails.monitors}
                    onCheckedChange={(e) => {
                      config.methods.emails.monitors = e;
                      handleConfigChange();
                    }}
                  />
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <!-- Subscribers Card -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center justify-between">
        <div>
          <Card.Title>Subscribers</Card.Title>
          <Card.Description>Manage email subscribers for notifications</Card.Description>
        </div>
        <div class="flex items-center gap-2">
          {#if loadingSubscribers}
            <Spinner class="size-5" />
          {/if}
          <Button onclick={() => (showAddDialog = true)}>
            <PlusIcon class="h-4 w-4" />
            Add Subscriber
          </Button>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="ktable rounded-xl border">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Email</Table.Head>
              <Table.Head class="text-center">
                <div class="flex items-center justify-center gap-1">
                  <AlertTriangle class="h-4 w-4 text-orange-500" />
                  Incidents
                </div>
              </Table.Head>
              <Table.Head class="text-center">
                <div class="flex items-center justify-center gap-1">
                  <Wrench class="h-4 w-4 text-blue-500" />
                  Maintenances
                </div>
              </Table.Head>
              <Table.Head class="text-center">
                <div class="flex items-center justify-center gap-1">
                  <Activity class="h-4 w-4 text-green-500" />
                  Monitors
                </div>
              </Table.Head>
              <Table.Head>Subscribed Monitors</Table.Head>
              <Table.Head>Subscribed At</Table.Head>
              <Table.Head class="w-20 text-center">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if loadingSubscribers && subscribers.length === 0}
              <Table.Row>
                <Table.Cell colspan={7} class="py-8 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <Spinner class="size-4" />
                    <span class="text-muted-foreground text-sm">Loading subscribers...</span>
                  </div>
                </Table.Cell>
              </Table.Row>
            {:else if subscribers.length === 0}
              <Table.Row>
                <Table.Cell colspan={7} class="text-muted-foreground py-8 text-center">
                  No subscribers yet. Add your first subscriber above.
                </Table.Cell>
              </Table.Row>
            {:else}
              {#each subscribers as subscriber (subscriber.method_id)}
                <Table.Row>
                  <Table.Cell class="font-medium">{subscriber.email}</Table.Cell>
                  <Table.Cell class="text-center">
                    <Switch
                      checked={subscriber.incidents_enabled}
                      disabled={updatingToggle[`${subscriber.method_id}-incidents`]}
                      onCheckedChange={(e) => toggleSubscription(subscriber, "incidents", e)}
                    />
                  </Table.Cell>
                  <Table.Cell class="text-center">
                    <Switch
                      checked={subscriber.maintenances_enabled}
                      disabled={updatingToggle[`${subscriber.method_id}-maintenances`]}
                      onCheckedChange={(e) => toggleSubscription(subscriber, "maintenances", e)}
                    />
                  </Table.Cell>
                  <Table.Cell class="text-center">
                    <Switch
                      checked={subscriber.monitors_enabled}
                      disabled={updatingToggle[`${subscriber.method_id}-monitors`]}
                      onCheckedChange={(e) => toggleSubscription(subscriber, "monitors", e)}
                    />
                  </Table.Cell>
                  <Table.Cell class="max-w-[200px]">
                    <span class="truncate block text-xs text-muted-foreground" title={monitorTagNames(subscriber.monitors_monitor_tags)}>
                      {monitorTagNames(subscriber.monitors_monitor_tags)}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    {format(new Date(subscriber.created_at), "MMM d, yyyy")}
                  </Table.Cell>
                  <Table.Cell class="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="text-destructive hover:bg-destructive/10 h-8 w-8"
                      onclick={() => confirmDelete(subscriber)}
                    >
                      <Trash2Icon class="h-4 w-4" />
                    </Button>
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
        <div class="mt-4 flex items-center justify-between">
          <span class="text-muted-foreground text-sm">Showing {startItem}-{endItem} of {total}</span>
          {#if totalPages > 1}
            <div class="flex items-center gap-2">
              <Button variant="outline" size="icon" disabled={page === 1} onclick={() => goToPage(page - 1)}>
                <ChevronLeftIcon class="size-4" />
              </Button>
              <div class="flex items-center gap-1">
                {#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum (pageNum)}
                  {#if pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)}
                    <Button
                      variant={pageNum === page ? "default" : "ghost"}
                      size="sm"
                      onclick={() => goToPage(pageNum)}
                    >
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
    </Card.Content>
  </Card.Root>
</div>

<!-- Add Subscriber Dialog -->
<Dialog.Root bind:open={showAddDialog}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Add Subscriber</Dialog.Title>
      <Dialog.Description>Add a new email subscriber for notifications</Dialog.Description>
    </Dialog.Header>
    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="new-email">Email Address</Label>
        <Input
          id="new-email"
          type="email"
          placeholder="subscriber@example.com"
          bind:value={newEmail}
          disabled={addingSubscriber}
        />
      </div>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <AlertTriangle class="h-4 w-4 text-orange-500" />
            <Label for="new-incidents" class="mb-0">Subscribe to Incidents</Label>
          </div>
          <Switch id="new-incidents" bind:checked={newIncidents} disabled={addingSubscriber} />
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Wrench class="h-4 w-4 text-blue-500" />
            <Label for="new-maintenances" class="mb-0">Subscribe to Maintenances</Label>
          </div>
          <Switch id="new-maintenances" bind:checked={newMaintenances} disabled={addingSubscriber} />
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Activity class="h-4 w-4 text-green-500" />
            <Label for="new-monitors" class="mb-0">Subscribe to Monitor Status</Label>
          </div>
          <Switch id="new-monitors" bind:checked={newMonitors} disabled={addingSubscriber} />
        </div>
      </div>

      <!-- Monitor selection -->
      {#if monitors.length > 0}
        <div class="space-y-3 pt-2">
          <Label class="text-sm font-medium">Select Monitors (leave empty for all)</Label>
          <Input
            type="text"
            placeholder="Search monitors..."
            bind:value={monitorSearch}
            disabled={addingSubscriber}
          />
          <div class="max-h-48 space-y-1 overflow-y-auto rounded border p-2">
            {#if filteredMonitors.length === 0}
              <p class="text-muted-foreground py-2 text-center text-sm">No monitors match your search</p>
            {:else}
              {#each filteredMonitors as monitor (monitor.tag)}
                <div class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="monitor-{monitor.tag}"
                    class="h-4 w-4 rounded border-gray-300"
                    checked={selectedIncidentMonitors.includes(monitor.tag)}
                    onchange={() => {
                      selectedIncidentMonitors = toggleMonitorTag(selectedIncidentMonitors, monitor.tag);
                      selectedMaintenanceMonitors = toggleMonitorTag(selectedMaintenanceMonitors, monitor.tag);
                      selectedMonitorStatusMonitors = toggleMonitorTag(selectedMonitorStatusMonitors, monitor.tag);
                    }}
                    disabled={addingSubscriber}
                  />
                  <Label for="monitor-{monitor.tag}" class="mb-0 text-sm">{monitor.name}</Label>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {:else if !loadingMonitors}
        <p class="text-muted-foreground text-sm">No monitors available</p>
      {/if}
      {#if loadingMonitors}
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner class="size-3" />
          Loading monitors...
        </div>
      {/if}
      {#if addError}
        <Alert.Root variant="destructive">
          <Alert.Description>{addError}</Alert.Description>
        </Alert.Root>
      {/if}
    </div>
    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => {
          showAddDialog = false;
          resetAddForm();
        }}
        disabled={addingSubscriber}
      >
        Cancel
      </Button>
      <Button onclick={addSubscriber} disabled={addingSubscriber}>
        {#if addingSubscriber}
          <Spinner class="size-4" />
          Adding...
        {:else}
          Add Subscriber
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete Subscriber</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete this subscriber? This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    {#if deletingSubscriber}
      <div class="py-4">
        <p class="text-sm">
          <span class="text-muted-foreground">Email:</span>
          <span class="font-medium">{deletingSubscriber.email}</span>
        </p>
      </div>
    {/if}
    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => {
          showDeleteDialog = false;
          deletingSubscriber = null;
        }}
        disabled={isDeleting}
      >
        Cancel
      </Button>
      <Button variant="destructive" onclick={deleteSubscriber} disabled={isDeleting}>
        {#if isDeleting}
          <Spinner class="size-4" />
          Deleting...
        {:else}
          Delete
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
