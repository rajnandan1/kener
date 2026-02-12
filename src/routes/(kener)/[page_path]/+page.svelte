<script lang="ts">
  import Bell from "@lucide/svelte/icons/bell";
  import { t } from "$lib/stores/i18n";
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
  import clientResolver from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";

  let { data } = $props();
  let pageSettings = $derived(data.pageDetails.page_settings);
  let barCount = $derived.by(() =>
    data.isMobile
      ? pageSettings?.monitor_status_history_days.mobile || 30
      : pageSettings?.monitor_status_history_days.desktop || 90
  );
</script>

<!-- gap -->
<svelte:head>
  <title>{data.pageDetails?.page_title || "Status Page"}</title>
</svelte:head>

<!-- page title -->
<div class="flex flex-col gap-3 sm:gap-4">
  <ThemePlus
    monitor_tags={data.monitorTags}
    showPagesDropdown={true}
    showEventsButton={true}
    currentPath={data.pageDetails?.page_path || "/"}
  />
  <div class="flex flex-col gap-2 px-3 py-2 sm:px-4">
    {#if data.pageDetails?.page_logo}
      <img
        src={clientResolver(resolve, data.pageDetails.page_logo)}
        alt="Page Logo"
        class="aspect-auto w-12 rounded object-cover"
      />
    {/if}
    <Item.Root class="px-0 py-0">
      <Item.Content>
        {#if data.pageDetails?.page_header}
          <Item.Title class="text-2xl sm:text-3xl">{data.pageDetails.page_header}</Item.Title>
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

  <EventsCard statusClass={data.pageStatus.statusClass} statusText={data.pageStatus.statusSummary} />
  <IncidentMonitorList incidents={data.ongoingIncidents} title="Ongoing Incidents" />
  <AllMaintenanceMonitorGrid
    ongoingMaintenances={data.ongoingMaintenances}
    upcomingMaintenances={data.upcomingMaintenances}
    pastMaintenances={data.pastMaintenances}
  />
  <div class="flex flex-col">
    <div class="flex flex-col overflow-hidden rounded-3xl border">
      <div class="flex items-center justify-between p-4">
        <Badge variant="secondary" class="gap-1">{$t("Available Components")}</Badge>
      </div>
      {#each data.monitorTags as tag, i}
        <div class="{i < data.monitorTags.length - 1 ? 'border-b' : ''} px-2 py-2 pb-4 sm:px-0">
          <MonitorBar {tag} {barCount} />
        </div>
      {/each}
    </div>
  </div>

  <!-- Recent Concluded Incidents -->
  {#if data.recentConcludedMaintenances && data.recentConcludedMaintenances.length > 0}
    <div class="flex flex-col gap-3 overflow-hidden rounded-3xl border">
      <div class="p-4">
        <Badge variant="secondary" class="gap-1">{$t("Recent Incidents")}</Badge>
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
