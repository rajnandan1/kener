<script lang="ts">
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import MaintenanceItem from "$lib/components/MaintenanceItem.svelte";
  import { t } from "$lib/stores/i18n";
  import type { PageData } from "./$types";
  import { setMode } from "mode-watcher";
  import { onMount } from "svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  const incidents = $derived(data.incidents ?? []);

  const maintenanceEvents = $derived(data.maintenance_events ?? []);
  const hasEvents = $derived(incidents.length > 0 || maintenanceEvents.length > 0);
  onMount(() => {
    if (data.theme) {
      setMode(data.theme === "dark" ? "dark" : "light");
    }
  });
</script>

<div class="flex flex-col gap-4 p-2">
  {#if incidents.length > 0}
    <div class="flex flex-col gap-3">
      {#each incidents as incident, i (incident.id ?? i)}
        <div class="rounded-2xl border p-3 sm:p-4">
          <IncidentItem {incident} showComments={false} />
        </div>
      {/each}
    </div>
  {/if}

  {#if maintenanceEvents.length > 0}
    <div class="flex flex-col gap-3">
      {#each maintenanceEvents as maintenance, i (maintenance.id ?? i)}
        <div class="rounded-2xl border p-3 sm:p-4">
          <MaintenanceItem {maintenance} />
        </div>
      {/each}
    </div>
  {/if}

  {#if !hasEvents}
    <section class="rounded-3xl border p-6 text-center">
      <p class="text-muted-foreground text-sm">
        {$t("There are no ongoing incidents or maintenance events.")}
      </p>
    </section>
  {/if}
</div>
