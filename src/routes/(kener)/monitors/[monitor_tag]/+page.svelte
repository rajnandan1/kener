<script lang="ts">
  import { format } from "date-fns";
  import * as Item from "$lib/components/ui/item/index.js";

  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import IncidentMonitorList from "$lib/components/IncidentMonitorList.svelte";
  import AllMaintenanceMonitorGrid from "$lib/components/AllMaintenanceMonitorGrid.svelte";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import MonitorOverview from "$lib/components/MonitorOverview.svelte";

  let { data } = $props();

  // State
  let descriptionExpanded = $state(false);
</script>

<div class="container mx-auto px-4 py-8">
  <!-- Monitor Header -->
  <Item.Root class="mb-6">
    {#if data.monitorImage}
      <Item.Media>
        <Avatar.Root class="size-10">
          <Avatar.Image src={data.monitorImage} />
          <Avatar.Fallback></Avatar.Fallback>
        </Avatar.Root>
      </Item.Media>
    {/if}
    <Item.Content>
      {#if data.monitorName}
        <Item.Title class="text-3xl">{data.monitorName}</Item.Title>
      {/if}
      {#if data.monitorDescription}
        <Item.Description
          class="text-muted-foreground w-full {descriptionExpanded ? 'line-clamp-none' : ''} text-pretty"
        >
          {#if data.monitorDescription.length > 150 && !descriptionExpanded}
            {data.monitorDescription.slice(0, 150)}...
            <button class="inline font-bold hover:underline" onclick={() => (descriptionExpanded = true)}
              >Read more</button
            >
          {:else if data.monitorDescription.length > 150}
            {data.monitorDescription}
            <button class="inline font-bold hover:underline" onclick={() => (descriptionExpanded = false)}>
              Read less
            </button>
          {:else}
            {data.monitorDescription}
          {/if}
        </Item.Description>
      {/if}
    </Item.Content>
  </Item.Root>

  <div class="my-4 flex justify-end gap-2">
    <ThemePlus
      showHomeButton={true}
      showEventsButton={true}
      monitor_tags={[data.monitorTag]}
      shareLinkString={data.monitorTag}
      embedMonitorTag={data.monitorTag}
    />
  </div>

  <!-- Status Card -->
  <div class="mb-4">
    <div class="bg-background flex flex-col justify-start gap-y-3 rounded-3xl border p-4">
      <div class="flex flex-col px-2">
        <h2 class="text-base font-medium">Last Updated</h2>
        <p class="text-muted-foreground text-xs">
          {format(new Date(data.monitorLastStatusTimestamp * 1000), "PPpp")}
        </p>
      </div>
      <div class="flex items-center justify-between px-2">
        <div class="flex flex-col items-start gap-1">
          <p class="text-muted-foreground text-2xl font-semibold {data.textClass}">
            {data.monitorLastStatus}
          </p>
          <p class="text-muted-foreground text-xs">Latest Status</p>
        </div>
        <div class="flex flex-col items-end gap-1">
          <p class="text-right text-2xl font-semibold">
            {data.monitorLastLatency}
          </p>
          <p class="text-muted-foreground text-xs">Latest Latency</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ongoing incidents -->
  <IncidentMonitorList incidents={data.ongoingIncidents} title="Ongoing Incidents" class="mb-4" />

  <!-- Maintenance -->
  <AllMaintenanceMonitorGrid
    ongoingMaintenances={data.ongoingMaintenances}
    upcomingMaintenances={data.upcomingMaintenances}
    pastMaintenances={data.pastMaintenances}
    class="mb-4"
  />

  <!-- Calendar View (self-contained component with its own API call) -->
  <MonitorOverview monitorTag={data.monitorTag} class="mb-4" />

  <!-- recent incidents -->
  <IncidentMonitorList incidents={data.resolvedIncidents} title="Recent Incidents" class="mt-4 mb-4" />
</div>
