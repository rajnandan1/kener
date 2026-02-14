<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import EditIcon from "@lucide/svelte/icons/pencil";
  import ListIcon from "@lucide/svelte/icons/list";
  import BellOffIcon from "@lucide/svelte/icons/bell-off";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import GC from "$lib/global-constants";
  import { getAlertText } from "$lib/alerts/alert-text";
  import type { MonitorAlertConfigWithTriggers } from "$lib/server/types/db";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  // State
  let loading = $state(true);
  let configs = $state<MonitorAlertConfigWithTriggers[]>([]);
  let monitors = $state<{ tag: string; name: string }[]>([]);
  let totalPages = $state(0);
  let totalCount = $state(0);
  let pageNo = $state(1);
  let monitorFilter = $state("");
  const limit = 20;

  // Fetch alert configs
  async function fetchConfigs() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getAlertConfigsPaginated",
          data: {
            page: pageNo,
            limit,
            monitor_tag: monitorFilter || undefined
          }
        })
      });
      const result = await response.json();
      if (!result.error) {
        configs = result.configs as MonitorAlertConfigWithTriggers[];
        totalCount = result.total;
        totalPages = Math.ceil(result.total / limit);
      }
    } catch (error) {
      console.error("Error fetching alert configs:", error);
    } finally {
      loading = false;
    }
  }

  // Fetch monitors for filter dropdown
  async function fetchMonitors() {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
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

  // Toggle alert status
  async function toggleAlertStatus(config: MonitorAlertConfigWithTriggers) {
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggleMonitorAlertConfigStatus",
          data: { id: config.id }
        })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.is_active === "YES" ? "Alert activated" : "Alert deactivated");
        await fetchConfigs();
      }
    } catch (error) {
      toast.error("Failed to toggle alert status");
    }
  }

  // Get badge variant for severity
  function getSeverityBadgeVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
    switch (severity) {
      case "CRITICAL":
        return "destructive";
      case "WARNING":
        return "secondary";
      default:
        return "default";
    }
  }

  // Handle monitor filter change
  function handleMonitorChange(value: string | undefined) {
    monitorFilter = value || "";
    pageNo = 1;
    fetchConfigs();
  }

  // Pagination
  function goToPage(page: number) {
    pageNo = page;
    fetchConfigs();
  }

  $effect(() => {
    fetchConfigs();
    fetchMonitors();
  });
</script>

<div class="container mx-auto space-y-6 py-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <Select.Root type="single" value={monitorFilter} onValueChange={handleMonitorChange}>
        <Select.Trigger class="w-48">
          {monitorFilter ? monitors.find((m) => m.tag === monitorFilter)?.name || monitorFilter : "All Monitors"}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">All Monitors</Select.Item>
          {#each monitors as monitor}
            <Select.Item value={monitor.tag}>{monitor.name}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
      {#if loading}
        <Spinner class="size-5" />
      {/if}
    </div>
    <Button onclick={() => goto(clientResolver(resolve, "/manage/app/alerts/new"))}>
      <PlusIcon class="size-4" />
      Create Alert
    </Button>
  </div>

  <!-- Alert Configs Table -->
  <div class="ktable rounded-lg border">
    <Table.Root>
      <Table.Header>
        <Table.Row>
          <Table.Head>Monitor</Table.Head>
          <Table.Head>Alert Type</Table.Head>
          <Table.Head>Severity</Table.Head>
          <Table.Head>Description</Table.Head>
          <Table.Head class="w-24">Triggers</Table.Head>
          <Table.Head class="w-20 text-center">Active</Table.Head>
          <Table.Head class="w-32 text-right">Actions</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#if configs.length === 0 && !loading}
          <Table.Row>
            <Table.Cell colspan={7} class="text-muted-foreground py-16 text-center">
              <div class="flex flex-col items-center gap-4">
                <BellOffIcon class="text-muted-foreground size-16" />
                <div class="space-y-2">
                  <h3 class="text-lg font-semibold">No alert configurations</h3>
                  <p class="text-muted-foreground text-sm">
                    {monitorFilter
                      ? "No alerts found for this monitor."
                      : "Create an alert to get notified when your monitors have issues."}
                  </p>
                </div>
                <Button onclick={() => goto(clientResolver(resolve, "/manage/app/alerts/new"))}>
                  <PlusIcon class="size-4" />
                  Create Alert
                </Button>
              </div>
            </Table.Cell>
          </Table.Row>
        {:else}
          {#each configs as config (config.id)}
            <Table.Row class={config.is_active === GC.NO ? "opacity-60" : ""}>
              <Table.Cell>
                <a
                  href={clientResolver(resolve, `/manage/app/monitors/${config.monitor_tag}`)}
                  class="text-primary font-medium hover:underline"
                >
                  {config.monitor_tag}
                </a>
              </Table.Cell>
              <Table.Cell>
                <Badge variant="outline">{config.alert_for}</Badge>
              </Table.Cell>
              <Table.Cell>
                <Badge variant={getSeverityBadgeVariant(config.severity)}>
                  {config.severity}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <div class="max-w-xs space-y-1">
                      <p class="text-muted-foreground line-clamp-2 text-sm">
                        {getAlertText({
                          kind: "description",
                          alert_for: config.alert_for,
                          alert_value: config.alert_value,
                          failure_threshold: config.failure_threshold,
                          success_threshold: config.success_threshold
                        })}
                      </p>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content class="max-w-md">
                    <div class="space-y-2">
                      <p class="text-sm">
                        {getAlertText({
                          kind: "description",
                          alert_for: config.alert_for,
                          alert_value: config.alert_value,
                          failure_threshold: config.failure_threshold,
                          success_threshold: config.success_threshold
                        })}
                      </p>
                    </div>
                  </Tooltip.Content>
                </Tooltip.Root>
              </Table.Cell>
              <Table.Cell>
                {#if config.triggers && config.triggers.length > 0}
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <Badge variant="secondary" class="cursor-pointer text-xs">
                        {config.triggers.length} trigger{config.triggers.length > 1 ? "s" : ""}
                      </Badge>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      <div class="space-y-1">
                        {#each config.triggers as trigger (trigger.id)}
                          <div class="text-sm">{trigger.name}</div>
                        {/each}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {:else}
                  <span class="text-muted-foreground text-sm">-</span>
                {/if}
              </Table.Cell>
              <Table.Cell class="text-center">
                <Switch checked={config.is_active === GC.YES} onCheckedChange={() => toggleAlertStatus(config)} />
              </Table.Cell>
              <Table.Cell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => goto(clientResolver(resolve, `/manage/app/alerts/${config.id}`))}
                  >
                    <EditIcon class="size-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => goto(clientResolver(resolve, `/manage/app/alerts/logs/${config.id}`))}
                  >
                    <ListIcon class="size-3" />
                    Logs
                  </Button>
                </div>
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
