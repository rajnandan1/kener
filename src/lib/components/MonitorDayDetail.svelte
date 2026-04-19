<script lang="ts">
  import { t } from "$lib/stores/i18n";
  import { resolve } from "$app/paths";
  import { IconActivityHeartbeat, IconAlertTriangle, IconTool } from "@tabler/icons-svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import LoaderBoxes from "$lib/components/loaderbox.svelte";
  import SlideTabs from "$lib/components/SlideTabs.svelte";
  import { page } from "$app/state";
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import MaintenanceItem from "$lib/components/MaintenanceItem.svelte";
  import MinuteGrid from "$lib/components/MinuteGrid.svelte";
  import clientResolver from "$lib/client/resolver.js";

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
  let incidentsLoading = $state(false);
  let maintenancesLoading = $state(false);
  let activeView = $state("status");
  let lastTrackedView = $state("status");
  let dayDetailData = $state<DayDetailData | null>(null);
  let dayIncidentsData = $state<IncidentForMonitorListWithComments[]>([]);
  let dayMaintenancesData = $state<MaintenanceEventsMonitorList[]>([]);

  const tabItems = [
    { id: "status", label: $t("Status"), icon: IconActivityHeartbeat },
    { id: "incidents", label: $t("Incidents"), icon: IconAlertTriangle },
    { id: "maintenances", label: $t("Maintenances"), icon: IconTool }
  ];

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

  $effect(() => {
    if (open && selectedDay) {
      fetchDayDetail();
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

<!--
  Day-detail dialog. Follows the Console's dialog primitive rhythm —
  header `px-6 pt-5 pb-4` with a 15 px medium title + 13 px zinc-400
  description, body `px-6 py-3`. The inner minute-grid card uses the
  same `rounded-xl border-zinc-800 bg-zinc-950` surface the Console
  uses for its dashboard sections.
-->
<Dialog.Root bind:open>
  <Dialog.Overlay class="backdrop-blur-[2px]" />
  <Dialog.Content class="max-h-[90vh] gap-0! overflow-hidden border-zinc-800! p-0! sm:max-w-[46.5rem]">
    <div class="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
      <Dialog.Header class="gap-1! text-start!">
        <Dialog.Title class="text-[15px] font-medium tracking-[-0.01em] text-zinc-50!">
          {selectedDay ? $formatDate(new Date(selectedDay.timestamp * 1000), page.data.dateAndTimeFormat.dateOnly) : ""}
        </Dialog.Title>
        <Dialog.Description class="text-[13px] leading-5 text-zinc-400!">
          {$t("Minute-by-minute status data for this day")}
        </Dialog.Description>
      </Dialog.Header>
    </div>

    <div class="overflow-y-auto px-6 pb-6">
      <div class="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <div class="border-b border-zinc-800 px-3 py-2.5">
          <SlideTabs tabs={tabItems} bind:active={activeView} />
        </div>

        <div class="p-3 sm:p-4">
        {#if activeView === "status"}
          {#if loading}
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
            <div class="px-6 py-10 text-center text-[13px] text-zinc-500">
              {$t("Failed to load status data for this day")}
            </div>
          {/if}
        {:else if activeView === "incidents"}
          {#if incidentsLoading}
            <div class="space-y-4 py-4">
              <div class="flex items-center justify-between">
                <Skeleton class="h-6 w-32" />
                <Skeleton class="h-6 w-24" />
              </div>
              <Skeleton class="h-64 w-full" />
            </div>
          {:else if dayIncidentsData.length > 0}
            <div class="scrollbar-hidden flex max-h-100 flex-col gap-4 overflow-y-auto">
              {#each dayIncidentsData as incident (incident.id)}
                <div class="border-b border-zinc-800/50 pb-4 last:border-b-0 last:pb-0">
                  <IncidentItem {incident} hideMonitors={true} showComments={false} showSummary={false} />
                </div>
              {/each}
            </div>
          {:else}
            <div class="px-6 py-10 text-center text-[13px] text-zinc-500">
              {$t("No incidents for this day")}
            </div>
          {/if}
        {:else if activeView === "maintenances"}
          {#if maintenancesLoading}
            <div class="space-y-4 py-4">
              <div class="flex items-center justify-between">
                <Skeleton class="h-6 w-32" />
                <Skeleton class="h-6 w-24" />
              </div>
              <Skeleton class="h-64 w-full" />
            </div>
          {:else if dayMaintenancesData.length > 0}
            <div class="scrollbar-hidden flex max-h-100 flex-col gap-4 overflow-y-auto">
              {#each dayMaintenancesData as maintenance (maintenance.id)}
                <div class="border-b border-zinc-800/50 pb-4 last:border-b-0 last:pb-0">
                  <MaintenanceItem {maintenance} hideMonitors={true} />
                </div>
              {/each}
            </div>
          {:else}
            <div class="px-6 py-10 text-center text-[13px] text-zinc-500">
              {$t("No maintenances for this day")}
            </div>
          {/if}
        {/if}
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
