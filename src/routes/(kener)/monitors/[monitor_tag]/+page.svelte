<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { t } from "$lib/stores/i18n";
  import { formatDate } from "$lib/stores/datetime";
  import { Button } from "$lib/components/ui/button/index.js";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import MonitorOverview from "$lib/components/MonitorOverview.svelte";
  import { IconArrowUpRight } from "@tabler/icons-svelte";
  import clientResolver from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";
  import trackEvent from "$lib/beacon";
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import MaintenanceItem from "$lib/components/MaintenanceItem.svelte";
  import { page } from "$app/state";
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
</script>

<svelte:head>
  <title>{data.monitorName + " - " + data.siteName}</title>
  <meta property="og:title" content={data.monitorName + " - " + data.siteName} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  {#if data.monitorDescription}
    <meta name="description" content={data.monitorDescription} />
    <meta property="og:description" content={data.monitorDescription} />
  {/if}
  {#if data.socialPreviewImage}
    <meta property="og:image" content={clientResolver(resolve, data.socialPreviewImage)} />
    <meta name="twitter:image" content={clientResolver(resolve, data.socialPreviewImage)} />
  {/if}
</svelte:head>
<div class="public-page">
  <ThemePlus />
  <div class="public-intro">
    <p class="public-kicker">Monitor Status</p>
    {#if data.monitorImage}
      <img
        src={clientResolver(resolve, data.monitorImage)}
        alt={data.monitorName || "Monitor icon"}
        class="aspect-auto h-12 w-auto rounded object-cover"
      />
    {/if}
    <Item.Root class="px-0 py-0 ">
      <Item.Content>
        {#if data.monitorName}
          <h1>
            <Item.Title class="public-title">{data.monitorName}</Item.Title>
          </h1>
        {/if}
        {#if data.monitorDescription}
          <h2 class="">
            <Item.Description
              class="public-copy w-full {descriptionExpanded ? 'line-clamp-none' : ''} text-pretty"
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
          </h2>
        {/if}
      </Item.Content>
    </Item.Root>
  </div>
  <div class="public-panel flex flex-col justify-start gap-y-3 p-4">
    <div class="relative flex flex-col px-2">
      <h2 class="text-base font-medium">{$t("Last Updated")}</h2>
      <p class="text-muted-foreground text-xs">
        <span>{$formatDate(data.monitorLastStatusTimestamp * 1000, page.data.dateAndTimeFormat.datePlusTime)}</span>
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
          <IconArrowUpRight class="size-4" />
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
  {#if data.ongoingIncidents && data.ongoingIncidents.length > 0}
    <div class="flex flex-col gap-3">
      {#each data.ongoingIncidents as incident, i (incident.id ?? i)}
        <div class="public-panel p-3 sm:p-4">
          <IncidentItem {incident} />
        </div>
      {/each}
    </div>
  {/if}
  {#if data.ongoingMaintenances && data.ongoingMaintenances.length > 0}
    <div class="flex flex-col gap-3">
      {#each data.ongoingMaintenances as maintenance, i (maintenance.id ?? i)}
        <div class="public-panel p-3 sm:p-4">
          <MaintenanceItem {maintenance} />
        </div>
      {/each}
    </div>
  {/if}
  {#if data.upcomingMaintenances && data.upcomingMaintenances.length > 0}
    <div class="flex flex-col gap-3">
      {#each data.upcomingMaintenances as maintenance, i (maintenance.id ?? i)}
        <div class="public-panel p-3 sm:p-4">
          <MaintenanceItem {maintenance} />
        </div>
      {/each}
    </div>
  {/if}

  <!-- Calendar View (self-contained component with its own API call) -->
  <MonitorOverview
    monitorTag={data.monitorTag}
    maxDays={data.maxDays}
    groupTags={data.extendedTags || []}
    class="mb-4"
  />
</div>
