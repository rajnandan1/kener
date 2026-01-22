<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import IncidentItem from "$lib/components/IncidentItem.svelte";

  interface IncidentMonitorImpact {
    monitor_tag: string;
    monitor_impact: string;
    monitor_name: string;
    monitor_image: string | null;
  }

  interface Incident {
    id: number;
    title: string;
    monitors: IncidentMonitorImpact[];
    start_date_time: number;
    end_date_time?: number | null;
  }

  interface Props {
    incidents: Incident[];
    title: string;
    class?: string;
  }

  let { incidents, title, class: className = "" }: Props = $props();
</script>

{#if incidents && incidents.length > 0}
  <div class="bg-background rounded-3xl border p-0 {className}">
    <div class="flex items-center justify-between p-4">
      <Badge variant="secondary" class="gap-1">{title}</Badge>
    </div>
    <div class="">
      {#each incidents as incident (incident.id)}
        <div class="border-b p-4 last:border-b-0">
          <IncidentItem {incident} />
        </div>
      {/each}
    </div>
  </div>
{/if}
