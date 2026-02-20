<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import type { IncidentForMonitorListWithComments } from "$lib/server/types/db";

  interface Props {
    incidents: IncidentForMonitorListWithComments[];
    title: string;
    class?: string;
  }

  let { incidents, title, class: className = "" }: Props = $props();
</script>

{#each incidents as incident (incident.id)}
  <div class=" rounded-3xl border p-3 sm:p-4">
    <IncidentItem {incident} />
  </div>
{/each}
