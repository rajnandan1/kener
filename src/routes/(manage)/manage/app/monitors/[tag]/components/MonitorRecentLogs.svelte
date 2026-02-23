<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import { format } from "date-fns";
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface Props {
    monitor_tag: string;
  }

  let { monitor_tag }: Props = $props();

  // Types
  interface MonitoringData {
    monitor_tag: string;
    timestamp: number;
    status: string | null;
    latency: number | null;
    type: string | null;
    error_message?: string | null;
  }

  // State
  let loading = $state(true);
  let logs = $state<MonitoringData[]>([]);

  // Fetch last 10 logs for this monitor
  async function fetchLogs() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getMonitoringDataPaginated",
          data: {
            page: 1,
            limit: 10,
            monitor_tag: monitor_tag
          }
        })
      });
      const result = await response.json();
      if (!result.error) {
        logs = result.data as MonitoringData[];
      }
    } catch (error) {
      console.error("Error fetching monitoring logs:", error);
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

  onMount(() => {
    fetchLogs();
  });

  // Refetch when monitor_tag changes
  $effect(() => {
    if (monitor_tag) {
      fetchLogs();
    }
  });
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-center justify-between">
      <div>
        <Card.Title>Recent Logs</Card.Title>
        <Card.Description>Last 10 monitoring data points</Card.Description>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="icon" onclick={fetchLogs} disabled={loading}>
          <RefreshCwIcon class="size-4 {loading ? 'animate-spin' : ''}" />
        </Button>
        <Button variant="outline" size="sm" href={clientResolver(resolve, "/manage/app/monitoring-data")}>
          View All
          <ExternalLinkIcon class="ml-1 size-3" />
        </Button>
      </div>
    </div>
  </Card.Header>
  <Card.Content>
    {#if loading && logs.length === 0}
      <div class="flex items-center justify-center py-8">
        <Spinner class="size-6" />
      </div>
    {:else if logs.length === 0}
      <div class="text-muted-foreground py-8 text-center text-sm">No monitoring data found for this monitor</div>
    {:else}
      <div class="ktable rounded-lg border">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head class="w-44">Timestamp</Table.Head>
              <Table.Head class="w-20">Status</Table.Head>
              <Table.Head class="w-20">Latency</Table.Head>
              <Table.Head class="w-20">Type</Table.Head>
              <Table.Head>Error</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each logs as log (log.timestamp)}
              <Table.Row class="hover:bg-muted/50">
                <Table.Cell>
                  <span class="text-muted-foreground text-sm">{formatTimestamp(log.timestamp)}</span>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant={getStatusBadgeVariant(log.status)}>
                    {log.status || "N/A"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  {#if log.latency !== null}
                    <span class="text-sm">{log.latency} ms</span>
                  {:else}
                    <span class="text-muted-foreground text-sm">—</span>
                  {/if}
                </Table.Cell>
                <Table.Cell>
                  {#if log.type}
                    <Badge variant="secondary" class="text-xs">{log.type}</Badge>
                  {:else}
                    <span class="text-muted-foreground text-sm">—</span>
                  {/if}
                </Table.Cell>
                <Table.Cell>
                  {#if log.error_message}
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <span class="text-destructive line-clamp-1 max-w-xs text-sm">{log.error_message}</span>
                      </Tooltip.Trigger>
                      <Tooltip.Content class="max-w-md">
                        <p class="break-words">{log.error_message}</p>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {:else}
                    <span class="text-muted-foreground text-sm">—</span>
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
