<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import ZapIcon from "@lucide/svelte/icons/zap";
  import WebhookIcon from "@lucide/svelte/icons/webhook";
  import MailIcon from "@lucide/svelte/icons/mail";
  import CheckIcon from "@lucide/svelte/icons/check";
  import XIcon from "@lucide/svelte/icons/x";
  import Loader from "@lucide/svelte/icons/loader";
  import { toast } from "svelte-sonner";
  import { goto } from "$app/navigation";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  // Types
  interface Trigger {
    id: number;
    name: string;
    trigger_type: string;
    trigger_desc: string;
    trigger_status: string;
    trigger_meta: string;
    created_at: string;
    updated_at: string;
    testLoaders?: "idle" | "loading" | "success" | "error";
  }

  // State
  let loading = $state(true);
  let triggers = $state<Trigger[]>([]);
  let totalPages = $state(0);
  let totalCount = $state(0);
  let pageNo = $state(1);
  let statusFilter = $state("ACTIVE");
  const limit = 10;

  // Fetch triggers
  async function fetchData() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getTriggers",
          data: { status: statusFilter === "ALL" ? undefined : statusFilter }
        })
      });
      const result = await response.json();
      if (!result.error) {
        triggers = result.map((t: Trigger) => ({ ...t, testLoaders: "idle" }));
        totalCount = triggers.length;
        totalPages = Math.ceil(totalCount / limit);
      }
    } catch (error) {
      console.error("Error fetching triggers:", error);
      toast.error("Failed to load triggers");
    } finally {
      loading = false;
    }
  }

  function handleStatusChange(value: string | undefined) {
    if (value) {
      statusFilter = value;
      pageNo = 1;
      fetchData();
    }
  }

  function goToPage(page: number) {
    pageNo = page;
  }

  function getTriggerIcon(type: string) {
    switch (type) {
      case "webhook":
        return WebhookIcon;
      case "email":
        return MailIcon;
      case "slack":
      case "discord":
        return ZapIcon;
      default:
        return ZapIcon;
    }
  }

  // Paginated triggers
  const paginatedTriggers = $derived(triggers.slice((pageNo - 1) * limit, pageNo * limit));

  $effect(() => {
    fetchData();
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <ZapIcon class="text-muted-foreground size-6" />
      <div>
        <h1 class="text-2xl font-bold">Triggers</h1>
        <p class="text-muted-foreground text-sm">Configure notification triggers for alerts</p>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
        <Select.Trigger class="w-36">
          {statusFilter === "ALL" ? "All Status" : statusFilter}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ALL">All Status</Select.Item>
          <Select.Item value="ACTIVE">Active</Select.Item>
          <Select.Item value="INACTIVE">Inactive</Select.Item>
        </Select.Content>
      </Select.Root>
      {#if loading}
        <Spinner class="size-5" />
      {/if}
      <Button onclick={() => goto(clientResolver(resolve, "/manage/app/triggers/new"))}>
        <PlusIcon class="mr-2 size-4" />
        New Trigger
      </Button>
    </div>
  </div>

  <!-- Triggers List -->
  <div class="grid gap-4">
    {#if paginatedTriggers.length === 0 && !loading}
      <Card.Root>
        <Card.Content class="text-muted-foreground py-8 text-center">No triggers found</Card.Content>
      </Card.Root>
    {:else}
      {#each paginatedTriggers as trigger, index}
        {@const TriggerIcon = getTriggerIcon(trigger.trigger_type)}
        <Card.Root class="hover:bg-muted/30 transition-colors">
          <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
            <div class="flex items-center gap-3">
              <div class="bg-muted flex size-10 items-center justify-center rounded-lg">
                <TriggerIcon class="size-5" />
              </div>
              <div>
                <Card.Title class="text-base">{trigger.name}</Card.Title>
                {#if trigger.trigger_desc}
                  <p class="text-muted-foreground text-sm">{trigger.trigger_desc}</p>
                {/if}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant={trigger.trigger_status === "ACTIVE" ? "default" : "secondary"}>
                {trigger.trigger_status}
              </Badge>
              <Badge variant="outline" class="capitalize">{trigger.trigger_type}</Badge>

              <Button
                variant="ghost"
                size="icon"
                onclick={() => goto(clientResolver(resolve, `/manage/app/triggers/${trigger.id}`))}
              >
                <ArrowRight class="size-4" />
              </Button>
            </div>
          </Card.Header>
        </Card.Root>
      {/each}
    {/if}
  </div>

  <!-- Pagination -->
  {#if totalCount > limit}
    {@const startItem = (pageNo - 1) * limit + 1}
    {@const endItem = Math.min(pageNo * limit, totalCount)}
    <div class="flex items-center justify-between">
      <span class="text-muted-foreground text-sm">Showing {startItem}-{endItem} of {totalCount}</span>
      {#if totalPages > 1}
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={pageNo === 1} onclick={() => goToPage(pageNo - 1)}>
            <ChevronLeftIcon class="size-4" />
          </Button>
          <div class="flex items-center gap-1">
            {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
              {#if page === 1 || page === totalPages || (page >= pageNo - 1 && page <= pageNo + 1)}
                <Button variant={page === pageNo ? "default" : "ghost"} size="sm" onclick={() => goToPage(page)}>
                  {page}
                </Button>
              {:else if page === pageNo - 2 || page === pageNo + 2}
                <span class="text-muted-foreground px-1">...</span>
              {/if}
            {/each}
          </div>
          <Button variant="outline" size="icon" disabled={pageNo === totalPages} onclick={() => goToPage(pageNo + 1)}>
            <ChevronRightIcon class="size-4" />
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</div>
