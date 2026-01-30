<script lang="ts">
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Item from "$lib/components/ui/item/index.js";
  import ThemePlus from "$lib/components/ThemePlus.svelte";
  import IncidentItem from "$lib/components/IncidentItem.svelte";
  import MaintenanceItem from "$lib/components/MaintenanceItem.svelte";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import Check from "@lucide/svelte/icons/check";
  import ICONS from "$lib/icons";
  import { t } from "$lib/stores/i18n";

  import { format, parse, addMonths, subMonths, getUnixTime, startOfDay, formatDistanceStrict } from "date-fns";

  import type { IncidentForMonitorList, MaintenanceEventsMonitorList } from "$lib/server/types/db";

  let { data } = $props();

  const MIN_YEAR = 2023;

  // State
  let loading = $state(true);
  let incidents = $state<IncidentForMonitorList[]>([]);
  let maintenances = $state<MaintenanceEventsMonitorList[]>([]);

  // Parse the current month from params
  const parsedDate = parse(data.monthParam, "MMMM-yyyy", new Date());
  const currentMonth = format(parsedDate, "MMMM yyyy");

  // Navigation
  const prevMonth = subMonths(parsedDate, 1);
  const nextMonth = addMonths(parsedDate, 1);
  const prevMonthPath = format(prevMonth, "MMMM-yyyy");
  const nextMonthPath = format(nextMonth, "MMMM-yyyy");

  // Determine if navigation buttons should show
  const currentDate = new Date();
  const maxDate = addMonths(currentDate, 12);
  const minDate = new Date(MIN_YEAR, 0, 1);
  const showPrevButton = prevMonth >= minDate;
  const showNextButton = nextMonth <= maxDate;

  // Counts
  let numberOfIncidents = $derived(incidents.length);
  let numberOfMaintenances = $derived(maintenances.length);

  // Unified event type for display
  interface DisplayEvent {
    id: number;
    title: string;
    description?: string | null;
    start_date_time: number;
    end_date_time: number | null;
    type: "incident" | "maintenance";
    monitors?: Array<{
      monitor_tag: string;
      monitor_impact: string;
      monitor_name: string;
      monitor_image: string | null;
    }>;
  }

  // Group events by day
  interface DayEvents {
    date: number; // Unix timestamp of start of day
    events: DisplayEvent[];
  }

  let eventsByDay = $derived.by(() => {
    const allEvents: DisplayEvent[] = [];

    // Add incidents
    for (const incident of incidents) {
      allEvents.push({
        id: incident.id,
        title: incident.title,
        start_date_time: incident.start_date_time,
        end_date_time: incident.end_date_time,
        type: "incident",
        monitors: incident.monitors
      });
    }

    // Add maintenances
    for (const maintenance of maintenances) {
      allEvents.push({
        id: maintenance.id,
        title: maintenance.title,
        description: maintenance.description,
        start_date_time: maintenance.start_date_time,
        end_date_time: maintenance.end_date_time,
        type: "maintenance",
        monitors: maintenance.monitors
      });
    }

    // Group by day
    const dayMap = new Map<number, DisplayEvent[]>();
    for (const event of allEvents) {
      const dayStart = getUnixTime(startOfDay(new Date(event.start_date_time * 1000)));
      if (!dayMap.has(dayStart)) {
        dayMap.set(dayStart, []);
      }
      dayMap.get(dayStart)!.push(event);
    }

    // Sort days descending (newest first)
    const sortedDays = Array.from(dayMap.keys()).sort((a, b) => b - a);

    const result: DayEvents[] = sortedDays.map((dayTs) => ({
      date: dayTs,
      events: dayMap.get(dayTs)!.sort((a, b) => b.start_date_time - a.start_date_time)
    }));

    return result;
  });

  async function fetchEvents() {
    loading = true;
    try {
      const response = await fetch("/dashboard-apis/events-by-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_ts: data.monthStartTs,
          end_ts: data.monthEndTs
        })
      });

      if (response.ok) {
        const result = await response.json();
        incidents = result.incidents || [];
        maintenances = result.maintenances || [];
      }
    } catch (e) {
      console.error("Failed to fetch events:", e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchEvents();
  });
</script>

<svelte:head>
  <title>{currentMonth} - Maintenances & Incidents</title>
</svelte:head>

<div class="flex flex-col gap-3">
  <!-- Header with back button -->

  <ThemePlus showHomeButton={true} />

  <div class="flex gap-4">
    <div class="flex h-20 flex-row justify-start gap-y-3 rounded-3xl border p-4">
      <div class="flex flex-row items-center gap-4">
        <div class="flex flex-row items-center justify-between gap-4">
          <Button
            rel="external"
            variant="outline"
            class="size-8 rounded-full p-0 shadow-none"
            href="/events/{prevMonthPath}"
          >
            <ICONS.CHEVRON_LEFT class=" size-5" />
          </Button>
          <p class="text-2xl">{currentMonth}</p>
          <Button
            rel="external"
            href="/events/{nextMonthPath}"
            variant="outline"
            class="size-8 rounded-full p-0 shadow-none	"
          >
            <ICONS.CHEVRON_RIGHT class=" size-5" />
          </Button>
        </div>
      </div>
    </div>

    <div class="flex h-20 flex-1 flex-col justify-around gap-y-4 rounded-3xl border p-4">
      <div class=" flex gap-x-3">
        <!-- Incidents in this page -->
        <div class="flex flex-1 flex-row items-center gap-2">
          {#if numberOfIncidents === 0}
            <Check class="text-up" />
          {:else}
            <p class="text-3xl">
              {numberOfIncidents}
            </p>
          {/if}
          <p class="text-xs leading-4 opacity-50">
            {@html $t("Total <br /> Incidents")}
          </p>
        </div>
        <!-- Maintenances in this page -->
        <div class="flex flex-1 flex-row items-center gap-2">
          {#if numberOfMaintenances === 0}
            <Check class="text-up" />
          {:else}
            <p class="text-3xl">
              {numberOfMaintenances}
            </p>
          {/if}
          <p class="text-xs leading-4 opacity-50">{@html $t("Total <br /> Maintenances")}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <Spinner class="size-8" />
    </div>
  {:else if eventsByDay.length === 0}
    <!-- No Events -->
    <Card.Root class="rounded-3xl border bg-transparent shadow-none">
      <Card.Content class=" py-12 text-center">
        <div class="mx-auto mb-4 text-4xl">🎉</div>
        <h2 class="text-xl font-semibold">
          {$t("No Events in %currentMonth", { currentMonth })}
        </h2>
        <p class="text-muted-foreground mt-2">
          {$t("There are no incidents or maintenances scheduled for this month.")}
        </p>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Events grouped by day -->
    {#each eventsByDay as day}
      <div class="flex flex-col gap-2">
        <div class="mt-4 w-fit rounded-3xl border px-4 py-2 text-xs font-medium">
          {format(new Date(day.date * 1000), "EEEE, MMMM do")}
        </div>
        <div class="rounded-3xl border">
          {#each day.events as event}
            <div class="flex flex-col gap-2 border-b p-4 last:border-b-0">
              {#if event.type === "incident"}
                <div class="pl-8">
                  <Badge variant="secondary" class="text-xs">Incident</Badge>
                </div>
                <IncidentItem
                  incident={{
                    id: event.id,
                    title: event.title,
                    monitors: event.monitors || [],
                    start_date_time: event.start_date_time,
                    end_date_time: event.end_date_time
                  }}
                />
              {:else}
                <!-- Maintenance -->
                <div class="pl-8">
                  <Badge variant="secondary" class="text-xs">
                    {$t("Maintenance")}
                  </Badge>
                </div>
                <MaintenanceItem
                  maintenance={{
                    id: event.id,
                    title: event.title,
                    description: event.description ?? null,
                    monitors: (event.monitors ?? []).map((m) => ({
                      monitor_tag: m.monitor_tag,
                      monitor_name: m.monitor_name,
                      monitor_image: m.monitor_image ?? null,
                      monitor_impact: m.monitor_impact ?? "MAINTENANCE"
                    })),
                    start_date_time: event.start_date_time,
                    end_date_time: event.end_date_time ?? 0
                  }}
                />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {/if}

  <!-- Navigation buttons -->
  <div class="flex justify-between">
    {#if showPrevButton}
      <Button variant="outline" rel="external" class="rounded-full shadow-none" href="/events/{prevMonthPath}">
        <ArrowLeft class="mr-2 h-4 w-4" />
        {format(prevMonth, "MMMM yyyy")}
      </Button>
    {:else}
      <div></div>
    {/if}
    {#if showNextButton}
      <Button variant="outline" rel="external" class="rounded-full shadow-none" href="/events/{nextMonthPath}">
        {format(nextMonth, "MMMM yyyy")}
        <ArrowRight class="ml-2 h-4 w-4" />
      </Button>
    {:else}
      <div></div>
    {/if}
  </div>
</div>
