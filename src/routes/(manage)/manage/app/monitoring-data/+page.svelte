<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import { format } from "date-fns";
  import { onMount } from "svelte";

  // Types
  interface MonitoringData {
    monitor_tag: string;
    timestamp: number;
    status: string | null;
    latency: number | null;
    type: string | null;
    error_message?: string | null;
  }

  interface Monitor {
    tag: string;
    name: string;
  }

  // Helper to format datetime as YYYY-MM-DDTHH:mm for datetime-local input
  function formatDateTimeForInput(date: Date): string {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  }

  // Helper to format date only as YYYY-MM-DD for min/max constraints
  function formatDateForInput(date: Date): string {
    return format(date, "yyyy-MM-dd");
  }

  // Helper to get date N days ago
  function getDaysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  // Default date range: last 24 hours
  const now = new Date();
  const yesterday = getDaysAgo(1);
  const maxDaysAgoDate = getDaysAgo(30);

  // State
  let loading = $state(true);
  let monitoringData = $state<MonitoringData[]>([]);
  let monitors = $state<Monitor[]>([]);
  let totalPages = $state(0);
  let totalCount = $state(0);
  let pageNo = $state(1);
  let monitorTagFilter = $state("ALL");
  let startDateTime = $state(formatDateTimeForInput(yesterday));
  let endDateTime = $state(formatDateTimeForInput(now));
  const limit = 50;

  // Convert datetime string (YYYY-MM-DDTHH:mm) to Unix timestamp (seconds)
  function dateTimeStringToTimestamp(dateTimeStr: string): number {
    const date = new Date(dateTimeStr);
    return Math.floor(date.getTime() / 1000);
  }

  // Validate date range (max 30 days)
  function validateAndFetch() {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    // Ensure start is before end
    if (start > end) {
      startDateTime = endDateTime;
    }

    // Check if range exceeds 30 days
    const daysDiff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      // Adjust end datetime to be 30 days from start
      const newEnd = new Date(start);
      newEnd.setDate(newEnd.getDate() + 30);
      if (newEnd > now) {
        endDateTime = formatDateTimeForInput(now);
      } else {
        endDateTime = formatDateTimeForInput(newEnd);
      }
    }

    pageNo = 1;
    fetchData();
  }

  // Fetch monitors for filter dropdown
  async function fetchMonitors() {
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getMonitors",
          data: {}
        })
      });
      const result = await response.json();
      if (!result.error && Array.isArray(result)) {
        monitors = result.map((m: { tag: string; name: string }) => ({ tag: m.tag, name: m.name }));
      }
    } catch (error) {
      console.error("Error fetching monitors:", error);
    }
  }

  // Fetch monitoring data
  async function fetchData() {
    loading = true;
    try {
      const requestData: {
        page: number;
        limit: number;
        monitor_tag: string;
        start_time?: number;
        end_time?: number;
      } = {
        page: pageNo,
        limit,
        monitor_tag: monitorTagFilter
      };

      if (startDateTime) {
        requestData.start_time = dateTimeStringToTimestamp(startDateTime);
      }
      if (endDateTime) {
        requestData.end_time = dateTimeStringToTimestamp(endDateTime);
      }

      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getMonitoringDataPaginated",
          data: requestData
        })
      });
      const result = await response.json();
      if (!result.error) {
        monitoringData = result.data as MonitoringData[];
        totalCount = result.total;
        totalPages = Math.ceil(result.total / limit);
      }
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    } finally {
      loading = false;
    }
  }

  // Get badge variant for status
  function getStatusBadgeVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "DOWN":
        return "destructive";
      case "DEGRADED":
        return "outline";
      case "UP":
        return "default";
      default:
        return "secondary";
    }
  }

  // Format timestamp to date string
  function formatTimestamp(timestamp: number): string {
    try {
      const date = new Date(timestamp * 1000);
      return format(date, "yyyy-MM-dd HH:mm:ss");
    } catch {
      return String(timestamp);
    }
  }

  // Handle monitor tag filter change
  function handleMonitorChange(value: string | undefined) {
    if (value) {
      monitorTagFilter = value;
      pageNo = 1;
      fetchData();
    }
  }

  // Pagination
  function goToPage(page: number) {
    pageNo = page;
    fetchData();
  }

  onMount(() => {
    fetchMonitors();
    fetchData();
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex flex-wrap items-center justify-between gap-4">
    <h1 class="text-2xl font-semibold">Monitoring Data</h1>
    <div class="flex flex-wrap items-center gap-3">
      <!-- Date Time Range Inputs -->
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5">
          <Label for="start-datetime" class="text-muted-foreground text-sm">From</Label>
          <Input
            id="start-datetime"
            type="datetime-local"
            bind:value={startDateTime}
            onchange={validateAndFetch}
            min={formatDateTimeForInput(maxDaysAgoDate)}
            max={endDateTime}
            class="w-44"
          />
        </div>
        <div class="flex items-center gap-1.5">
          <Label for="end-datetime" class="text-muted-foreground text-sm">To</Label>
          <Input
            id="end-datetime"
            type="datetime-local"
            bind:value={endDateTime}
            onchange={validateAndFetch}
            min={startDateTime}
            max={formatDateTimeForInput(now)}
            class="w-44"
          />
        </div>
      </div>

      <!-- Monitor Filter -->
      <Select.Root type="single" value={monitorTagFilter} onValueChange={handleMonitorChange}>
        <Select.Trigger class="w-48">
          {monitorTagFilter === "ALL" ? "All Monitors" : monitorTagFilter}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ALL">All Monitors</Select.Item>
          {#each monitors as monitor (monitor.tag)}
            <Select.Item value={monitor.tag}>{monitor.name || monitor.tag}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
      {#if loading}
        <Spinner class="size-5" />
      {/if}
    </div>
  </div>

  <!-- Data Table -->
  <div class="ktable rounded-xl border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Monitor Tag</Table.Head>
          <Table.Head class="w-48">Timestamp</Table.Head>
          <Table.Head class="w-24">Status</Table.Head>
          <Table.Head class="w-24">Latency</Table.Head>
          <Table.Head class="w-24">Type</Table.Head>
          <Table.Head>Error Message</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if monitoringData.length === 0 && !loading}
          <Table.Row>
            <Table.Cell colspan={6} class="text-muted-foreground py-8 text-center">No monitoring data found</Table.Cell>
          </Table.Row>
        {:else}
          {#each monitoringData as row (row.monitor_tag + "_" + row.timestamp)}
            <Table.Row class="hover:bg-muted/50">
              <Table.Cell>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <span class="line-clamp-1 max-w-xs font-medium">{row.monitor_tag}</span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>{row.monitor_tag}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Table.Cell>
              <Table.Cell>
                <span class="text-muted-foreground text-sm">{formatTimestamp(row.timestamp)}</span>
              </Table.Cell>
              <Table.Cell>
                <Badge variant={getStatusBadgeVariant(row.status)}>
                  {row.status || "N/A"}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                {#if row.latency !== null}
                  <span class="text-sm">{row.latency} ms</span>
                {:else}
                  <span class="text-muted-foreground text-sm">—</span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                {#if row.type}
                  <Badge variant="secondary">{row.type}</Badge>
                {:else}
                  <span class="text-muted-foreground text-sm">—</span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                {#if row.error_message}
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <span class="text-destructive line-clamp-1 max-w-xs text-sm">{row.error_message}</span>
                    </Tooltip.Trigger>
                    <Tooltip.Content class="max-w-md">
                      <p class="break-words">{row.error_message}</p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {:else}
                  <span class="text-muted-foreground text-sm">—</span>
                {/if}
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
