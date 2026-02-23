<script lang="ts">
  import { t } from "$lib/stores/i18n";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";

  import { resolve } from "$app/paths";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Clock from "@lucide/svelte/icons/clock";
  import Activity from "@lucide/svelte/icons/activity";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import LoaderBoxes from "$lib/components/loaderbox.svelte";
  import constants from "$lib/global-constants.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { page } from "$app/state";
  import { AreaChart, Area, LinearGradient } from "layerchart";
  import { curveCatmullRom } from "d3-shape";
  import { scaleOrdinal, scaleSequential, scaleTime } from "d3-scale";
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import MaintenanceItem from "$lib/components/MaintenanceItem.svelte";
  import MinuteGrid from "$lib/components/MinuteGrid.svelte";
  import clientResolver from "$lib/client/resolver.js";

  import * as Chart from "$lib/components/ui/chart/index.js";
  import type { IncidentForMonitorListWithComments, MaintenanceEventsMonitorList } from "$lib/server/types/db";
  import { formatDate } from "$lib/stores/datetime";
  import trackEvent from "$lib/beacon";

  interface DayDetailData {
    minutes: Array<{
      timestamp: number;
      status: string;
    }>;
    uptime: string;
  }

  interface DayLatencyData {
    minutes: Array<{
      timestamp: number;
      latency: number;
    }>;
    avgLatency: string;
  }

  interface Props {
    open: boolean;
    monitorTag: string;
    selectedDay: {
      timestamp: number;
      status: string;
    } | null;
  }

  let { open = $bindable(), monitorTag, selectedDay }: Props = $props();

  let loading = $state(false);
  let latencyLoading = $state(false);
  let incidentsLoading = $state(false);
  let maintenancesLoading = $state(false);
  let activeView = $state<"status" | "latency" | "incidents" | "maintenances">("status");
  let lastTrackedView = $state<"status" | "latency" | "incidents" | "maintenances">("status");
  let dayDetailData = $state<DayDetailData | null>(null);
  let dayLatencyData = $state<DayLatencyData | null>(null);
  let dayIncidentsData = $state<IncidentForMonitorListWithComments[]>([]);
  let dayMaintenancesData = $state<MaintenanceEventsMonitorList[]>([]);
  // Chart config for latency
  const chartConfig = {
    latency: {
      label: "Latency",
      color: "var(--chart-1)"
    }
  } satisfies Chart.ChartConfig;

  // Transform latency data for chart
  let chartData = $derived.by(() => {
    if (!dayLatencyData?.minutes) return [];
    return dayLatencyData.minutes
      .filter((d) => d.latency > 0)
      .map((d) => ({
        date: new Date(d.timestamp * 1000),
        latency: d.latency
      }));
  });

  // Fetch day detail data
  async function fetchDayDetail() {
    if (!selectedDay) return;

    loading = true;
    dayDetailData = null;
    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/monitor-day-status"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: monitorTag,
          dayTimestamp: selectedDay.timestamp,
          startOfDayTodayAtTz: selectedDay.timestamp,
          nowAtTz: Math.min(selectedDay.timestamp + 86400 - 60, page.data.nowAtTz)
        })
      });
      if (response.ok) {
        dayDetailData = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch day detail:", error);
    } finally {
      loading = false;
    }
  }

  // Fetch day latency data
  async function fetchDayLatency() {
    if (!selectedDay) return;

    latencyLoading = true;
    dayLatencyData = null;
    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/monitor-day-latency"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: monitorTag,
          startOfDayTodayAtTz: selectedDay.timestamp,
          nowAtTz: Math.min(selectedDay.timestamp + 86400 - 60, page.data.nowAtTz)
        })
      });
      if (response.ok) {
        dayLatencyData = await response.json();
      }
    } catch (error) {
      console.error("Failed to fetch day latency:", error);
    } finally {
      latencyLoading = false;
    }
  }

  //// Fetch day incident data
  async function fetchDayIncidents() {
    if (!selectedDay) return;

    incidentsLoading = true;
    dayIncidentsData = [];
    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/monitor-day-incidents"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: monitorTag,
          startOfDayTodayAtTz: selectedDay.timestamp,
          nowAtTz: Math.min(selectedDay.timestamp + 86400 - 60, page.data.nowAtTz)
        })
      });
      if (response.ok) {
        const result = await response.json();
        dayIncidentsData = result.incidents;
      }
    } catch (error) {
      console.error("Failed to fetch day incidents:", error);
    } finally {
      incidentsLoading = false;
    }
  }

  // Fetch day maintenance data
  async function fetchDayMaintenances() {
    if (!selectedDay) return;

    maintenancesLoading = true;
    dayMaintenancesData = [];
    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/monitor-day-maintenances"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: monitorTag,
          startOfDayTodayAtTz: selectedDay.timestamp,
          nowAtTz: Math.min(selectedDay.timestamp + 86400 - 60, page.data.nowAtTz)
        })
      });
      if (response.ok) {
        const result = await response.json();
        dayMaintenancesData = result.maintenances;
      }
    } catch (error) {
      console.error("Failed to fetch day maintenances:", error);
    } finally {
      maintenancesLoading = false;
    }
  }

  // Fetch data when dialog opens with a new day
  $effect(() => {
    if (open && selectedDay) {
      fetchDayDetail();
      fetchDayLatency();
      fetchDayIncidents();
      fetchDayMaintenances();
    }
  });

  $effect(() => {
    if (open && activeView !== lastTrackedView) {
      trackEvent("monitor_day_tab_changed", { view: activeView, monitorTag });
      lastTrackedView = activeView;
    }
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Overlay class="backdrop-blur-[2px]" />
  <Dialog.Content class="max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:max-w-[46.5rem] sm:p-6">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2 text-base sm:text-lg">
        <Activity class="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
        <span class="truncate">
          {selectedDay ? $formatDate(new Date(selectedDay.timestamp * 1000), "EEEE, MMMM do, yyyy") : ""}
        </span>
      </Dialog.Title>
      <Dialog.Description class="text-xs sm:text-sm"
        >{$t("Minute-by-minute status data for this day")}</Dialog.Description
      >
    </Dialog.Header>

    <Tabs.Root value={activeView} class="bg-background ktabs w-full   overflow-hidden rounded-3xl border">
      <Tabs.List
        class="scrollbar-hidden h-auto w-full justify-start gap-1 overflow-x-auto rounded-none px-2 py-2 sm:justify-end"
      >
        <Tabs.Trigger value="status" class="shrink-0 rounded-3xl px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm"
          >{$t("Status")}</Tabs.Trigger
        >
        <Tabs.Trigger value="latency" class="shrink-0 rounded-3xl px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm"
          >{$t("Latency")}</Tabs.Trigger
        >
        <Tabs.Trigger value="incidents" class="shrink-0 rounded-3xl px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm"
          >{$t("Incidents")}</Tabs.Trigger
        >
        <Tabs.Trigger value="maintenances" class="shrink-0 rounded-3xl px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm"
          >{$t("Maintenances")}</Tabs.Trigger
        >
      </Tabs.List>
      <!-- status view -->
      <Tabs.Content value="status" class="p-2 sm:p-4">
        {#if loading}
          <!-- Loading state -->
          <div class="space-y-4 py-4">
            <div class="flex items-center justify-between">
              <Skeleton class="h-6 w-32" />
              <Skeleton class="h-6 w-24" />
            </div>
            <div class="flex flex-wrap">
              <LoaderBoxes />
            </div>
          </div>
        {:else if dayDetailData}
          <MinuteGrid minutes={dayDetailData.minutes} uptime={dayDetailData.uptime} />
        {:else}
          <div class="py-8 text-center">
            <p class="text-muted-foreground">
              {$t("Failed to load status data for this day")}
            </p>
          </div>
        {/if}
      </Tabs.Content>
      <Tabs.Content value="latency" class="p-2 sm:p-4">
        {#if latencyLoading}
          <!-- Loading state -->
          <div class="space-y-4 py-4">
            <div class="flex items-center justify-between">
              <Skeleton class="h-6 w-32" />
              <Skeleton class="h-6 w-24" />
            </div>
            <Skeleton class="h-64 w-full" />
          </div>
        {:else if dayLatencyData && chartData.length > 0}
          <div class="space-y-4">
            <!-- Average latency -->
            <div class="text-foreground mb-2 flex items-center justify-between text-sm font-medium">
              <p>{$t("Latency Over Time")}</p>
              <div class="flex items-center gap-1">
                <Tooltip.Root>
                  <Tooltip.Trigger class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    {dayLatencyData.avgLatency}
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p>{$t("Average Latency")}</p>
                  </Tooltip.Content>
                </Tooltip.Root>
              </div>
            </div>

            <!-- Latency chart -->
            <Chart.Container config={chartConfig} class="min-h-48 w-full sm:min-h-64">
              <AreaChart
                data={chartData}
                x="date"
                xScale={scaleTime()}
                y="latency"
                yDomain={[0, null]}
                yNice
                axis="x"
                grid={false}
                series={[
                  {
                    key: "latency",
                    label: $t("Latency"),
                    color: "var(--color-latency)"
                  }
                ]}
                props={{
                  area: {
                    curve: curveCatmullRom,
                    "fill-opacity": 0.4,
                    line: { class: "stroke-1" }
                  },
                  xAxis: {
                    format: (d: Date) => $formatDate(d, "HH:mm")
                  }
                }}
              >
                {#snippet marks({ series, getAreaProps })}
                  {#each series as s, i (s.key)}
                    <LinearGradient
                      stops={[s.color ?? "", "color-mix(in lch, " + s.color + " 10%, transparent)"]}
                      vertical
                    >
                      {#snippet children({ gradient })}
                        <Area {...getAreaProps(s, i)} fill={gradient} />
                      {/snippet}
                    </LinearGradient>
                  {/each}
                {/snippet}
                {#snippet tooltip()}
                  <Chart.Tooltip hideLabel>
                    {#snippet formatter({ value, name, item })}
                      <div class="flex w-full items-start gap-2">
                        <div
                          style="--color-bg: {item.color}; --color-border: {item.color};"
                          class="mt-0.5 size-2.5 shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)"
                        ></div>
                        <div class="flex flex-1 flex-col items-start justify-between gap-1 leading-none">
                          <span class="text-muted-foreground text-xs">
                            {item.payload?.date ? $formatDate(item.payload.date, "HH:mm") : ""}
                          </span>
                          <div class="flex items-center gap-2">
                            <span class="text-foreground font-mono font-medium tabular-nums">
                              {Math.round(Number(value))} ms
                            </span>
                          </div>
                        </div>
                      </div>
                    {/snippet}
                  </Chart.Tooltip>
                {/snippet}
              </AreaChart>
            </Chart.Container>
          </div>
        {:else if dayLatencyData && chartData.length === 0}
          <div class="py-8 text-center">
            <p class="text-muted-foreground">{$t("No latency data available for this day")}</p>
          </div>
        {:else}
          <div class="py-8 text-center">
            <p class="text-muted-foreground">{$t("Failed to load latency data")}</p>
          </div>
        {/if}
      </Tabs.Content>
      <Tabs.Content value="incidents" class="p-2 sm:p-4">
        {#if incidentsLoading}
          <!-- Loading state -->
          <div class="space-y-4 py-4">
            <div class="flex items-center justify-between">
              <Skeleton class="h-6 w-32" />
              <Skeleton class="h-6 w-24" />
            </div>
            <Skeleton class="h-64 w-full" />
          </div>
        {:else if dayIncidentsData.length > 0}
          <div class="space-y-4">
            <!-- Incident list -->
            <div>
              <div class="scrollbar-hidden flex max-h-100 flex-col gap-4 overflow-y-auto">
                {#each dayIncidentsData as incident (incident.id)}
                  <div class="border-b pb-5 last:border-b-0">
                    <IncidentItem {incident} hideMonitors={true} showComments={false} showSummary={false} />
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {:else}
          <div class="py-8 text-center">
            <p class="text-muted-foreground">{$t("No incidents for this day")}</p>
          </div>
        {/if}
      </Tabs.Content>
      <Tabs.Content value="maintenances" class="p-2 sm:p-4">
        {#if maintenancesLoading}
          <!-- Loading state -->
          <div class="space-y-4 py-4">
            <div class="flex items-center justify-between">
              <Skeleton class="h-6 w-32" />
              <Skeleton class="h-6 w-24" />
            </div>
            <Skeleton class="h-64 w-full" />
          </div>
        {:else if dayMaintenancesData.length > 0}
          <div class="scrollbar-hidden flex max-h-100 flex-col gap-4 space-y-4 overflow-y-auto">
            {#each dayMaintenancesData as maintenance (maintenance.id)}
              <div class="border-b pb-5 last:border-b-0">
                <MaintenanceItem {maintenance} hideMonitors={true} />
              </div>
            {/each}
          </div>
        {:else}
          <div class="py-8 text-center">
            <p class="text-muted-foreground">{$t("No maintenances for this day")}</p>
          </div>
        {/if}
      </Tabs.Content>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
