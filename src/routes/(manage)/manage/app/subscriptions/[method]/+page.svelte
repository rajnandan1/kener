<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import MailIcon from "@lucide/svelte/icons/mail";
  import WebhookIcon from "@lucide/svelte/icons/webhook";
  import HashIcon from "@lucide/svelte/icons/hash";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import UsersIcon from "@lucide/svelte/icons/users";
  import { toast } from "svelte-sonner";
  import { format } from "date-fns";

  interface PageData {
    method: "email" | "webhook" | "slack" | "discord";
  }

  interface SubscriberSummary {
    id: number;
    subscriber_send: string;
    subscriber_type: string;
    subscriber_status: string;
    created_at: string;
    subscription_count: number;
    event_types: string[];
  }

  let { data }: { data: PageData } = $props();

  // State
  let loading = $state(true);
  let subscribers = $state<SubscriberSummary[]>([]);
  let page = $state(1);
  let limit = $state(25);
  let total = $state(0);
  let totalPages = $state(0);

  const methodLabels: Record<string, string> = {
    email: "Email",
    webhook: "Webhook",
    slack: "Slack",
    discord: "Discord"
  };

  const eventLabels: Record<string, string> = {
    incidentUpdatesAll: "Incidents",
    maintenanceUpdatesAll: "Maintenance",
    monitorUpdatesAll: "Monitors"
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

  async function loadSubscribers() {
    loading = true;
    try {
      const res = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getSubscribersByMethod",
          data: { method: data.method, page, limit }
        })
      });
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        subscribers = result.subscribers;
        total = result.total;
        totalPages = result.totalPages;
      }
    } catch (error) {
      console.error("Error loading subscribers:", error);
      toast.error("Failed to load subscribers");
    } finally {
      loading = false;
    }
  }

  function handlePageChange(newPage: number) {
    page = newPage;
    loadSubscribers();
  }

  // Initial load
  $effect(() => {
    loadSubscribers();
  });

  // Derived
  let MethodIcon = $derived(getMethodIcon(data.method));
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center gap-4">
    <a href="/manage/app/subscriptions" class="hover:bg-muted rounded-lg p-2 transition-colors">
      <ChevronLeftIcon class="size-5" />
    </a>
    <div class="flex items-center gap-3">
      <div class="bg-primary/10 rounded-lg p-2">
        <MethodIcon class="text-primary size-6" />
      </div>
      <div>
        <h1 class="text-2xl font-bold">{methodLabels[data.method]} Subscribers</h1>
        <p class="text-muted-foreground text-sm">
          {total} subscriber{total !== 1 ? "s" : ""} using {methodLabels[data.method].toLowerCase()} notifications
        </p>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="flex h-96 items-center justify-center">
      <Spinner class="size-8" />
    </div>
  {:else if subscribers.length === 0}
    <Card.Root>
      <Card.Content class="flex flex-col items-center justify-center py-12">
        <UsersIcon class="text-muted-foreground mb-4 size-12" />
        <h3 class="mb-2 text-lg font-medium">No {methodLabels[data.method]} Subscribers</h3>
        <p class="text-muted-foreground mb-4 text-center text-sm">
          No users have subscribed via {methodLabels[data.method].toLowerCase()} yet.
        </p>
        <a href="/manage/app/subscriptions">
          <Button variant="outline">
            <ChevronLeftIcon class="mr-2 size-4" />
            Back to Subscriptions
          </Button>
        </a>
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root>
      <Card.Content class="p-0">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Subscriber</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Subscribed Events</Table.Head>
              <Table.Head>Subscriptions</Table.Head>
              <Table.Head>Joined</Table.Head>
              <Table.Head></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each subscribers as subscriber}
              <Table.Row>
                <Table.Cell>
                  <div class="flex items-center gap-2">
                    <div class="bg-primary/10 rounded p-1.5">
                      <MethodIcon class="text-primary size-4" />
                    </div>
                    <span class="max-w-[200px] truncate font-medium" title={subscriber.subscriber_send}>
                      {subscriber.subscriber_send}
                    </span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant={subscriber.subscriber_status === "ACTIVE" ? "default" : "secondary"}>
                    {subscriber.subscriber_status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <div class="flex flex-wrap gap-1">
                    {#each subscriber.event_types as eventType}
                      <Badge variant="outline" class="text-xs">
                        {eventLabels[eventType] || eventType}
                      </Badge>
                    {/each}
                    {#if subscriber.event_types.length === 0}
                      <span class="text-muted-foreground text-sm">None</span>
                    {/if}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span class="font-medium">{subscriber.subscription_count}</span>
                </Table.Cell>
                <Table.Cell>
                  <span class="text-muted-foreground text-sm">
                    {format(new Date(subscriber.created_at), "MMM d, yyyy")}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <a href="/manage/app/subscriptions/{data.method}/{subscriber.id}">
                    <Button variant="ghost" size="sm">
                      View
                      <ChevronRightIcon class="ml-1 size-4" />
                    </Button>
                  </a>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onclick={() => handlePageChange(page - 1)}>
          <ChevronLeftIcon class="mr-1 size-4" />
          Previous
        </Button>
        <span class="text-muted-foreground text-sm">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onclick={() => handlePageChange(page + 1)}>
          Next
          <ChevronRightIcon class="ml-1 size-4" />
        </Button>
      </div>
    {/if}
  {/if}
</div>
