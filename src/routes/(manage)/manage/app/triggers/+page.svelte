<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import { toast } from "svelte-sonner";
  import { onMount } from "svelte";
  import SettingsIcon from "@lucide/svelte/icons/settings";
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

  // Paginated triggers
  const paginatedTriggers = $derived(triggers.slice((pageNo - 1) * limit, pageNo * limit));

  onMount(() => {
    fetchData();
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
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
    </div>
    <Button href={clientResolver(resolve, "/manage/app/triggers/new")}>
      <PlusIcon class="size-4" />
      New Trigger
    </Button>
  </div>

  <!-- Triggers List -->
  {#if paginatedTriggers.length === 0 && !loading}
    <div class="text-muted-foreground py-8 text-center">No triggers found</div>
  {:else}
    <div class="ktable rounded-xl border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-[280px]">Name</Table.Head>
            <Table.Head class="w-[140px]">Type</Table.Head>
            <Table.Head class="w-[140px]">Status</Table.Head>
            <Table.Head class="w-[160px] text-right"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each paginatedTriggers as trigger (trigger.id)}
            <Table.Row>
              <Table.Cell class="font-medium">{trigger.name}</Table.Cell>

              <Table.Cell>
                <Badge variant="outline" class="capitalize">{trigger.trigger_type}</Badge>
              </Table.Cell>
              <Table.Cell>
                <Badge variant={trigger.trigger_status === "ACTIVE" ? "default" : "secondary"}>
                  {trigger.trigger_status}
                </Badge>
              </Table.Cell>
              <Table.Cell class="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  href={clientResolver(resolve, `/manage/app/triggers/${trigger.id}`)}
                >
                  <SettingsIcon class="mr-1 size-4" />
                  Configure
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}

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
            {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page (page)}
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
