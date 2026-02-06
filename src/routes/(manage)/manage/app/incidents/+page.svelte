<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import SirenIcon from "@lucide/svelte/icons/siren";
  import { goto } from "$app/navigation";
  import { format, formatDistanceToNow } from "date-fns";
  import GC from "$lib/global-constants";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  // State
  let loading = $state(true);
  let incidents = $state<any[]>([]);
  let totalPages = $state(0);
  let totalCount = $state(0);
  let pageNo = $state(1);
  let stateFilter = $state("ALL");
  const limit = 10;

  const stateOptions = [
    { value: "ALL", label: "All States" },
    { value: GC.INVESTIGATING, label: "Investigating" },
    { value: GC.IDENTIFIED, label: "Identified" },
    { value: GC.MONITORING, label: "Monitoring" },
    { value: GC.RESOLVED, label: "Resolved" }
  ];

  // Fetch incidents
  async function fetchData() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getIncidents",
          data: {
            page: pageNo,
            limit,
            filter: { status: "OPEN", state: stateFilter === "ALL" ? undefined : stateFilter }
          }
        })
      });
      const result = await response.json();
      if (!result.error) {
        incidents = result.incidents.map((incident: any) => {
          // Calculate duration
          let duration: string;
          if (!incident.end_date_time) {
            duration = formatDistanceToNow(new Date(incident.start_date_time * 1000), { addSuffix: false });
          } else {
            const durationMs = (incident.end_date_time - incident.start_date_time) * 1000;
            duration = formatDuration(durationMs);
          }
          return { ...incident, duration };
        });
        totalCount = result.total;
        totalPages = Math.ceil(result.total / limit);
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      loading = false;
    }
  }

  // Format duration from milliseconds
  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  // Get state badge variant
  function getStateBadgeVariant(state: string): "default" | "secondary" | "destructive" | "outline" {
    switch (state) {
      case GC.RESOLVED:
        return "default";
      case GC.MONITORING:
        return "secondary";
      case GC.IDENTIFIED:
        return "outline";
      case GC.INVESTIGATING:
      default:
        return "destructive";
    }
  }

  // Navigate to incident
  function openIncident(id: number) {
    goto(clientResolver(resolve, `/manage/app/incidents/${id}`));
  }

  // Create new incident
  function createNewIncident() {
    goto(clientResolver(resolve, "/manage/app/incidents/new"));
  }

  // Handle state filter change
  function handleStateFilterChange(value: string | undefined) {
    if (value) {
      stateFilter = value;
      pageNo = 1;
      fetchData();
    }
  }

  // Pagination
  function goToPage(page: number) {
    pageNo = page;
    fetchData();
  }

  $effect(() => {
    fetchData();
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <!-- Filters -->
    <div class="flex items-center gap-3">
      <Select.Root type="single" value={stateFilter} onValueChange={handleStateFilterChange}>
        <Select.Trigger class="w-44">
          {stateOptions.find((o) => o.value === stateFilter)?.label || "All States"}
        </Select.Trigger>
        <Select.Content>
          {#each stateOptions as option}
            <Select.Item value={option.value}>{option.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
      {#if loading}
        <Spinner class="size-5" />
      {/if}
    </div>
    <div class="flex items-center gap-3">
      <Button variant="outline" href={clientResolver(resolve, "/docs/incidents/creating-managing")} target="_blank">
        Documentation
        <ExternalLinkIcon class="ml-2 size-4" />
      </Button>
      <Button onclick={createNewIncident}>
        <PlusIcon class="mr-2 size-4" />
        New Incident
      </Button>
    </div>
  </div>

  <!-- Events Table -->
  <div class="ktable rounded-2xl border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-16">ID</Table.Head>
          <Table.Head>Title</Table.Head>
          <Table.Head class="w-32">Duration</Table.Head>
          <Table.Head class="w-36">State</Table.Head>
          <Table.Head class="w-40">Affects</Table.Head>
          <Table.Head class="w-24 text-right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if incidents.length === 0 && !loading}
          <Table.Row>
            <Table.Cell colspan={6} class="text-muted-foreground py-8 text-center">No incidents found</Table.Cell>
          </Table.Row>
        {:else}
          {#each incidents as incident}
            <Table.Row class="hover:bg-muted/50 cursor-pointer" onclick={() => openIncident(incident.id)}>
              <Table.Cell class="font-medium">{incident.id}</Table.Cell>
              <Table.Cell>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <span class="line-clamp-1 max-w-xs">{incident.title}</span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="max-w-md">{incident.title}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Table.Cell>
              <Table.Cell>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <span class="text-muted-foreground text-sm">{incident.duration}</span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div class="text-sm">
                      <span class="text-muted-foreground">From:</span>
                      {format(new Date(incident.start_date_time * 1000), "yyyy-MM-dd HH:mm")}
                      <br />
                      <span class="text-muted-foreground">To:</span>
                      {#if incident.end_date_time}
                        {format(new Date(incident.end_date_time * 1000), "yyyy-MM-dd HH:mm")}
                      {:else}
                        Ongoing
                      {/if}
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Table.Cell>
              <Table.Cell>
                <div class="flex items-center gap-2">
                  <Badge variant={getStateBadgeVariant(incident.state)} class="gap-1">
                    <SirenIcon class="size-3" />
                    {incident.state}
                  </Badge>
                </div>
              </Table.Cell>
              <Table.Cell>
                {#if incident.monitors && incident.monitors.length > 0}
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Badge variant="outline">{incident.monitors.length} monitor(s)</Badge>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div class="space-y-1">
                        {#each incident.monitors as monitor}
                          <div class="text-sm">
                            <span class="font-medium">{monitor.tag || monitor.monitor_tag}</span>
                            <span class="text-muted-foreground ml-1"
                              >({monitor.impact_type || monitor.monitor_impact})</span
                            >
                          </div>
                        {/each}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {:else}
                  <span class="text-muted-foreground text-sm">None</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onclick={(e) => {
                    e.stopPropagation();
                    openIncident(incident.id);
                  }}
                >
                  <PencilIcon class="size-4" />
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Pagination -->
  {#if totalPages > 0}
    <div class="flex items-center justify-between">
      <p class="text-muted-foreground text-sm">
        Showing {(pageNo - 1) * limit + 1} - {Math.min(pageNo * limit, totalCount)} of {totalCount} incidents
      </p>
      {#if totalPages > 1}
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" disabled={pageNo === 1} onclick={() => goToPage(pageNo - 1)}>
            <ChevronLeftIcon class="size-4" />
          </Button>
          <div class="flex items-center gap-1">
            {#if totalPages <= 7}
              {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
                <Button variant={page === pageNo ? "default" : "ghost"} size="sm" onclick={() => goToPage(page)}>
                  {page}
                </Button>
              {/each}
            {:else}
              <!-- First page -->
              <Button variant={pageNo === 1 ? "default" : "ghost"} size="sm" onclick={() => goToPage(1)}>1</Button>

              {#if pageNo > 3}
                <span class="text-muted-foreground px-2">...</span>
              {/if}

              <!-- Middle pages -->
              {#each Array.from({ length: 3 }, (_, i) => pageNo - 1 + i).filter((p) => p > 1 && p < totalPages) as page}
                <Button variant={page === pageNo ? "default" : "ghost"} size="sm" onclick={() => goToPage(page)}>
                  {page}
                </Button>
              {/each}

              {#if pageNo < totalPages - 2}
                <span class="text-muted-foreground px-2">...</span>
              {/if}

              <!-- Last page -->
              <Button
                variant={pageNo === totalPages ? "default" : "ghost"}
                size="sm"
                onclick={() => goToPage(totalPages)}
              >
                {totalPages}
              </Button>
            {/if}
          </div>
          <Button variant="outline" size="icon" disabled={pageNo === totalPages} onclick={() => goToPage(pageNo + 1)}>
            <ChevronRightIcon class="size-4" />
          </Button>
        </div>
      {/if}
    </div>
  {/if}
</div>
