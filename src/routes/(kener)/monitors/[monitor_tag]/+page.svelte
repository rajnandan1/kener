<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { t } from "$lib/stores/i18n";
  import { formatDate } from "$lib/stores/datetime";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import IncidentMonitorList from "$lib/components/IncidentMonitorList.svelte";
  import AllMaintenanceMonitorGrid from "$lib/components/AllMaintenanceMonitorGrid.svelte";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import MonitorOverview from "$lib/components/MonitorOverview.svelte";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import clientResolver from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";
  import GroupMonitorPopover from "$lib/components/GroupMonitorPopover.svelte";
  import trackEvent from "$lib/beacon";
  import { selectedTimezone } from "$lib/stores/timezone";
  import { getEndOfDayAtTz } from "$lib/client/datetime";
  let { data } = $props();

  // State
  let descriptionExpanded = $state(false);

  function toggleDescription(expanded: boolean) {
    descriptionExpanded = expanded;
    trackEvent("monitor_description_toggled", { expanded, monitorTag: data.monitorTag });
  }

  function trackExternalLinkClick() {
    trackEvent("monitor_external_link_clicked", { monitorTag: data.monitorTag });
  }

  let endOfDayTodayAtTz = $derived(getEndOfDayAtTz($selectedTimezone));
</script>

<svelte:head>
  <title>{data.monitorName + " - " + data.siteName}</title>
  <!-- meta description -->
  {#if data.monitorDescription}
    <meta name="description" content={data.monitorDescription} />
  {/if}
</svelte:head>
<div class="flex flex-col gap-3">
  <ThemePlus
    showHomeButton={true}
    showEventsButton={true}
    monitor_tags={[data.monitorTag]}
    embedMonitorTag={data.monitorTag}
  />
  <div class="flex flex-col gap-2 px-4 py-2">
    {#if data.monitorImage}
      <img
        src={clientResolver(resolve, data.monitorImage)}
        alt={data.monitorName || "Monitor icon"}
        class="aspect-auto w-12 rounded object-cover"
      />
    {/if}
    <Item.Root class="px-0 py-0 ">
      <Item.Content>
        {#if data.monitorName}
          <Item.Title class="text-3xl">{data.monitorName}</Item.Title>
        {/if}
        {#if data.monitorDescription}
          <div class="">
            <Item.Description
              class="text-muted-foreground w-full {descriptionExpanded ? 'line-clamp-none' : ''} text-pretty"
            >
              {#if data.monitorDescription.length > 150 && !descriptionExpanded}
                {data.monitorDescription.slice(0, 150)}...
                <button
                  class="text-accent-foreground inline font-medium hover:underline"
                  onclick={() => toggleDescription(true)}
                >
                  {$t("Read more")}
                </button>
              {:else if data.monitorDescription.length > 150}
                {data.monitorDescription}
                <button
                  class="text-accent-foreground inline font-medium hover:underline"
                  onclick={() => toggleDescription(false)}
                >
                  {$t("Read less")}
                </button>
              {:else}
                {data.monitorDescription}
              {/if}
            </Item.Description>
          </div>
        {/if}
      </Item.Content>
    </Item.Root>
  </div>
  <div class="bg-background flex flex-col justify-start gap-y-3 rounded-3xl border p-4">
    <div class="relative flex flex-col px-2">
      <h2 class="text-base font-medium">{$t("Last Updated")}</h2>
      <p class="text-muted-foreground text-xs">
        <span>{$formatDate(data.monitorLastStatusTimestamp * 1000, "PPpp")}</span>
      </p>
      {#if !!data.externalUrl}
        <Button
          variant="outline"
          size="icon-sm"
          class="rounded-btn absolute top-0 right-0"
          href={data.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          onclick={trackExternalLinkClick}
        >
          <ArrowUpRight class="size-4" />
        </Button>
      {/if}
    </div>
    <div class="flex items-center justify-between px-2">
      <div class="flex flex-col items-start gap-1">
        <p class="text-muted-foreground text-2xl font-semibold {data.textClass}">
          {$t(data.monitorLastStatus)}
        </p>
        <p class="text-muted-foreground text-xs">{$t("Latest Status")}</p>
      </div>
      {#if !!data.monitorLastLatency}
        <div class="flex flex-col items-end gap-1">
          <p class="text-right text-2xl font-semibold">
            {data.monitorLastLatency}
          </p>
          <p class="text-muted-foreground text-xs">{$t("Latest Latency")}</p>
        </div>
      {/if}
    </div>
  </div>
  <IncidentMonitorList incidents={data.ongoingIncidents} title={$t("Ongoing Incidents")} class="mb-4" />

  <!-- Maintenance -->
  <AllMaintenanceMonitorGrid
    ongoingMaintenances={data.ongoingMaintenances}
    upcomingMaintenances={data.upcomingMaintenances}
    pastMaintenances={data.pastMaintenances}
    class="mb-4"
  />

  <!-- Calendar View (self-contained component with its own API call) -->
  <MonitorOverview monitorTag={data.monitorTag} maxDays={data.maxDays} class="mb-4" />

  {#if data.extendedTags.length > 0}
    <div class="mb-4">
      <GroupMonitorPopover tags={data.extendedTags} days={data.maxDays} {endOfDayTodayAtTz}>
        Available Monitors ({data.extendedTags.length})
      </GroupMonitorPopover>
    </div>
  {/if}

  <!-- recent incidents -->
  <IncidentMonitorList incidents={data.resolvedIncidents} title="Recent Incidents" class="mt-4 mb-4" />
</div>
