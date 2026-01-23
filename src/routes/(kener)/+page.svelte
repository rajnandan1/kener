<script lang="ts">
  import Bell from "@lucide/svelte/icons/bell";

  import * as Item from "$lib/components/ui/item/index.js";

  import EventsCard from "$lib/components/EventsCard.svelte";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import IncidentMonitorList from "$lib/components/IncidentMonitorList.svelte";
  import AllMaintenanceMonitorGrid from "$lib/components/AllMaintenanceMonitorGrid.svelte";
  import { Badge } from "$lib/components/ui/badge/index.js";

  let { data } = $props();
</script>

<!-- gap -->
<svelte:head>
  <title>{data.pageDetails?.page_title || "Status Page"}</title>
</svelte:head>

<!-- page title -->
<div class="flex flex-col gap-3">
  <div>
    <Item.Root>
      {#if data.pageDetails?.page_logo}
        <Item.Media>
          <Avatar.Root class="size-10">
            <Avatar.Image src={data.pageDetails.page_logo} />
            <Avatar.Fallback></Avatar.Fallback>
          </Avatar.Root>
        </Item.Media>
      {/if}
      <Item.Content>
        {#if data.pageDetails?.page_header}
          <Item.Title class="text-3xl">{data.pageDetails.page_header}</Item.Title>
        {/if}
        {#if data.pageDetails?.page_subheader}
          <Item.Description class="text-muted-foreground">{data.pageDetails.page_subheader}</Item.Description>
        {/if}
      </Item.Content>
    </Item.Root>
  </div>

  <ThemePlus
    monitor_tags={data.monitorTags}
    showPagesDropdown={true}
    showEventsButton={true}
    currentPath={data.pageDetails?.page_path || "/"}
  />

  <EventsCard
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
</div>
