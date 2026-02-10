<script lang="ts">
  import Check from "@lucide/svelte/icons/check";
  import type { PageSettingsType } from "$lib/server/types/db";
  import { t } from "$lib/stores/i18n";

  interface Props {
    ongoingMaintenancesCount: number;
    ongoingIncidentsCount: number;
    upcomingMaintenancesCount: number;
    statusClass: string;
    statusText: string;
    pageSettings: PageSettingsType | null;
  }

  let {
    ongoingMaintenancesCount,
    ongoingIncidentsCount,
    upcomingMaintenancesCount,
    statusClass,
    statusText,
    pageSettings
  }: Props = $props();
  // Compute change info (direction, color, and formatted value)

  //is maintenance show enabled
  let showMaintenance = $derived(pageSettings?.include_maintenances.enabled ?? false);
  let showIncidents = $derived(pageSettings?.incidents.enabled ?? false);
  let showAny = $derived(showMaintenance || showIncidents);
</script>

<div class="flex flex-col gap-3 lg:flex-row">
  <div class="flex min-h-20 w-full flex-row justify-start gap-y-3 rounded-3xl border p-4 lg:w-auto lg:min-w-72">
    <div class="flex w-full flex-row items-center gap-4">
      <div class="relative flex justify-between">
        <span class="relative flex size-4">
          <span class="{statusClass} absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
          <span class="{statusClass} relative inline-flex size-4 rounded-full"></span>
        </span>
      </div>
      <div class="flex min-w-0 flex-col items-start gap-2">
        <p class="text-xl leading-tight break-words sm:text-2xl">{$t(statusText)}</p>
      </div>
    </div>
  </div>
  {#if showAny}
    <div class="flex min-h-20 flex-1 flex-col justify-around gap-y-4 rounded-3xl border p-4">
      <div class="flex flex-wrap gap-3">
        {#if showIncidents}
          <div class="flex min-w-40 flex-1 flex-row items-center gap-2">
            {#if ongoingIncidentsCount === 0}
              <Check class="text-up" />
            {:else}
              <p class="text-2xl sm:text-3xl">
                {ongoingIncidentsCount}
              </p>
            {/if}
            <p class="text-xs leading-4 font-medium">
              {@html $t("Ongoing <br /> Incidents")}
            </p>
          </div>
        {/if}
        {#if showMaintenance}
          <div class="flex min-w-40 flex-1 flex-row items-center gap-2">
            {#if ongoingMaintenancesCount === 0}
              <Check class="text-up" />
            {:else}
              <p class="text-2xl sm:text-3xl">
                {ongoingMaintenancesCount}
              </p>
            {/if}

            <p class="text-xs leading-4 font-medium">
              {@html $t("Ongoing <br /> Maintenances")}
            </p>
          </div>

          <div class="flex min-w-40 flex-1 flex-row items-center gap-2">
            {#if upcomingMaintenancesCount === 0}
              <Check class="text-up" />
            {:else}
              <p class="text-2xl sm:text-3xl">
                {upcomingMaintenancesCount}
              </p>
            {/if}
            <p class="text-xs leading-4 font-medium">
              {@html $t("Upcoming <br /> Maintenances")}
            </p>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
