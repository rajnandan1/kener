<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
  import { format } from "date-fns";

  // Types
  interface MonitorAlert {
    id: number;
    monitor_tag: string;
    monitor_status: string;
    alert_status: string;
    health_checks: number;
    incident_number: number | null;
    created_at: string;
    updated_at: string;
  }

  // State
  let loading = $state(true);
  let alerts = $state<MonitorAlert[]>([]);
  let totalPages = $state(0);
  let totalCount = $state(0);
  let pageNo = $state(1);
  let statusFilter = $state("ALL");
  const limit = 20;

  // Fetch alerts
  async function fetchData() {
    loading = true;
    try {
      const response = await fetch("/manage/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getAllAlertsPaginated",
          data: {
            page: pageNo,
            limit
          }
        })
      });
      const result = await response.json();
      if (!result.error) {
        // Filter alerts client-side based on status
        let allAlerts = result.alerts as MonitorAlert[];
        if (statusFilter !== "ALL") {
          allAlerts = allAlerts.filter((a) => a.alert_status === statusFilter);
        }
        alerts = allAlerts;
        totalCount = result.total;
        totalPages = Math.ceil(result.total / limit);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      loading = false;
    }
  }

  // Get badge variant for monitor status (UP/DOWN/DEGRADED)
  function getMonitorStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
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

  // Get badge variant for alert status (TRIGGERED/RESOLVED)
  function getAlertStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
    switch (status) {
      case "TRIGGERED":
        return "destructive";
      case "RESOLVED":
        return "default";
      default:
        return "secondary";
    }
  }

  // Format date
  function formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return format(date, "yyyy-MM-dd HH:mm:ss");
    } catch {
      return dateStr;
    }
  }

  // Handle status filter change
  function handleStatusChange(value: string | undefined) {
    if (value) {
      statusFilter = value;
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
    <div class="flex items-center gap-3">
      <Select.Root type="single" value={statusFilter} onValueChange={handleStatusChange}>
        <Select.Trigger class="w-36">
          {statusFilter === "ALL" ? "All Status" : statusFilter}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ALL">All Status</Select.Item>
          <Select.Item value="TRIGGERED">Triggered</Select.Item>
          <Select.Item value="RESOLVED">Resolved</Select.Item>
        </Select.Content>
      </Select.Root>
      {#if loading}
        <Spinner class="size-5" />
      {/if}
    </div>
  </div>

  <!-- Alerts Table -->
  <div class="ktable rounded-xl border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-16">ID</Table.Head>
          <Table.Head>Monitor</Table.Head>
          <Table.Head class="w-32">Type</Table.Head>
          <Table.Head class="w-32">Status</Table.Head>
          <Table.Head class="w-24">Checks</Table.Head>
          <Table.Head class="w-32">Incident</Table.Head>
          <Table.Head class="w-48">Created At</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if alerts.length === 0 && !loading}
          <Table.Row>
            <Table.Cell colspan={7} class="text-muted-foreground py-8 text-center">No alerts found</Table.Cell>
          </Table.Row>
        {:else}
          {#each alerts as alert}
            <Table.Row class="hover:bg-muted/50">
              <Table.Cell class="font-medium">{alert.id}</Table.Cell>
              <Table.Cell>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <span class="line-clamp-1 max-w-xs font-medium">{alert.monitor_tag}</span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>{alert.monitor_tag}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Table.Cell>
              <Table.Cell>
                <Badge variant={getMonitorStatusBadgeVariant(alert.monitor_status)}>
                  {alert.monitor_status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Badge variant={getAlertStatusBadgeVariant(alert.alert_status)}>
                  {alert.alert_status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <span class="text-muted-foreground text-sm">{alert.health_checks}</span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>Number of health checks that triggered this alert</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Table.Cell>
              <Table.Cell>
                {#if alert.incident_number}
                  <a
                    href="/manage/app/incidents/{alert.incident_number}"
                    class="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                    onclick={(e) => e.stopPropagation()}
                  >
                    #{alert.incident_number}
                    <ExternalLinkIcon class="size-3" />
                  </a>
                {:else}
                  <span class="text-muted-foreground text-sm">—</span>
                {/if}
              </Table.Cell>
              <Table.Cell>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <span class="text-muted-foreground text-sm">{formatDate(alert.created_at)}</span>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <div class="text-sm">
                      <div>
                        <span class="text-muted-foreground">Created:</span>
                        {formatDate(alert.created_at)}
                      </div>
                      <div>
                        <span class="text-muted-foreground">Updated:</span>
                        {formatDate(alert.updated_at)}
                      </div>
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
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
