<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ICONS from "$lib/icons";
  import type { StatusType } from "$lib/global-constants";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import { t } from "$lib/stores/i18n";

  interface GroupMonitorItem {
    monitor_tag: string;
    position: number;
  }

  interface PageMonitorGroupItem {
    id: number;
    name: string;
    description: string | null;
    default_expanded: boolean;
    adopt_child_status: boolean;
    position: number;
    monitors: GroupMonitorItem[];
  }

  interface Props {
    group: PageMonitorGroupItem;
    days: number;
    endOfDayTodayAtTz: number;
    prefetchedDataByTag?: Record<string, MonitorBarResponse>;
    prefetchedErrorByTag?: Record<string, string>;
    latestStatusByTag?: Record<string, StatusType>;
    groupChildTagsByTag?: Record<string, string[]>;
    compact?: boolean;
    grid?: boolean;
  }

  let {
    group,
    days,
    endOfDayTodayAtTz,
    prefetchedDataByTag = {},
    prefetchedErrorByTag = {},
    latestStatusByTag = {},
    groupChildTagsByTag = {},
    compact = false,
    grid = false,
  }: Props = $props();

  let expanded = $state(false);
  let initializedGroupId = $state<number | null>(null);

  const STATUS_ICON = {
    UP: ICONS.UP,
    DOWN: ICONS.DOWN,
    DEGRADED: ICONS.DEGRADED,
    MAINTENANCE: ICONS.MAINTENANCE,
    NO_DATA: ICONS.MAINTENANCE,
  } as const;

  const STATUS_STROKE = {
    UP: "stroke-up",
    DOWN: "stroke-down",
    DEGRADED: "stroke-degraded",
    MAINTENANCE: "stroke-maintenance",
    NO_DATA: "stroke-muted-foreground",
  } as const;

  function resolveMonitorStatus(tag: string): StatusType {
    return prefetchedDataByTag[tag]?.currentStatus || latestStatusByTag[tag] || "NO_DATA";
  }

  function getAdoptedStatus(tags: string[]): StatusType {
    const statuses = tags.map(resolveMonitorStatus);

    if (statuses.length === 0 || statuses.every((status) => status === "NO_DATA")) {
      return "NO_DATA";
    }

    if (statuses.every((status) => status === "DOWN")) return "DOWN";
    if (statuses.includes("DOWN")) return "DEGRADED";
    if (statuses.includes("DEGRADED")) return "DEGRADED";
    if (statuses.includes("MAINTENANCE")) return "MAINTENANCE";
    if (statuses.includes("UP")) return "UP";

    return "NO_DATA";
  }

  let adoptedStatus = $derived(getAdoptedStatus(group.monitors.map((monitor) => monitor.monitor_tag)));
  let adoptedStatusIcon = $derived(STATUS_ICON[adoptedStatus]);

  $effect(() => {
    if (initializedGroupId !== group.id) {
      expanded = group.default_expanded;
      initializedGroupId = group.id;
    }
  });
</script>

<div class={`bg-background ${grid ? "" : ""}`}>
  <button
    type="button"
    class="hover:bg-muted/50 flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors"
    onclick={() => (expanded = !expanded)}
    aria-expanded={expanded}
  >
    <div class="min-w-0 flex-1">
      <div class="flex min-w-0 items-center gap-3">
        <p class="truncate text-sm font-semibold sm:text-base">{group.name}</p>
        <span class="text-muted-foreground shrink-0 text-xs">{group.monitors.length}</span>
      </div>
      {#if group.description}
        <p class="text-muted-foreground mt-1 line-clamp-2 text-xs sm:text-sm">{group.description}</p>
      {/if}
      <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
        {#if group.adopt_child_status}
          {@const StatusIcon = adoptedStatusIcon}
          <span class="inline-flex items-center gap-1 font-medium">
            <StatusIcon class={`size-3 ${STATUS_STROKE[adoptedStatus]}`} />
            {$t(adoptedStatus)}
          </span>
        {/if}
        <span class="text-muted-foreground">{expanded ? $t("Hide monitors") : $t("Show monitors")}</span>
      </div>
    </div>
    <ChevronDown class={`text-muted-foreground size-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
  </button>

  {#if expanded}
    <div class="bg-muted/20 border-t">
      {#if group.monitors.length === 0}
        <div class="text-muted-foreground px-3 py-4 text-sm">{$t("No monitors available.")}</div>
      {:else}
        {#each group.monitors as monitor, index (monitor.monitor_tag)}
          <div class={`px-3 py-3 ${index < group.monitors.length - 1 ? "border-b" : ""}`}>
            <MonitorBar
              tag={monitor.monitor_tag}
              prefetchedData={prefetchedDataByTag[monitor.monitor_tag]}
              prefetchedError={prefetchedErrorByTag[monitor.monitor_tag]}
              days={days}
              {endOfDayTodayAtTz}
              groupChildTags={groupChildTagsByTag[monitor.monitor_tag] || []}
              {groupChildTagsByTag}
              {compact}
            />
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
