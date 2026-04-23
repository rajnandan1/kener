<script lang="ts">
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import { IconCalendarEvent, IconServer, IconArrowRight, IconRepeat } from "@tabler/icons-svelte";
  import * as Item from "$lib/components/ui/item/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import mdToHTML from "$lib/marked";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";
  import clientResolver from "$lib/client/resolver.js";
  import { SveltePurify } from "@humanspeak/svelte-purify";
  import { page } from "$app/state";

  let { data } = $props();

  // Reference for the scrollable container
  let eventsContainer: HTMLDivElement | undefined = $state();

  // Scroll to current event on mount
  onMount(() => {
    if (eventsContainer) {
      const currentEventElement = eventsContainer.querySelector('[data-current="true"]') as HTMLElement;
      if (currentEventElement) {
        // Calculate position to center the current event in the container
        const containerHeight = eventsContainer.clientHeight;
        const elementTop = currentEventElement.offsetTop;
        const elementHeight = currentEventElement.clientHeight;
        const scrollPosition = elementTop - containerHeight / 2 + elementHeight / 2;
        eventsContainer.scrollTop = Math.max(0, scrollPosition);
      }
    }
  });

  // Check if maintenance is recurring (not one-time)
  function isRecurring(rrule: string): boolean {
    return !rrule.includes("COUNT=1");
  }
</script>

<svelte:head>
  <title>{data.maintenance.title + " | " + data.siteName}</title>
  <meta property="og:title" content={data.maintenance.title + " | " + data.siteName} />
  <meta property="og:type" content="article" />
  <meta name="twitter:card" content="summary_large_image" />
  {#if data.maintenance.description}
    <meta name="description" content={data.maintenance.description} />
    <meta property="og:description" content={data.maintenance.description} />
  {/if}
  {#if data.socialPreviewImage}
    <meta property="og:image" content={clientResolver(resolve, data.socialPreviewImage)} />
    <meta name="twitter:image" content={clientResolver(resolve, data.socialPreviewImage)} />
  {/if}
</svelte:head>

<div class="public-page">
  <ThemePlus />
  <div class="public-intro">
    <p class="public-kicker">Maintenance Window</p>
    <Item.Root class="mb-4 flex-col items-start px-0 sm:flex-row sm:items-center">
      <Item.Content class="min-w-0 flex-1 px-0">
        <h1>
          <Item.Title class="public-title wrap-break-word">{data.maintenance.title}</Item.Title>
        </h1>
      </Item.Content>
    </Item.Root>
  </div>
  <div class="public-panel mb-4 flex flex-col items-start gap-4 p-4 text-sm">
    <div class="flex gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[11px] font-medium text-zinc-300"
      >
        {#if isRecurring(data.maintenance.rrule)}
          <IconRepeat class="size-3 text-zinc-500" aria-hidden="true" />
          {$t("Recurring")}
        {:else}
          {$t("One-time")}
        {/if}
      </span>
    </div>
    <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
      <div class="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[12px]">
        <span class="text-zinc-500">{$t("Start Time")}</span>
        <span class="text-zinc-300">{$formatDate(data.maintenanceEvent.start_date_time, page.data.dateAndTimeFormat.datePlusTime)}</span>
      </div>
      <div class="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[12px]">
        <span class="text-zinc-500">{$t("End Time")}</span>
        <span class="text-zinc-300">{$formatDate(data.maintenanceEvent.end_date_time, page.data.dateAndTimeFormat.datePlusTime)}</span>
      </div>
      <div class="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[12px]">
        <span class="text-zinc-500">{$t("Duration")}</span>
        <span class="text-zinc-300">{$formatDuration(data.maintenanceEvent.start_date_time, data.maintenanceEvent.end_date_time)}</span>
      </div>
    </div>
  </div>

  <div class="grid min-w-0 gap-6 lg:grid-cols-3">
    <!-- Description and Events (Main Content) -->
    <div class="min-w-0 space-y-6 lg:col-span-2">
      <!-- Description -->
      {#if data.maintenance.description}
        <div class="public-panel min-w-0">
          <div class="prose prose-sm dark:prose-invert max-w-none min-w-0 overflow-x-auto p-4 wrap-break-word">
            <SveltePurify html={mdToHTML(data.maintenance.description)} />
          </div>
        </div>
      {/if}

      <!-- Scheduled Events (Past, Current, Upcoming) -->
      {#if data.maintenance.events && data.maintenance.events.length > 0}
        <div class="public-panel">
          <div class="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <div class="flex items-center gap-2 text-[13px] font-medium text-zinc-300">
              <IconCalendarEvent class="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
              <span>{$t("Scheduled Events (%count)", { count: String(data.maintenance.events.length) })}</span>
            </div>
          </div>

          <div bind:this={eventsContainer} class="scrollbar-hidden max-h-96 divide-y divide-zinc-800 overflow-y-auto">
            {#each data.maintenance.events as event (event.id)}
              {@const isCurrent = event.id === data.maintenanceEvent.id && data.maintenance.events.length > 1}
              <div
                data-current={event.id === data.maintenanceEvent.id}
                class="relative p-4 {isCurrent ? 'bg-zinc-900/40' : ''}"
              >
                {#if isCurrent}
                  <!--
                    Thin accent rail on the left edge marks the current event.
                    Same idiom the Console uses for "this row is selected /
                    active" — `border-l-2` + maintenance tint, no heavy fill.
                  -->
                  <span
                    aria-hidden="true"
                    class="pointer-events-none absolute inset-y-0 left-0 w-0.5 bg-maintenance"
                  ></span>
                {/if}
                <div class="mb-2 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[11px] font-medium text-zinc-300"
                    >
                      <span class="inline-flex size-1.5 shrink-0 rounded-full bg-{event.status.toLowerCase()}"></span>
                      <span class="text-{event.status.toLowerCase()}">{$t(event.status)}</span>
                    </span>
                    {#if event.id === data.maintenanceEvent.id}
                      <span
                        class="inline-flex items-center rounded-md border border-maintenance/40 bg-maintenance/10 px-2 py-0.5 text-[11px] font-medium text-maintenance"
                      >
                        {$t("Current")}
                      </span>
                    {/if}
                  </div>
                  <span class="text-[11px] text-zinc-500">
                    {$formatDuration(event.start_date_time, event.end_date_time)}
                  </span>
                </div>
                <div
                  class="flex flex-col gap-1 text-[12px] text-zinc-500 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>{$formatDate(event.start_date_time, page.data.dateAndTimeFormat.datePlusTime)}</span>
                  <span aria-hidden="true" class="hidden text-zinc-700 sm:inline">→</span>
                  <span>{$formatDate(event.end_date_time, page.data.dateAndTimeFormat.datePlusTime)}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Affected Monitors (Sidebar) -->
    <div class="lg:col-span-1">
      <div class="public-panel">
        <div class="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
          <div class="flex items-center gap-2 text-[13px] font-medium text-zinc-300">
            <IconServer class="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
            <span>{$t("Affected Monitors (%count)", { count: String(data.affectedMonitors.length) })}</span>
          </div>
        </div>

        {#if data.affectedMonitors.length === 0}
          <div class="flex flex-col items-center gap-2 px-6 py-10 text-center text-zinc-500">
            <IconServer class="size-7 opacity-60" aria-hidden="true" />
            <p class="text-[13px]">{$t("No monitors affected")}</p>
          </div>
        {:else}
          <div class="divide-y divide-zinc-800">
            {#each data.affectedMonitors as monitor (monitor.monitor_tag)}
              <Item.Root class="px-4 py-3">
                <Item.Media>
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <div class="bg-{monitor.monitor_impact.toLowerCase()} size-6 rounded-full"></div>
                    </Tooltip.Trigger>
                    <Tooltip.Content arrowClasses="bg-foreground">
                      <div class="text-[12px] font-medium">{$t("Under Maintenance")}</div>
                    </Tooltip.Content>
                  </Tooltip.Root>
                </Item.Media>
                <Item.Content>
                  <Item.Title class="text-[13px] font-medium text-zinc-100">{monitor.monitor_name}</Item.Title>
                  <Item.Description class="text-[12px] text-zinc-500">
                    <span class="text-{monitor.monitor_impact.toLowerCase()}">
                      {$t(monitor.monitor_impact)}
                    </span>
                  </Item.Description>
                </Item.Content>
                <Item.Actions>
                  <div class="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-500">
                    <IconArrowRight class="size-3.5" />
                  </div>
                </Item.Actions>
              </Item.Root>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
