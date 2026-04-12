<script lang="ts">
  import type { StatusType } from "$lib/global-constants";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import PageMonitorGroupSection from "$lib/components/PageMonitorGroupSection.svelte";

  type ViewType = "compact-list" | "default-list" | "default-grid" | "compact-grid" | undefined;

  type PageMonitorItem =
    | { kind: "monitor"; monitor_tag: string; position: number }
      | {
          kind: "group";
          id: number;
          name: string;
          description: string | null;
          default_expanded: boolean;
          adopt_child_status: boolean;
          position: number;
          monitors: Array<{ monitor_tag: string; position: number }>;
        };

  interface Props {
    items: PageMonitorItem[];
    prefetchedDataByTag?: Record<string, MonitorBarResponse>;
    prefetchedErrorByTag?: Record<string, string>;
    groupChildTagsByTag?: Record<string, string[]>;
    latestStatusByTag?: Record<string, StatusType>;
    days: number;
    endOfDayTodayAtTz: number;
    viewType?: ViewType;
  }

  let {
    items,
    prefetchedDataByTag = {},
    prefetchedErrorByTag = {},
    groupChildTagsByTag = {},
    latestStatusByTag = {},
    days,
    endOfDayTodayAtTz,
    viewType,
  }: Props = $props();

  let isCompact = $derived(viewType === "compact-list" || viewType === "compact-grid");

  function getGridItemSpanClass(index: number, total: number, type: ViewType, kind: PageMonitorItem["kind"]): string {
    if (kind === "group") {
      return type === "compact-grid" ? "sm:col-span-4 lg:col-span-6" : "md:col-span-4 lg:col-span-4";
    }

    if (type === "default-grid") {
      const mdLastRowCount = total % 2 || 2;
      const mdLastRowStart = total - mdLastRowCount;
      const isInMdLastRow = index >= mdLastRowStart;
      const mdSpan = isInMdLastRow && mdLastRowCount === 1 ? "md:col-span-4" : "md:col-span-2";

      const lgLastRowCount = total % 2 || 2;
      const lgLastRowStart = total - lgLastRowCount;
      const isInLgLastRow = index >= lgLastRowStart;
      const lgSpan = isInLgLastRow && lgLastRowCount === 1 ? "lg:col-span-4" : "lg:col-span-2";

      return `${mdSpan} ${lgSpan}`;
    }

    const smLastRowCount = total % 2 || 2;
    const smLastRowStart = total - smLastRowCount;
    const isInSmLastRow = index >= smLastRowStart;
    const smSpan = isInSmLastRow && smLastRowCount === 1 ? "sm:col-span-4" : "sm:col-span-2";

    const lgLastRowCount = total % 3 || 3;
    const lgLastRowStart = total - lgLastRowCount;
    const isInLgLastRow = index >= lgLastRowStart;
    const lgSpan = isInLgLastRow
      ? lgLastRowCount === 1
        ? "lg:col-span-6"
        : lgLastRowCount === 2
          ? "lg:col-span-3"
          : "lg:col-span-2"
      : "lg:col-span-2";

    return `${smSpan} ${lgSpan}`;
  }

  function getGridContainerClass(type: ViewType): string {
    if (type === "compact-grid") return "bg-border gap-px sm:grid-cols-4 lg:grid-cols-6";
    if (type === "default-grid") return "bg-border gap-px md:grid-cols-4 lg:grid-cols-4";
    return "";
  }
</script>

<div class="overflow-hidden rounded-3xl border">
  <div class={`grid grid-cols-1 ${getGridContainerClass(viewType)}`}>
    {#each items as item, index (`${item.kind}-${item.kind === "monitor" ? item.monitor_tag : item.id}`)}
      <div
        class="{viewType === 'compact-grid' || viewType === 'default-grid'
          ? `${getGridItemSpanClass(index, items.length, viewType, item.kind)} bg-background`
          : index < items.length - 1
            ? 'border-b'
            : ''} px-2 py-2 sm:px-0"
      >
        {#if item.kind === "monitor"}
          <MonitorBar
            tag={item.monitor_tag}
            prefetchedData={prefetchedDataByTag[item.monitor_tag]}
            prefetchedError={prefetchedErrorByTag[item.monitor_tag]}
            days={days}
            {endOfDayTodayAtTz}
            groupChildTags={groupChildTagsByTag[item.monitor_tag] || []}
            {groupChildTagsByTag}
            compact={isCompact}
            grid={viewType === "compact-grid" || viewType === "default-grid"}
          />
        {:else}
          <PageMonitorGroupSection
            group={item}
            prefetchedDataByTag={prefetchedDataByTag}
            prefetchedErrorByTag={prefetchedErrorByTag}
            latestStatusByTag={latestStatusByTag}
            {groupChildTagsByTag}
            days={days}
            {endOfDayTodayAtTz}
            compact={isCompact}
            grid={viewType === "compact-grid" || viewType === "default-grid"}
          />
        {/if}
      </div>
    {/each}
  </div>
</div>
