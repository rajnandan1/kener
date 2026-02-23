<script lang="ts">
  import { browser } from "$app/environment";
  import * as Item from "$lib/components/ui/item/index.js";
  import EventsCard from "$lib/components/EventsCard.svelte";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import MaintenanceItem from "$lib/components/MaintenanceItem.svelte";
  import mdToHTML from "$lib/marked.js";
  import clientResolver from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";
  import { selectedTimezone } from "$lib/stores/timezone";
  import { getEndOfDayAtTz } from "$lib/client/datetime";
  import { requestMonitorBar } from "$lib/client/monitor-bar-client";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import { SveltePurify } from "@humanspeak/svelte-purify";

  let { data } = $props();
  let pageSettings = $derived(data.pageDetails.page_settings);
  let barCount = $derived.by(() =>
    data.isMobile
      ? pageSettings?.monitor_status_history_days.mobile || 30
      : pageSettings?.monitor_status_history_days.desktop || 90
  );
  let endOfDayTodayAtTz = $derived(getEndOfDayAtTz($selectedTimezone));

  let monitorBarDataByTag = $state<Record<string, MonitorBarResponse>>({});
  let monitorBarErrorByTag = $state<Record<string, string>>({});
  let requestVersion = 0;
  let viewType = $derived<"compact-list" | "default-list" | "default-grid" | "compact-grid" | undefined>(
    pageSettings?.monitor_layout_style
  );
  let isCompact = $derived(viewType === "compact-list" || viewType === "compact-grid");

  function getGridItemSpanClass(index: number, total: number, type: typeof viewType): string {
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

  function getGridContainerClass(type: typeof viewType): string {
    if (type === "compact-grid") return "bg-border gap-px sm:grid-cols-4 lg:grid-cols-6";
    if (type === "default-grid") return "bg-border gap-px md:grid-cols-4 lg:grid-cols-4";
    return "";
  }

  $effect(() => {
    const tags = data.monitorTags || [];
    const days = barCount;
    const currentRequestVersion = ++requestVersion;

    monitorBarDataByTag = {};
    monitorBarErrorByTag = {};

    if (!browser || !tags.length) return;

    void Promise.all(
      tags.map(async (tag) => {
        try {
          const monitorBarData = await requestMonitorBar(tag, days, endOfDayTodayAtTz);
          return { tag, ok: true as const, monitorBarData };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          return { tag, ok: false as const, errorMessage };
        }
      })
    ).then((results) => {
      if (currentRequestVersion !== requestVersion) return;

      const nextDataByTag: Record<string, MonitorBarResponse> = {};
      const nextErrorByTag: Record<string, string> = {};

      for (const result of results) {
        if (result.ok) {
          nextDataByTag[result.tag] = result.monitorBarData;
        } else {
          nextErrorByTag[result.tag] = result.errorMessage;
        }
      }

      monitorBarDataByTag = nextDataByTag;
      monitorBarErrorByTag = nextErrorByTag;
    });
  });
</script>

<svelte:head>
  <title>{(data.pageDetails?.page_title || "Status Page") + " - " + data.siteName}</title>
</svelte:head>

<!-- page title -->
<div class="flex flex-col gap-3 sm:gap-4">
  <ThemePlus monitor_tags={data.monitorTags} />
  <div class="flex flex-col gap-2 px-3 py-2 sm:px-4">
    {#if data.pageDetails?.page_logo}
      <img
        src={clientResolver(resolve, data.pageDetails.page_logo)}
        alt="Page Logo"
        class="aspect-auto w-12 rounded object-cover"
      />
    {/if}
    <Item.Root class="px-0 py-0">
      <Item.Content>
        {#if data.pageDetails?.page_header}
          <Item.Title class="text-2xl sm:text-3xl">{data.pageDetails.page_header}</Item.Title>
        {/if}
        {#if data.pageDetails?.page_subheader}
          <div class="">
            <div class="prose prose-sm dark:prose-invert max-w-none">
              <SveltePurify html={mdToHTML(data.pageDetails.page_subheader)} />
            </div>
          </div>
        {/if}
      </Item.Content>
    </Item.Root>
  </div>

  <EventsCard statusClass={data.pageStatus.statusClass} statusText={data.pageStatus.statusSummary} />
  {#if data.ongoingIncidents && data.ongoingIncidents.length > 0}
    <div class="flex flex-col gap-3">
      {#each data.ongoingIncidents as incident, i (incident.id ?? i)}
        <div class=" rounded-3xl border p-3 sm:p-4">
          <IncidentItem {incident} />
        </div>
      {/each}
    </div>
  {/if}
  {#if data.ongoingMaintenances && data.ongoingMaintenances.length > 0}
    <div class="flex flex-col gap-3">
      {#each data.ongoingMaintenances as maintenance, i (maintenance.id ?? i)}
        <div class="rounded-3xl border p-3 sm:p-4">
          <MaintenanceItem {maintenance} />
        </div>
      {/each}
    </div>
  {/if}
  <div class="overflow-hidden rounded-3xl border">
    <div class={`grid grid-cols-1 ${getGridContainerClass(viewType)}`}>
      {#each data.monitorTags as tag, i (tag)}
        <div
          class="{viewType === 'compact-grid' || viewType === 'default-grid'
            ? `${getGridItemSpanClass(i, data.monitorTags.length, viewType)} bg-background`
            : i < data.monitorTags.length - 1
              ? 'border-b'
              : ''} px-2 py-2 sm:px-0"
        >
          <MonitorBar
            {tag}
            prefetchedData={monitorBarDataByTag[tag]}
            prefetchedError={monitorBarErrorByTag[tag]}
            days={barCount}
            {endOfDayTodayAtTz}
            groupChildTags={data.monitorGroupMembersByTag?.[tag] || []}
            compact={isCompact}
            grid={viewType === "compact-grid" || viewType === "default-grid"}
          />
        </div>
      {/each}
    </div>
  </div>
</div>
