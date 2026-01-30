<script lang="ts">
  import Bell from "@lucide/svelte/icons/bell";

  import * as Item from "$lib/components/ui/item/index.js";

  import EventsCard from "$lib/components/EventsCard.svelte";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import IncidentMonitorList from "$lib/components/IncidentMonitorList.svelte";
  import AllMaintenanceMonitorGrid from "$lib/components/AllMaintenanceMonitorGrid.svelte";
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import mdToHTML from "$lib/marked.js";

  let { data } = $props();
</script>

<!-- gap -->
<svelte:head>
  <title>{data.pageDetails?.page_title || "Status Page"}</title>
</svelte:head>

<!-- page title -->
<div class="flex flex-col gap-3">
  <ThemePlus
    monitor_tags={data.monitorTags}
    showPagesDropdown={true}
    showEventsButton={true}
    currentPath={data.pageDetails?.page_path || "/"}
  />
  <div class="px-4 py-2">
    {#if data.pageDetails?.page_logo}
      <img src={data.pageDetails.page_logo} alt="Page Logo" class="aspect-auto h-12 rounded object-cover" />
    {/if}
    <Item.Root class="px-0 py-0">
      <Item.Content>
        {#if data.pageDetails?.page_header}
          <Item.Title class="text-3xl">{data.pageDetails.page_header}</Item.Title>
        {/if}
        {#if data.pageDetails?.page_subheader}
          <div class="">
            <div class="prose prose-sm dark:prose-invert max-w-none">
              {@html mdToHTML(data.pageDetails.page_subheader)}
            </div>
          </div>
        {/if}
      </Item.Content>
    </Item.Root>
  </div>

  <EventsCard
    pageSettings={data.pageDetails.page_settings}
    ongoingMaintenancesCount={data.ongoingMaintenances.length}
    ongoingIncidentsCount={data.ongoingIncidents.length}
    upcomingMaintenancesCount={data.upcomingMaintenances.length}
    statusClass={data.pageStatus.statusClass}
    statusText={data.pageStatus.statusSummary}
  />
  <IncidentMonitorList incidents={data.ongoingIncidents} title="Ongoing Incidents" />
  <AllMaintenanceMonitorGrid
    ongoingMaintenances={data.ongoingMaintenances}
    upcomingMaintenances={data.upcomingMaintenances}
    pastMaintenances={data.pastMaintenances}
  />
  <div class="flex flex-col">
    <div class="flex flex-col rounded-3xl border">
      <div class="flex items-center justify-between p-4">
        <Badge variant="secondary" class="gap-1">Available Components</Badge>
      </div>
      {#each data.monitorTags as tag, i}
        <div class="{i < data.monitorTags.length - 1 ? 'border-b' : ''} py-2 pb-4">
          <MonitorBar {tag} localTz={data.localTz} />
        </div>
      {/each}
    </div>
  </div>

  <!-- Recent Concluded Incidents -->
  {#if data.recentConcludedMaintenances && data.recentConcludedMaintenances.length > 0}
    <div class="flex flex-col gap-3 rounded-3xl border">
      <div class="p-4">
        <Badge variant="secondary" class="gap-1">Recent Incidents</Badge>
      </div>
      <div class="flex flex-col gap-3">
        {#each data.recentConcludedMaintenances as incident}
          <div class="border-b p-4 last:border-0">
            <IncidentItem {incident} />
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
