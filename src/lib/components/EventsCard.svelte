<script lang="ts">
  import Check from "@lucide/svelte/icons/check";

  interface Props {
    ongoingMaintenancesCount: number;
    ongoingIncidentsCount: number;
    upcomingMaintenancesCount: number;
    statusClass: string;
    statusText: string;
  }

  let { ongoingMaintenancesCount, ongoingIncidentsCount, upcomingMaintenancesCount, statusClass, statusText }: Props =
    $props();
  // Compute change info (direction, color, and formatted value)
</script>

<div class="flex gap-3">
  <div class="flex h-20 flex-row justify-start gap-y-3 rounded-3xl border p-4">
    <div class="flex flex-row items-center gap-4">
      <div class="relative flex justify-between">
        <span class="relative flex size-4">
          <span class="{statusClass} absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
          <span class="{statusClass} relative inline-flex size-4 rounded-full"></span>
        </span>
      </div>
      <div class="flex flex-col items-start gap-2">
        <p class=" text-2xl">{statusText}</p>
      </div>
    </div>
  </div>

  <div class="flex h-20 flex-1 flex-col justify-around gap-y-4 rounded-3xl border p-4">
    <div class=" flex gap-x-3">
      <div class="flex flex-1 flex-row items-center gap-2">
        {#if ongoingIncidentsCount === 0}
          <Check class="text-up" />
        {:else}
          <p class="text-3xl">
            {ongoingIncidentsCount}
          </p>
        {/if}
        <p class="text-xs leading-4 font-medium">
          <span class="block">Ongoing</span>
          <span class="block">Incidents</span>
        </p>
      </div>
      <div class="flex flex-1 flex-row items-center gap-2">
        {#if ongoingMaintenancesCount === 0}
          <Check class="text-up" />
        {:else}
          <p class="text-3xl">
            {ongoingMaintenancesCount}
          </p>
        {/if}

        <p class="text-xs leading-4 font-medium">
          <span class="block">Ongoing</span>
          <span class="block">Maintenances</span>
        </p>
      </div>

      <div class="flex flex-1 flex-row items-center gap-2">
        {#if upcomingMaintenancesCount === 0}
          <Check class="text-up" />
        {:else}
          <p class="text-3xl">
            {upcomingMaintenancesCount}
          </p>
        {/if}
        <p class="text-xs leading-4 font-medium">
          <span class="block">Upcoming</span>
          <span class="block">Maintenances</span>
        </p>
      </div>
    </div>
  </div>
</div>
