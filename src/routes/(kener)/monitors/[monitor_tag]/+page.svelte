<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { t } from "$lib/stores/i18n";
  import { formatDate } from "$lib/stores/datetime";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import IncidentMonitorList from "$lib/components/IncidentMonitorList.svelte";
  import AllMaintenanceMonitorGrid from "$lib/components/AllMaintenanceMonitorGrid.svelte";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import MonitorOverview from "$lib/components/MonitorOverview.svelte";
  import ArrowUpRight from "@lucide/svelte/icons/arrow-up-right";
  import clientResolver from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";
  import { ArrowDown } from "@lucide/svelte";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import trackEvent from "$lib/beacon";
  import { selectedTimezone } from "$lib/stores/timezone";
  import { getEndOfDayAtTz } from "$lib/client/datetime";
  import { requestMonitorBar } from "$lib/client/monitor-bar-client";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
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

  let monitorBarDataByTag = $state<Record<string, MonitorBarResponse>>({});
  let monitorBarErrorByTag = $state<Record<string, string>>({});
  let requestVersion = 0;

  $effect(() => {
    const tags = data.extendedTags || [];
    const days = data.maxDays;
    const endOfDayTodayAtTz = getEndOfDayAtTz($selectedTimezone);
    const currentRequestVersion = ++requestVersion;

    monitorBarDataByTag = {};
    monitorBarErrorByTag = {};

    if (!tags.length) return;

    void Promise.all(
      tags.map(async (tag) => {
        try {
          const monitorBarData = await requestMonitorBar(tag, days, endOfDayTodayAtTz);
          return { tag, ok: true as const, monitorBarData };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          return { tag, ok: false as const, errorMessage };
        }
      })
    ).then((results) => {
      if (currentRequestVersion !== requestVersion) return;

      const nextDataByTag: Record<string, MonitorBarResponse> = {};
      const nextErrorByTag: Record<string, string> = {};

      for (const result of results) {
        if (result.ok) {
          nextDataByTag[result.tag] = result.monitorBarData;
        } else {
          nextErrorByTag[result.tag] = result.errorMessage;
        }
      }

      monitorBarDataByTag = nextDataByTag;
      monitorBarErrorByTag = nextErrorByTag;
    });
  });
</script>

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
    <!-- Included monitors -->
    <div class="flex flex-col">
      <div class="flex flex-col rounded-3xl border">
        <div class="flex items-center justify-between px-4 pt-4 pb-0">
          <Badge variant="secondary" class="gap-1">{$t("Available Components")}</Badge>
        </div>
        {#each data.extendedTags as tag, i (tag)}
          <div class="{i < data.extendedTags.length - 1 ? 'border-b' : ''} py-2 pb-4">
            <MonitorBar {tag} prefetchedData={monitorBarDataByTag[tag]} prefetchedError={monitorBarErrorByTag[tag]} />
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- recent incidents -->
  <IncidentMonitorList incidents={data.resolvedIncidents} title="Recent Incidents" class="mt-4 mb-4" />
</div>
