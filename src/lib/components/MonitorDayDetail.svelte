<script lang="ts">
  import { t } from "$lib/stores/i18n";
  import { resolve } from "$app/paths";
  import { IconActivityHeartbeat, IconAlertTriangle, IconTool } from "@tabler/icons-svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import LoaderBoxes from "$lib/components/loaderbox.svelte";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
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
  let activeView = $state<"status" | "incidents" | "maintenances">("status");
  let lastTrackedView = $state<"status" | "incidents" | "maintenances">("status");
  let dayDetailData = $state<DayDetailData | null>(null);
  let dayIncidentsData = $state<IncidentForMonitorListWithComments[]>([]);
  let dayMaintenancesData = $state<MaintenanceEventsMonitorList[]>([]);

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

  // Fetch day incident data
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
  <Dialog.Content class="max-h-[90vh] overflow-y-auto p-4 sm:max-w-[46.5rem] sm:p-6">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2 text-base sm:text-lg">
        <span class="truncate">
          {selectedDay ? $formatDate(new Date(selectedDay.timestamp * 1000), page.data.dateAndTimeFormat.dateOnly) : ""}
        </span>
      </Dialog.Title>
      <Dialog.Description class="text-xs sm:text-sm"
        >{$t("Minute-by-minute status data for this day")}</Dialog.Description
      >
    </Dialog.Header>

    <Tabs.Root value={activeView} class="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <Tabs.List
        class="scrollbar-hidden h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-zinc-800 px-2 py-2"
      >
        <Tabs.Trigger value="status" class="shrink-0 px-3 py-1.5 text-sm">
          <IconActivityHeartbeat class="h-4 w-4" />
          {$t("Status")}</Tabs.Trigger
        >
        <Tabs.Trigger value="incidents" class="shrink-0 px-3 py-1.5 text-sm">
          <IconAlertTriangle class="h-4 w-4" />
          {$t("Incidents")}</Tabs.Trigger
        >
        <Tabs.Trigger value="maintenances" class="shrink-0 px-3 py-1.5 text-sm">
          <IconTool class="h-4 w-4" />
          {$t("Maintenances")}</Tabs.Trigger
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
