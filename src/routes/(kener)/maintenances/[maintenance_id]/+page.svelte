<script lang="ts">
  import { resolve } from "$app/paths";
  import { onMount } from "svelte";
  import Clock from "lucide-svelte/icons/clock";
  import Calendar from "lucide-svelte/icons/calendar";
  import Monitor from "lucide-svelte/icons/monitor";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Repeat from "@lucide/svelte/icons/repeat";
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import mdToHTML from "$lib/marked";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import STATUS_ICON from "$lib/icons";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";

  let { data } = $props();

  const MaintenanceIcon = STATUS_ICON.MAINTENANCE;

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

  // Get status badge variant for event status
  function getEventStatusBadgeClass(status: string): string {
    switch (status) {
      case "SCHEDULED":
        return "bg-muted text-muted-foreground";
      case "IN_PROGRESS":
        return "bg-maintenance text-white";
      case "COMPLETED":
        return "bg-up text-white";
      case "CANCELLED":
        return "bg-down text-white";
      default:
        return "";
    }
  }

  // Check if maintenance is recurring (not one-time)
  function isRecurring(rrule: string): boolean {
    return !rrule.includes("COUNT=1");
  }
</script>

<div class="container mx-auto px-4 py-8">
  <!-- Maintenance Header -->
  <Item.Root class="mb-4 px-0">
    <Item.Media>
      <MaintenanceIcon class="stroke-maintenance size-8" />
    </Item.Media>
    <Item.Content class="px-0">
      <Item.Title class="text-3xl">{data.maintenance.title}</Item.Title>
    </Item.Content>
  </Item.Root>

  <div class="my-4 flex justify-end gap-2">
    <ThemePlus showEventsButton={true} showHomeButton={true} />
  </div>

  <!-- Maintenance Meta -->
  <div class="mb-4 flex flex-col items-start gap-4 rounded-3xl border p-4 text-sm">
    <div class="flex gap-2">
      {#if isRecurring(data.maintenance.rrule)}
        <Badge variant="secondary" class="gap-1">
          <Repeat class="h-3 w-3" />
          {$t("Recurring")}
        </Badge>
      {:else}
        <Badge variant="secondary">{$t("One-time")}</Badge>
      {/if}
    </div>
    <div class="flex w-full justify-between gap-2">
      <div class="flex flex-col items-start gap-1.5">
        <span class="text-muted-foreground">{$t("Start Time")}</span>
        <span>{$formatDate(data.maintenanceEvent.start_date_time, "PPpp")}</span>
      </div>
      <div class="flex flex-col items-center gap-1.5">
        <span class="text-muted-foreground">{$t("End Time")}</span>
        <span>{$formatDate(data.maintenanceEvent.end_date_time, "PPpp")}</span>
      </div>
      <div class="flex flex-col items-end gap-1.5">
        <span class="text-muted-foreground">{$t("Duration")}</span>
        <span>{$formatDuration(data.maintenanceEvent.start_date_time, data.maintenanceEvent.end_date_time)}</span>
      </div>
    </div>
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    <!-- Description and Events (Main Content) -->
    <div class="space-y-6 lg:col-span-2">
      <!-- Description -->
      {#if data.maintenance.description}
        <div class="bg-background rounded-3xl border">
          <div class="prose prose-sm dark:prose-invert max-w-none p-4">
            {@html mdToHTML(data.maintenance.description)}
          </div>
        </div>
      {/if}

      <!-- Scheduled Events (Past, Current, Upcoming) -->
      {#if data.maintenance.events && data.maintenance.events.length > 0}
        <div class="bg-background rounded-3xl border">
          <div class="flex items-center justify-between border-b p-4">
            <Badge variant="secondary" class="gap-1">
              <Calendar class="h-3 w-3" />
              Scheduled Windows ({data.maintenance.events.length})
            </Badge>
          </div>

          <div bind:this={eventsContainer} class="scrollbar-hidden max-h-96 divide-y overflow-y-auto">
            {#each data.maintenance.events as event (event.id)}
              <div
                data-current={event.id === data.maintenanceEvent.id}
                class="p-4 {event.id === data.maintenanceEvent.id && data.maintenance.events.length > 1
                  ? 'bg-maintenance/10 border-l-maintenance border-l-4'
                  : ''}"
              >
                <div class="mb-2 flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <Badge class={getEventStatusBadgeClass(event.status)}>
                      {event.status.replace("_", " ")}
                    </Badge>
                    {#if event.id === data.maintenanceEvent.id}
                      <Badge variant="outline" class="text-maintenance border-maintenance text-xs">Current</Badge>
                    {/if}
                  </div>
                  <span class="text-muted-foreground text-xs">
                    {$formatDuration(event.start_date_time, event.end_date_time)}
                  </span>
                </div>
                <div class="text-muted-foreground flex items-center justify-between text-sm">
                  <span>{$formatDate(event.start_date_time, "PPpp")}</span>
                  <span>→</span>
                  <span>{$formatDate(event.end_date_time, "PPpp")}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Affected Monitors (Sidebar) -->
    <div class="lg:col-span-1">
      <div class="bg-background rounded-3xl border">
        <div class="flex items-center justify-between border-b p-4">
          <Badge variant="secondary" class="gap-1">
            <Monitor class="h-3 w-3" />
            {$t("Affected Monitors (%count)", { count: String(data.affectedMonitors.length) })}
          </Badge>
        </div>

        {#if data.affectedMonitors.length === 0}
          <div class="text-muted-foreground p-8 text-center">
            <Monitor class="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>{$t("No monitors affected")}</p>
          </div>
        {:else}
          <div class="">
            {#each data.affectedMonitors as monitor (monitor.monitor_tag)}
              <div class="border-b last:border-b-0">
                <Item.Root>
                  <Item.Media>
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <div class="bg-{monitor.monitor_impact.toLowerCase()} h-6 w-6 rounded-full"></div>
                      </Tooltip.Trigger>
                      <Tooltip.Content arrowClasses="bg-foreground">
                        <div class="text-xs font-medium">{$t("Under Maintenance")}</div>
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Item.Media>
                  <Item.Content>
                    <Item.Title>{monitor.monitor_name}</Item.Title>
                    <Item.Description>
                      <span class="text-{monitor.monitor_impact.toLowerCase()}">
                        {$t(monitor.monitor_impact)}
                      </span>
                    </Item.Description>
                  </Item.Content>
                  <Item.Actions>
                    <Button
                      variant="outline"
                      class="rounded-btn"
                      href={resolve(`/monitors/${monitor.monitor_tag}`)}
                      size="icon"
                    >
                      <ArrowRight class="h-4 w-4" />
                    </Button>
                  </Item.Actions>
                </Item.Root>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
