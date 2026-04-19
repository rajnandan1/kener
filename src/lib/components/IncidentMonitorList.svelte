<script lang="ts">
  /*
   * Incident list wrapper. Each incident renders inside a Console-style
   * `public-panel` card (rounded-xl, zinc-800 border, `bg-zinc-950`)
   * with the same `p-3 sm:p-4` padding the home status page uses for
   * its incident / maintenance panels. Keeps the visual rhythm
   * identical across both surfaces.
   */
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import type { IncidentForMonitorListWithComments } from "$lib/server/types/db";

  interface Props {
    incidents: IncidentForMonitorListWithComments[];
    title: string;
    class?: string;
  }

  let { incidents }: Props = $props();
</script>

{#each incidents as incident (incident.id)}
  <div class="public-panel p-3 sm:p-4">
    <IncidentItem {incident} />
  </div>
{/each}
