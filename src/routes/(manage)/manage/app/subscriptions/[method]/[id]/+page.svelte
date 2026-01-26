<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import MailIcon from "@lucide/svelte/icons/mail";
  import WebhookIcon from "@lucide/svelte/icons/webhook";
  import HashIcon from "@lucide/svelte/icons/hash";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import WrenchIcon from "@lucide/svelte/icons/wrench";
  import ActivityIcon from "@lucide/svelte/icons/activity";
  import UserIcon from "@lucide/svelte/icons/user";
  import { toast } from "svelte-sonner";
  import { format } from "date-fns";

  interface PageData {
    method: "email" | "webhook" | "slack" | "discord";
    subscriberId: number;
  }

  interface SubscriberRecord {
    id: number;
    subscriber_send: string;
    subscriber_meta: string | null;
    subscriber_type: string;
    subscriber_status: string;
    created_at: string;
    updated_at: string;
  }

  interface UserSubscriptionRecord {
    id: number;
    subscriber_id: number;
    subscription_method: string;
    event_type: string;
    entity_type: string | null;
    entity_id: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }

  let { data }: { data: PageData } = $props();

  // State
  let loading = $state(true);
  let subscriber = $state<SubscriberRecord | null>(null);
  let subscriptions = $state<UserSubscriptionRecord[]>([]);
  let deleteDialogOpen = $state(false);
  let subscriptionToDelete = $state<UserSubscriptionRecord | null>(null);
  let deleting = $state(false);

  const methodLabels: Record<string, string> = {
    email: "Email",
    webhook: "Webhook",
    slack: "Slack",
    discord: "Discord"
  };

  const eventLabels: Record<string, string> = {
    incidentUpdatesAll: "Incident Updates",
    maintenanceUpdatesAll: "Maintenance Updates",
    monitorUpdatesAll: "Monitor Updates"
  };

  const entityLabels: Record<string, string> = {
    monitor: "Monitor",
    incident: "Incident",
    maintenance: "Maintenance"
  };

  function getMethodIcon(method: string) {
    switch (method) {
      case "email":
        return MailIcon;
      case "webhook":
        return WebhookIcon;
      case "slack":
        return HashIcon;
      case "discord":
        return MessageSquareIcon;
      default:
        return MailIcon;
    }
  }

  function getEventIcon(eventType: string) {
    switch (eventType) {
      case "incidentUpdatesAll":
        return AlertCircleIcon;
      case "maintenanceUpdatesAll":
        return WrenchIcon;
      case "monitorUpdatesAll":
        return ActivityIcon;
      default:
        return AlertCircleIcon;
    }
  }

  function getEventColorClass(eventType: string): string {
    switch (eventType) {
      case "incidentUpdatesAll":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
      case "maintenanceUpdatesAll":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30";
      case "monitorUpdatesAll":
        return "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30";
    }
  }

  async function loadSubscriberWithSubscriptions() {
    loading = true;
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getSubscriberWithSubscriptions",
          data: { subscriberId: data.subscriberId, method: data.method }
        })
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        subscriber = result.subscriber;
        subscriptions = result.subscriptions;
      }
    } catch (error) {
      console.error("Error loading subscriber:", error);
      toast.error("Failed to load subscriber details");
    } finally {
      loading = false;
    }
  }

  function openDeleteDialog(subscription: UserSubscriptionRecord) {
    subscriptionToDelete = subscription;
    deleteDialogOpen = true;
  }

  async function deleteSubscription() {
    if (!subscriptionToDelete) return;

    deleting = true;
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteUserSubscription",
          data: { subscriptionId: subscriptionToDelete.id }
        })
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subscription deleted successfully");
        subscriptions = subscriptions.filter((s) => s.id !== subscriptionToDelete?.id);
        deleteDialogOpen = false;
        subscriptionToDelete = null;
      }
    } catch (error) {
      console.error("Error deleting subscription:", error);
      toast.error("Failed to delete subscription");
    } finally {
      deleting = false;
    }
  }

  // Initial load
  $effect(() => {
    loadSubscriberWithSubscriptions();
  });

  // Derived
  let MethodIcon = $derived(getMethodIcon(data.method));

  // Group subscriptions by event type
  let subscriptionsByEvent = $derived(() => {
    const grouped: Record<string, UserSubscriptionRecord[]> = {};
    for (const sub of subscriptions) {
      if (!grouped[sub.event_type]) {
        grouped[sub.event_type] = [];
      }
      grouped[sub.event_type].push(sub);
    }
    return grouped;
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <a href="/manage/app/subscriptions/{data.method}" class="hover:bg-muted rounded-lg p-2 transition-colors">
      <ChevronLeftIcon class="size-5" />
    </a>
    <div class="flex items-center gap-3">
      <div class="bg-primary/10 rounded-lg p-2">
        <MethodIcon class="text-primary size-6" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">Subscriber Details</h1>
        <p class="text-muted-foreground text-sm">
          {methodLabels[data.method]} subscriber #{data.subscriberId}
        </p>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="flex h-96 items-center justify-center">
      <Spinner class="size-8" />
    </div>
  {:else if !subscriber}
    <Alert.Root variant="destructive">
      <Alert.Title>Subscriber Not Found</Alert.Title>
      <Alert.Description>The subscriber you're looking for doesn't exist or has been deleted.</Alert.Description>
    </Alert.Root>
  {:else}
    <!-- Subscriber Info Card -->
    <Card.Root>
      <Card.Header>
        <div class="flex items-center gap-4">
          <div class="bg-primary/10 rounded-full p-3">
            <UserIcon class="text-primary size-6" />
          </div>
          <div class="flex-1">
            <Card.Title class="flex items-center gap-2">
              {subscriber.subscriber_send}
              <Badge variant={subscriber.subscriber_status === "ACTIVE" ? "default" : "secondary"}>
                {subscriber.subscriber_status}
              </Badge>
            </Card.Title>
            <Card.Description>
              {#if subscriber.subscriber_meta}
                User: {subscriber.subscriber_meta} •
              {/if}
              Subscribed on {format(new Date(subscriber.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </Card.Description>
          </div>
        </div>
      </Card.Header>
      <Card.Content>
        <div class="grid gap-4 md:grid-cols-3">
          <div>
            <span class="text-muted-foreground text-sm">Method</span>
            <div class="flex items-center gap-2 font-medium">
              <MethodIcon class="text-primary size-4" />
              {methodLabels[data.method]}
            </div>
          </div>
          <div>
            <span class="text-muted-foreground text-sm">Total Subscriptions</span>
            <div class="font-medium">{subscriptions.length}</div>
          </div>
          <div>
            <span class="text-muted-foreground text-sm">Type</span>
            <div class="font-medium">{subscriber.subscriber_type}</div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <!-- Subscriptions by Event Type -->
    <div class="space-y-4">
      <h2 class="text-lg font-semibold">Subscriptions</h2>

      {#if subscriptions.length === 0}
        <Card.Root>
          <Card.Content class="flex flex-col items-center justify-center py-12">
            <ActivityIcon class="text-muted-foreground mb-4 size-12" />
            <h3 class="mb-2 text-lg font-medium">No Active Subscriptions</h3>
            <p class="text-muted-foreground text-center text-sm">
              This subscriber doesn't have any active subscriptions via {methodLabels[data.method].toLowerCase()}.
            </p>
          </Card.Content>
        </Card.Root>
      {:else}
        {#each Object.entries(subscriptionsByEvent()) as [eventType, subs]}
          {@const EventIcon = getEventIcon(eventType)}
          <Card.Root>
            <Card.Header class="pb-3">
              <div class="flex items-center gap-3">
                <div class="rounded-lg p-2 {getEventColorClass(eventType)}">
                  <EventIcon class="size-5" />
                </div>
                <div>
                  <Card.Title class="text-base">{eventLabels[eventType] || eventType}</Card.Title>
                  <Card.Description>
                    {subs.length} subscription{subs.length !== 1 ? "s" : ""}
                  </Card.Description>
                </div>
              </div>
            </Card.Header>
            <Card.Content class="pt-0">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>Scope</Table.Head>
                    <Table.Head>Entity ID</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head>Subscribed</Table.Head>
                    <Table.Head></Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each subs as sub}
                    <Table.Row>
                      <Table.Cell>
                        {#if sub.entity_type}
                          <Badge variant="outline">
                            {entityLabels[sub.entity_type] || sub.entity_type}
                          </Badge>
                        {:else}
                          <Badge variant="secondary">All</Badge>
                        {/if}
                      </Table.Cell>
                      <Table.Cell>
                        {#if sub.entity_id}
                          <code class="bg-muted rounded px-2 py-1 text-sm">{sub.entity_id}</code>
                        {:else}
                          <span class="text-muted-foreground">—</span>
                        {/if}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge variant={sub.status === "ACTIVE" ? "default" : "secondary"}>
                          {sub.status}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <span class="text-muted-foreground text-sm">
                          {format(new Date(sub.created_at), "MMM d, yyyy")}
                        </span>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onclick={() => openDeleteDialog(sub)}
                        >
                          <TrashIcon class="size-4" />
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </Card.Content>
          </Card.Root>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Delete Subscription</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete this subscription? The subscriber will no longer receive notifications for this
        event.
      </Dialog.Description>
    </Dialog.Header>
    {#if subscriptionToDelete}
      <div class="bg-muted rounded-lg p-4">
        <div class="grid gap-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Event:</span>
            <span class="font-medium"
              >{eventLabels[subscriptionToDelete.event_type] || subscriptionToDelete.event_type}</span
            >
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Scope:</span>
            <span class="font-medium">
              {subscriptionToDelete.entity_type
                ? `${entityLabels[subscriptionToDelete.entity_type] || subscriptionToDelete.entity_type}: ${subscriptionToDelete.entity_id}`
                : "All"}
            </span>
          </div>
        </div>
      </div>
    {/if}
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
      <Button variant="destructive" onclick={deleteSubscription} disabled={deleting}>
        {#if deleting}
          <Spinner class="mr-2 size-4" />
        {/if}
        Delete Subscription
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
