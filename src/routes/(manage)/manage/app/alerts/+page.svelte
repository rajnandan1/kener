<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import EditIcon from "@lucide/svelte/icons/pencil";
  import ListIcon from "@lucide/svelte/icons/list";
  import BellOffIcon from "@lucide/svelte/icons/bell-off";
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import GC from "$lib/global-constants";
  import type { MonitorAlertConfigWithTriggers } from "$lib/server/types/db";

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
      const response = await fetch("/manage/api", {
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

  // Toggle alert status
  async function toggleAlertStatus(config: MonitorAlertConfigWithTriggers) {
    try {
      const response = await fetch("/manage/api", {
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

  // Get alert description
  function getAlertDescription(config: MonitorAlertConfigWithTriggers): string {
    const { alert_for, alert_value, failure_threshold, success_threshold } = config;

    if (alert_for === GC.STATUS) {
      return `Alert when ${failure_threshold} consecutive checks result in ${alert_value}. Resolve after ${success_threshold} successful check(s).`;
    } else if (alert_for === GC.LATENCY) {
      return `Alert when latency exceeds ${alert_value}ms for ${failure_threshold} consecutive checks. Resolve after ${success_threshold} check(s) below threshold.`;
    } else if (alert_for === GC.UPTIME) {
      return `Alert when uptime falls below ${alert_value}% for ${failure_threshold} checks. Resolve after ${success_threshold} check(s) above threshold.`;
    }
    return "";
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
    <Button onclick={() => goto("/manage/app/alerts/new")}>
      <PlusIcon class="mr-2 size-4" />
      Create Alert
    </Button>
  </div>

  <!-- Alert Configs Grid -->
  {#if !loading && configs.length === 0}
    <div class="flex flex-col items-center gap-4 py-16 text-center">
      <BellOffIcon class="text-muted-foreground size-16" />
      <div class="space-y-2">
        <h3 class="text-lg font-semibold">No alert configurations</h3>
        <p class="text-muted-foreground text-sm">
          {monitorFilter
            ? "No alerts found for this monitor."
            : "Create an alert to get notified when your monitors have issues."}
        </p>
      </div>
      <Button onclick={() => goto("/manage/app/alerts/new")}>
        <PlusIcon class="mr-2 size-4" />
        Create Alert
      </Button>
    </div>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each configs as config (config.id)}
        <div class="bg-card rounded-lg border p-4 {config.is_active === GC.NO ? 'opacity-60' : ''}">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant={getSeverityBadgeVariant(config.severity)}>
                {config.severity}
              </Badge>
              <Badge variant="outline">{config.alert_for}</Badge>
              {#if config.is_active === GC.NO}
                <Badge variant="outline" class="text-muted-foreground">Inactive</Badge>
              {/if}
            </div>
            <Switch checked={config.is_active === GC.YES} onCheckedChange={() => toggleAlertStatus(config)} />
          </div>

          <div class="mt-3 space-y-2">
            <a
              href="/manage/app/monitors/{config.monitor_tag}"
              class="text-primary text-sm font-medium hover:underline"
            >
              {config.monitor_tag}
            </a>

            <p class="text-muted-foreground text-sm">{getAlertDescription(config)}</p>

            {#if config.alert_description}
              <p class="text-muted-foreground text-xs italic">{config.alert_description}</p>
            {/if}

            {#if config.create_incident === GC.YES}
              <Badge variant="outline" class="text-xs">Creates Incident</Badge>
            {/if}

            {#if config.triggers && config.triggers.length > 0}
              <div class="flex flex-wrap gap-1 pt-1">
                {#each config.triggers as trigger (trigger.id)}
                  <Badge variant="secondary" class="text-xs">
                    {trigger.name}
                  </Badge>
                {/each}
              </div>
            {/if}
          </div>

          <div class="mt-4 flex items-center gap-2 border-t pt-3">
            <Button variant="outline" size="sm" class="flex-1" onclick={() => goto(`/manage/app/alerts/${config.id}`)}>
              <EditIcon class="mr-1 size-3" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="flex-1"
              onclick={() => goto(`/manage/app/alerts/logs/${config.id}`)}
            >
              <ListIcon class="mr-1 size-3" />
              Logs
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

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
