<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import BlendIcon from "@lucide/svelte/icons/blend";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import RepeatIcon from "@lucide/svelte/icons/repeat";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import UsersIcon from "@lucide/svelte/icons/users";
  import { goto } from "$app/navigation";
  import { format, formatDistanceToNow, isPast, isFuture, isWithinInterval } from "date-fns";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  // Types
  interface MaintenanceEvent {
    id: number;
    maintenance_id: number;
    start_date_time: number;
    end_date_time: number;
    status: string;
  }

  interface Maintenance {
    id: number;
    title: string;
    description: string | null;
    start_date_time: number;
    rrule: string;
    duration_seconds: number;
    status: "ACTIVE" | "INACTIVE";
    monitors?: Array<{ monitor_tag: string }>;
    events?: MaintenanceEvent[];
    upcoming_event?: MaintenanceEvent | null;
  }

  // State
  let loading = $state(true);
  let maintenances = $state<Maintenance[]>([]);
  let totalPages = $state(0);
  let totalCount = $state(0);
  let pageNo = $state(1);
  let status = $state("ACTIVE");
  const limit = 10;

  // Fetch maintenances
  async function fetchData() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getMaintenances",
          data: {
            page: pageNo,
            limit,
            filter: { status: status === "ALL" ? undefined : status }
          }
        })
      });
      const result = await response.json();
      if (!result.error) {
        maintenances = result.maintenances;
        totalCount = result.total;
        totalPages = Math.ceil(result.total / limit);
      }
    } catch (error) {
      console.error("Error fetching maintenances:", error);
    } finally {
      loading = false;
    }
  }

  // Check if RRULE is one-time (contains COUNT=1)
  function isOneTime(rrule: string): boolean {
    return rrule.includes("COUNT=1");
  }

  // Format duration in seconds
  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  // Get status badge variant
  function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "INACTIVE":
        return "secondary";
      default:
        return "outline";
    }
  }

  // Compute event display status based on current time
  interface EventDisplayStatus {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }

  function getEventDisplayStatus(event: MaintenanceEvent): EventDisplayStatus {
    const now = new Date();
    const startDate = new Date(event.start_date_time * 1000);
    const endDate = new Date(event.end_date_time * 1000);

    // Check if currently ongoing
    if (isWithinInterval(now, { start: startDate, end: endDate })) {
      return {
        label: "Ongoing",
        variant: "default"
      };
    }

    // Check if in the future (upcoming)
    if (isFuture(startDate)) {
      const distance = formatDistanceToNow(startDate, { addSuffix: false });
      return {
        label: `In ${distance}`,
        variant: "outline"
      };
    }

    // If in the past (completed)
    if (isPast(endDate)) {
      return {
        label: "Completed",
        variant: "secondary"
      };
    }

    // Fallback
    return {
      label: "Scheduled",
      variant: "outline"
    };
  }

  // Navigate to maintenance
  function openMaintenance(id: number) {
    goto(clientResolver(resolve, `/manage/app/maintenances/${id}`));
  }

  // Create new maintenance
  function createNewMaintenance() {
    goto(clientResolver(resolve, "/manage/app/maintenances/new"));
  }

  // Handle status filter change
  function handleStatusChange(value: string | undefined) {
    if (value) {
      status = value;
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
  <!-- Breadcrumb -->

  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Select.Root type="single" value={status} onValueChange={handleStatusChange}>
          <Select.Trigger class="w-40">
            {status === "ALL" ? "All" : status === "ACTIVE" ? "Active" : "Inactive"}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="ALL">All</Select.Item>
            <Select.Item value="ACTIVE">Active</Select.Item>
            <Select.Item value="INACTIVE">Inactive</Select.Item>
          </Select.Content>
        </Select.Root>
      </div>
      {#if loading}
        <Spinner class="size-5" />
      {/if}
    </div>
    <div class="flex items-center gap-3">
      <Button onclick={createNewMaintenance}>
        <PlusIcon class="size-4" />
        New Maintenance
      </Button>
    </div>
  </div>

  <!-- Filters -->

  <!-- Maintenances Table -->
  <div class="ktable rounded-xl border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-16">ID</Table.Head>
          <Table.Head>Title</Table.Head>
          <Table.Head class="w-32">Type</Table.Head>
          <Table.Head class="w-40">Duration</Table.Head>
          <Table.Head class="w-24">Monitors</Table.Head>
          <Table.Head class="w-40">Next Event</Table.Head>
          <Table.Head class="w-24">Status</Table.Head>
          <Table.Head class="w-24 text-right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if maintenances.length === 0 && !loading}
          <Table.Row>
            <Table.Cell colspan={8} class="text-muted-foreground py-8 text-center">No maintenances found</Table.Cell>
          </Table.Row>
        {:else}
          {#each maintenances as maintenance}
            <Table.Row class="hover:bg-muted/50 cursor-pointer" onclick={() => openMaintenance(maintenance.id)}>
              <Table.Cell class="font-medium">{maintenance.id}</Table.Cell>
              <Table.Cell>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <span class="line-clamp-1 max-w-xs">{maintenance.title}</span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p class="max-w-md">{maintenance.title}</p>
                    {#if maintenance.description}
                      <p class="text-muted-foreground mt-1 text-sm">{maintenance.description}</p>
                    {/if}
                  </Tooltip.Content>
                </Tooltip.Root>
              </Table.Cell>
              <Table.Cell>
                <Badge variant="outline" class="gap-1">
                  {#if isOneTime(maintenance.rrule)}
                    <CalendarIcon class="size-3" />
                    One-Time
                  {:else}
                    <RepeatIcon class="size-3" />
                    Recurring
                  {/if}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <div class="flex items-center gap-1">
                      <ClockIcon class="text-muted-foreground size-3" />
                      <span class="text-muted-foreground text-sm">{formatDuration(maintenance.duration_seconds)}</span>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div class="text-sm">
                      <div>
                        <span class="text-muted-foreground">Start:</span>
                        {format(new Date(maintenance.start_date_time * 1000), "yyyy-MM-dd HH:mm")}
                      </div>
                      <div>
                        <span class="text-muted-foreground">Duration:</span>
                        {formatDuration(maintenance.duration_seconds)}
                      </div>
                      <div>
                        <span class="text-muted-foreground">RRULE:</span>
                        {maintenance.rrule}
                      </div>
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Table.Cell>
              <Table.Cell>
                {#if maintenance.monitors && maintenance.monitors.length > 0}
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <div class="flex items-center gap-1">
                        <BlendIcon class="text-muted-foreground size-3" />
                        <span class="text-sm">{maintenance.monitors.length}</span>
                      </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div class="text-sm">
                        {#each maintenance.monitors as monitor}
                          <div>{monitor.monitor_tag}</div>
                        {/each}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {:else}
                  <span class="text-muted-foreground text-sm">None</span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                {#if maintenance.upcoming_event}
                  {@const displayStatus = getEventDisplayStatus(maintenance.upcoming_event)}
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Badge variant={displayStatus.variant}>
                        {displayStatus.label}
                      </Badge>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div class="text-sm">
                        <div>
                          <span class="text-muted-foreground">Start:</span>
                          {format(new Date(maintenance.upcoming_event.start_date_time * 1000), "MMM d, yyyy HH:mm")}
                        </div>
                        <div>
                          <span class="text-muted-foreground">End:</span>
                          {format(new Date(maintenance.upcoming_event.end_date_time * 1000), "MMM d, yyyy HH:mm")}
                        </div>
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {:else}
                  <span class="text-muted-foreground text-sm">No events</span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                <Badge variant={getStatusBadgeVariant(maintenance.status)}>
                  {maintenance.status}
                </Badge>
              </Table.Cell>
              <Table.Cell class="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onclick={(e) => {
                    e.stopPropagation();
                    openMaintenance(maintenance.id);
                  }}
                >
                  <PencilIcon class="size-4" /> Edit
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        {/if}
      </Table.Body>
    </Table.Root>
  </div>

  <!-- Pagination -->
  {#if totalCount > 0}
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
