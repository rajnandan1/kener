<script lang="ts">
  import { t } from "$lib/stores/i18n";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import LoaderBoxes from "$lib/components/loaderbox.svelte";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { page } from "$app/state";
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import MaintenanceItem from "$lib/components/MaintenanceItem.svelte";
  import MinuteGrid from "$lib/components/MinuteGrid.svelte";
  import clientResolver from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";
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
    groupName: string;
    monitorTags: string[];
    selectedDay: {
      timestamp: number;
      status: string;
    } | null;
  }

  let { open = $bindable(), groupName, monitorTags, selectedDay }: Props = $props();

  let activeView = $state<"status" | "incidents" | "maintenances">("status");

  let requestBody = $derived.by(() => {
    if (!open || !selectedDay) return null;

    return {
      tags: monitorTags,
      startOfDayTodayAtTz: selectedDay.timestamp,
      nowAtTz: Math.min(selectedDay.timestamp + 86400 - 60, page.data.nowAtTz),
    };
  });

  async function fetchJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(clientResolver(resolve, path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${path}`);
    }

    return response.json() as Promise<T>;
  }

  let dayDetailPromise = $derived(
    requestBody ? fetchJson<DayDetailData>("/dashboard-apis/group-day-status", requestBody) : null,
  );
  let dayIncidentsPromise = $derived(
    requestBody
      ? fetchJson<{ incidents: IncidentForMonitorListWithComments[] }>("/dashboard-apis/group-day-incidents", requestBody)
      : null,
  );
  let dayMaintenancesPromise = $derived(
    requestBody
      ? fetchJson<{ maintenances: MaintenanceEventsMonitorList[] }>("/dashboard-apis/group-day-maintenances", requestBody)
      : null,
  );

  function handleTabChange(view: string) {
    activeView = view as "status" | "incidents" | "maintenances";
    if (open) {
      trackEvent("group_day_tab_changed", { view: activeView, groupName });
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Overlay class="backdrop-blur-[2px]" />
  <Dialog.Content class="max-h-[90vh] overflow-y-auto rounded-3xl p-4 sm:max-w-[46.5rem] sm:p-6">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2 text-base sm:text-lg">
        <span class="truncate">
          {selectedDay ? $formatDate(new Date(selectedDay.timestamp * 1000), page.data.dateAndTimeFormat.dateOnly) : ""}
        </span>
      </Dialog.Title>
      <Dialog.Description class="text-xs sm:text-sm">
        {$t("Minute-by-minute status data for this day")}
        {#if groupName}
          <span class="text-foreground/80"> · {groupName}</span>
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <Tabs.Root value={activeView} onValueChange={handleTabChange} class="bg-background ktabs w-full overflow-hidden rounded-3xl border">
      <Tabs.List
        class="scrollbar-hidden h-auto w-full justify-start gap-1 overflow-x-auto rounded-none px-2 py-2 sm:justify-end"
      >
        <Tabs.Trigger value="status" class="shrink-0 rounded-3xl px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm">
          {$t("Status")}
        </Tabs.Trigger>
        <Tabs.Trigger value="incidents" class="shrink-0 rounded-3xl px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm">
          {$t("Incidents")}
        </Tabs.Trigger>
        <Tabs.Trigger
          value="maintenances"
          class="shrink-0 rounded-3xl px-2 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm"
        >
          {$t("Maintenances")}
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="status" class="p-2 sm:p-4">
        {#if dayDetailPromise}
          {#await dayDetailPromise}
            <div class="space-y-4 py-4">
              <div class="flex items-center justify-between">
                <Skeleton class="h-6 w-32" />
                <Skeleton class="h-6 w-24" />
              </div>
              <div class="flex flex-wrap">
                <LoaderBoxes />
              </div>
            </div>
          {:then dayDetailData}
            <MinuteGrid minutes={dayDetailData.minutes} uptime={dayDetailData.uptime} />
          {:catch}
            <div class="py-8 text-center">
              <p class="text-muted-foreground">{$t("Failed to load status data for this day")}</p>
            </div>
          {/await}
        {:else}
          <div class="py-8 text-center">
            <p class="text-muted-foreground">{$t("Failed to load status data for this day")}</p>
          </div>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="incidents" class="p-2 sm:p-4">
        {#if dayIncidentsPromise}
          {#await dayIncidentsPromise}
            <div class="space-y-4 py-4">
              <div class="flex items-center justify-between">
                <Skeleton class="h-6 w-32" />
                <Skeleton class="h-6 w-24" />
              </div>
              <Skeleton class="h-64 w-full" />
            </div>
          {:then result}
            {#if result.incidents.length > 0}
              <div class="space-y-4">
                <div class="scrollbar-hidden flex max-h-100 flex-col gap-4 overflow-y-auto">
                  {#each result.incidents as incident (incident.id)}
                    <div class="border-b pb-5 last:border-b-0">
                      <IncidentItem {incident} hideMonitors={false} showComments={false} showSummary={false} />
                    </div>
                  {/each}
                </div>
              </div>
            {:else}
              <div class="py-8 text-center">
                <p class="text-muted-foreground">{$t("No incidents for this day")}</p>
              </div>
            {/if}
          {:catch}
            <div class="py-8 text-center">
              <p class="text-muted-foreground">{$t("No incidents for this day")}</p>
            </div>
          {/await}
        {:else}
          <div class="py-8 text-center">
            <p class="text-muted-foreground">{$t("No incidents for this day")}</p>
          </div>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="maintenances" class="p-2 sm:p-4">
        {#if dayMaintenancesPromise}
          {#await dayMaintenancesPromise}
            <div class="space-y-4 py-4">
              <div class="flex items-center justify-between">
                <Skeleton class="h-6 w-32" />
                <Skeleton class="h-6 w-24" />
              </div>
              <Skeleton class="h-64 w-full" />
            </div>
          {:then result}
            {#if result.maintenances.length > 0}
              <div class="scrollbar-hidden flex max-h-100 flex-col gap-4 space-y-4 overflow-y-auto">
                {#each result.maintenances as maintenance (maintenance.id)}
                  <div class="border-b pb-5 last:border-b-0">
                    <MaintenanceItem {maintenance} hideMonitors={false} />
                  </div>
                {/each}
              </div>
            {:else}
              <div class="py-8 text-center">
                <p class="text-muted-foreground">{$t("No maintenances for this day")}</p>
              </div>
            {/if}
          {:catch}
            <div class="py-8 text-center">
              <p class="text-muted-foreground">{$t("No maintenances for this day")}</p>
            </div>
          {/await}
        {:else}
          <div class="py-8 text-center">
            <p class="text-muted-foreground">{$t("No maintenances for this day")}</p>
          </div>
        {/if}
      </Tabs.Content>
    </Tabs.Root>
  </Dialog.Content>
</Dialog.Root>
