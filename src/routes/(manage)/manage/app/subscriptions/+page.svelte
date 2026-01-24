<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import GMI from "$lib/components/gmi.svelte";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import MailIcon from "@lucide/svelte/icons/mail";
  import UsersIcon from "@lucide/svelte/icons/users";
  import { toast } from "svelte-sonner";
  import { format } from "date-fns";

  // Types
  interface SubscriptionTriggerConfig {
    createIncident: boolean;
    updateIncident: boolean;
    insertIncidentMonitor: boolean;
    updateIncidentComment: boolean;
    insertIncidentComment: boolean;
    maintenanceToStart: boolean;
    maintenanceHasStarted: boolean;
    maintenanceHasEnded: boolean;
    maintenanceMonitorUpdated: boolean;
  }

  interface SubscriptionTrigger {
    id: number | null;
    subscription_trigger_status: string;
    subscription_trigger_type: string;
    config: SubscriptionTriggerConfig;
  }

  interface Subscriber {
    id: number;
    email: string;
    status: string;
  }

  interface Monitor {
    name: string;
    tag: string;
    image: string | null;
  }

  interface Subscription {
    id: number;
    subscriber_id: number;
    subscriptions_status: string;
    subscriptions_monitors: string;
    created_at: string;
    subscriber?: Subscriber;
    monitor?: Monitor;
  }

  interface PageData {
    canSendEmail: boolean;
  }

  let { data }: { data: PageData } = $props();

  // State
  let pageLoading = $state(true);
  let subscriberListLoading = $state(false);
  let page = $state(1);
  let limit = $state(25);
  let total = $state(0);
  let totalPages = $state(0);
  let subscribers = $state<Subscription[]>([]);

  let subscriptionTrigger = $state<SubscriptionTrigger>({
    id: null,
    subscription_trigger_status: "INACTIVE",
    subscription_trigger_type: "email",
    config: {
      createIncident: false,
      updateIncident: false,
      insertIncidentMonitor: false,
      updateIncidentComment: false,
      insertIncidentComment: false,
      maintenanceToStart: false,
      maintenanceHasStarted: false,
      maintenanceHasEnded: false,
      maintenanceMonitorUpdated: false
    }
  });

  // API functions
  async function loadSubscriptionTrigger() {
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getSubscriptionTrigger" })
      });
      const result = await res.json();
      if (result && !result.error) {
        if (result.config && typeof result.config === "string") {
          result.config = JSON.parse(result.config);
        }
        subscriptionTrigger = result;
      }
    } catch (error) {
      console.error("Error fetching subscription trigger:", error);
    }
  }

  async function saveSubscriptionTrigger() {
    try {
      await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createSubscriptionTrigger",
          data: {
            subscription_trigger_type: "email",
            subscription_trigger_status: subscriptionTrigger.subscription_trigger_status,
            config: JSON.stringify(subscriptionTrigger.config)
          }
        })
      });
    } catch (error) {
      console.error("Error saving subscription trigger:", error);
      toast.error("Failed to save settings");
    }
  }

  async function loadSubscribers() {
    subscriberListLoading = true;
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getSubscribers",
          data: { page, limit }
        })
      });
      const result = await res.json();
      if (!result.error) {
        subscribers = result.subscriptions || [];
        total = result.total || 0;
        totalPages = Math.ceil(total / limit);
      }
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast.error("Error loading subscribers");
      subscribers = [];
      total = 0;
    } finally {
      subscriberListLoading = false;
    }
  }

  async function updateSubscriptionStatus(id: number, status: string) {
    try {
      await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSubscriptionStatus",
          data: { id, status }
        })
      });
    } catch (error) {
      console.error("Error updating subscription status:", error);
      toast.error("Failed to update subscription status");
    }
  }

  async function updateSubscriptionTriggerStatus(id: number, status: string) {
    try {
      await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateSubscriptionTriggerStatus",
          data: { id, status }
        })
      });
    } catch (error) {
      console.error("Error updating trigger status:", error);
      toast.error("Failed to update trigger status");
    }
  }

  async function handleTriggerActiveToggle(checked: boolean) {
    const newStatus = checked ? "ACTIVE" : "INACTIVE";
    if (subscriptionTrigger.id) {
      subscriptionTrigger.subscription_trigger_status = newStatus;
      await updateSubscriptionTriggerStatus(subscriptionTrigger.id, newStatus);
    } else {
      await saveSubscriptionTrigger();
      pageLoading = true;
      await loadSubscriptionTrigger();
      await loadSubscribers();
      pageLoading = false;
    }
  }

  async function handleConfigChange(key: keyof SubscriptionTriggerConfig, checked: boolean) {
    subscriptionTrigger.config[key] = checked;
    await saveSubscriptionTrigger();
  }

  function handlePageChange(newPage: number) {
    page = newPage;
    loadSubscribers();
  }

  function formatDate(dateStr: string): string {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy HH:mm");
    } catch {
      return dateStr;
    }
  }

  // Initial load
  $effect(() => {
    (async () => {
      await loadSubscriptionTrigger();
      await loadSubscribers();
      pageLoading = false;
    })();
  });

  // Derived state
  let canSendEmail = $derived(data.canSendEmail);
  let isActive = $derived(subscriptionTrigger.subscription_trigger_status === "ACTIVE");
  let isDisabled = $derived(!canSendEmail || !isActive);
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Events Subscription Card -->
  <Card.Root>
    <Card.Header class="flex flex-row items-center justify-between">
      <div class="flex items-center gap-2">
        <MailIcon class="h-5 w-5" />
        <div>
          <Card.Title>Events Subscription</Card.Title>
          <Card.Description>Configure and view who have subscribed to updates for your status page.</Card.Description>
        </div>
      </div>
      {#if pageLoading}
        <Spinner class="size-5" />
      {:else if canSendEmail}
        <div class="flex items-center gap-2">
          <Label class="text-sm font-medium">
            {isActive ? "Active" : "Inactive"}
          </Label>
          <Switch checked={isActive} disabled={!canSendEmail} onCheckedChange={handleTriggerActiveToggle} />
        </div>
      {/if}
    </Card.Header>
    <Card.Content class="space-y-4">
      {#if !canSendEmail}
        <Alert.Root variant="destructive">
          <Alert.Description>
            You have not configured your email settings yet. Please configure your email settings to send updates to
            your subscribers. You can read the documentation by visiting
            <a
              href="https://kener.ing/docs/environment-vars#smtp"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 underline"
            >
              here <ExternalLinkIcon class="h-3 w-3" />
            </a>. You will either have to set up SMTP or use Resend.
          </Alert.Description>
        </Alert.Root>
      {/if}

      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Create Incident -->
        <div class="space-y-2 rounded-lg border p-4">
          <div class="flex items-center gap-2">
            <Checkbox
              checked={subscriptionTrigger.config.createIncident}
              disabled={isDisabled}
              onCheckedChange={(checked) => handleConfigChange("createIncident", !!checked)}
            />
            <Label class="font-medium">Incident Triggered</Label>
          </div>
          <p class="text-muted-foreground pl-6 text-xs">Send notification when a new incident is created.</p>
        </div>

        <!-- Update Incident -->
        <div class="space-y-2 rounded-lg border p-4">
          <div class="flex items-center gap-2">
            <Checkbox
              checked={subscriptionTrigger.config.updateIncident}
              disabled={isDisabled}
              onCheckedChange={(checked) => handleConfigChange("updateIncident", !!checked)}
            />
            <Label class="font-medium">Incident Updated</Label>
          </div>
          <p class="text-muted-foreground pl-6 text-xs">Send notification when an incident is updated.</p>
        </div>

        <!-- Insert Incident Monitor -->
        <div class="space-y-2 rounded-lg border p-4">
          <div class="flex items-center gap-2">
            <Checkbox
              checked={subscriptionTrigger.config.insertIncidentMonitor}
              disabled={isDisabled}
              onCheckedChange={(checked) => handleConfigChange("insertIncidentMonitor", !!checked)}
            />
            <Label class="font-medium">Update Monitor in Incident</Label>
          </div>
          <p class="text-muted-foreground pl-6 text-xs">
            Send notification when a new monitor is added to an incident.
          </p>
        </div>

        <!-- Update Incident Comment -->
        <div class="space-y-2 rounded-lg border p-4">
          <div class="flex items-center gap-2">
            <Checkbox
              checked={subscriptionTrigger.config.updateIncidentComment}
              disabled={isDisabled}
              onCheckedChange={(checked) => handleConfigChange("updateIncidentComment", !!checked)}
            />
            <Label class="font-medium">Update Incident Comment</Label>
          </div>
          <p class="text-muted-foreground pl-6 text-xs">Send notification when an incident comment is updated.</p>
        </div>

        <!-- Insert Incident Comment -->
        <div class="space-y-2 rounded-lg border p-4">
          <div class="flex items-center gap-2">
            <Checkbox
              checked={subscriptionTrigger.config.insertIncidentComment}
              disabled={isDisabled}
              onCheckedChange={(checked) => handleConfigChange("insertIncidentComment", !!checked)}
            />
            <Label class="font-medium">Insert Incident Comment</Label>
          </div>
          <p class="text-muted-foreground pl-6 text-xs">
            Send notification when a new comment is added to an incident.
          </p>
        </div>
        <!-- Maintenance To Start -->
        <div class="space-y-2 rounded-lg border p-4">
          <div class="flex items-center gap-2">
            <Checkbox
              checked={subscriptionTrigger.config.maintenanceToStart}
              disabled={isDisabled}
              onCheckedChange={(checked) => handleConfigChange("maintenanceToStart", !!checked)}
            />
            <Label class="font-medium">Maintenance To Start</Label>
          </div>
          <p class="text-muted-foreground pl-6 text-xs">Send notification when a maintenance is about to start.</p>
        </div>
        <!-- Maintenance Has Started -->
        <div class="space-y-2 rounded-lg border p-4">
          <div class="flex items-center gap-2">
            <Checkbox
              checked={subscriptionTrigger.config.maintenanceHasStarted}
              disabled={isDisabled}
              onCheckedChange={(checked) => handleConfigChange("maintenanceHasStarted", !!checked)}
            />
            <Label class="font-medium">Maintenance Has Started</Label>
          </div>
          <p class="text-muted-foreground pl-6 text-xs">Send notification when a maintenance has started.</p>
        </div>
        <!-- Maintenance Has Ended -->
        <div class="space-y-2 rounded-lg border p-4">
          <div class="flex items-center gap-2">
            <Checkbox
              checked={subscriptionTrigger.config.maintenanceHasEnded}
              disabled={isDisabled}
              onCheckedChange={(checked) => handleConfigChange("maintenanceHasEnded", !!checked)}
            />
            <Label class="font-medium">Maintenance Has Ended</Label>
          </div>
          <p class="text-muted-foreground pl-6 text-xs">Send notification when a maintenance has ended.</p>
        </div>
        <!-- Maintenance Monitor Updated -->
        <div class="space-y-2 rounded-lg border p-4">
          <div class="flex items-center gap-2">
            <Checkbox
              checked={subscriptionTrigger.config.maintenanceMonitorUpdated}
              disabled={isDisabled}
              onCheckedChange={(checked) => handleConfigChange("maintenanceMonitorUpdated", !!checked)}
            />
            <Label class="font-medium">Maintenance Monitor Updated</Label>
          </div>
          <p class="text-muted-foreground pl-6 text-xs">
            Send notification when a monitor is added or removed from a maintenance.
          </p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Site Subscribers Card -->
  <Card.Root>
    <Card.Header>
      <div class="flex items-center gap-2">
        <UsersIcon class="h-5 w-5" />
        <div>
          <Card.Title>Site Subscribers</Card.Title>
          <Card.Description>
            View and manage subscribers who have signed up for updates on your status page.
          </Card.Description>
        </div>
      </div>
    </Card.Header>
    <Card.Content>
      <div class="ktable rounded-xl border">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Email</Table.Head>
              <Table.Head>Subscribed Monitors</Table.Head>
              <Table.Head class="text-center">Subscribed At</Table.Head>
              <Table.Head class="w-32">
                <div class="flex items-center gap-2">
                  <span>Status</span>
                  {#if totalPages > 1}
                    <Select.Root
                      type="single"
                      value={String(page)}
                      onValueChange={(v) => v && handlePageChange(Number(v))}
                    >
                      <Select.Trigger class="h-7 w-20 px-2 text-xs">
                        Page {page}
                      </Select.Trigger>
                      <Select.Content>
                        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as pageNum}
                          <Select.Item value={String(pageNum)} class="text-xs">
                            Page {pageNum}
                          </Select.Item>
                        {/each}
                      </Select.Content>
                    </Select.Root>
                  {/if}
                </div>
              </Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if subscriberListLoading}
              <Table.Row>
                <Table.Cell colspan={4} class="py-8 text-center">
                  <div class="flex items-center justify-center gap-2">
                    <Spinner class="size-4" />
                    <span class="text-muted-foreground text-sm">Loading subscribers...</span>
                  </div>
                </Table.Cell>
              </Table.Row>
            {:else if subscribers.length === 0}
              <Table.Row>
                <Table.Cell colspan={4} class="text-muted-foreground py-8 text-center">
                  No subscribers found.
                </Table.Cell>
              </Table.Row>
            {:else}
              {#each subscribers as subscription}
                <Table.Row>
                  <Table.Cell class="font-medium">
                    {subscription.subscriber?.email || "Unknown"}
                  </Table.Cell>
                  <Table.Cell>
                    {#if subscription.monitor?.name}
                      <div class="flex items-center gap-2">
                        {#if subscription.monitor.image}
                          <GMI src={subscription.monitor.image} alt="" classList="h-4" />
                        {/if}
                        <span class="text-sm font-medium">{subscription.monitor.name}</span>
                      </div>
                    {:else}
                      <Badge variant="secondary" class="text-xs">All Monitors</Badge>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="text-center text-xs">
                    {formatDate(subscription.created_at)}
                  </Table.Cell>
                  <Table.Cell>
                    <div class="flex items-center justify-end gap-2">
                      <Label class="text-xs">
                        {subscription.subscriptions_status === "ACTIVE" ? "Active" : "Inactive"}
                      </Label>
                      <Switch
                        checked={subscription.subscriptions_status === "ACTIVE"}
                        disabled={isDisabled}
                        onCheckedChange={(checked) => {
                          subscription.subscriptions_status = checked ? "ACTIVE" : "INACTIVE";
                          updateSubscriptionStatus(subscription.id, subscription.subscriptions_status);
                        }}
                      />
                    </div>
                  </Table.Cell>
                </Table.Row>
              {/each}
            {/if}
          </Table.Body>
        </Table.Root>
      </div>
      {#if total > 0}
        <p class="text-muted-foreground mt-4 text-center text-xs">
          Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} subscribers
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
