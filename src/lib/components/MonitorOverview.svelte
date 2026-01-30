<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import StatusBarCalendar from "$lib/components/StatusBarCalendar.svelte";
  import LatencyTrendChart from "$lib/components/LatencyTrendChart.svelte";
  import { page } from "$app/state";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import { Button } from "$lib/components/ui/button";
  import { t } from "$lib/stores/i18n";

  interface Props {
    monitorTag: string;
    class?: string;
  }

  let { monitorTag, class: className = "" }: Props = $props();

  // State
  let loading = $state(true);
  let overviewData = $state<MonitorBarResponse | null>(null);
  let error = $state<string | null>(null);

  const localTz = $derived(page.data.localTz || "UTC");

  // Day range options
  const dayOptions = [
    { days: 90, text: "90 Days" },
    { days: 30, text: "30 Days" },
    { days: 7, text: "7 Days" },
    { days: 1, text: "Today" }
  ];
  let selectedDayIndex = $state(0);

  // Display values from API response (already formatted as strings)
  let displayUptime = $derived(overviewData?.uptime ?? "--");

  let displayAvgLatency = $derived(overviewData?.avgLatency ?? "--");

  // Data for calendar/chart comes directly from API
  let displayData = $derived(overviewData?.uptimeData ?? []);

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: localTz
    });
  }

  // Fetch data with days parameter
  async function fetchData(days: number) {
    loading = true;
    error = null;

    try {
      const url = `${resolve("/dashboard-apis/monitor-bar")}?tag=${monitorTag}&endOfDayTodayAtTz=${page.data.endOfDayTodayAtTz}&days=${days}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch monitor data");
      }

      overviewData = await response.json();
    } catch (e) {
      console.error("Failed to fetch monitor data:", e);
      error = e instanceof Error ? e.message : "Failed to load data";
    } finally {
      loading = false;
    }
  }

  // Handle dropdown selection
  function handleDayChange(index: number) {
    if (index !== selectedDayIndex) {
      selectedDayIndex = index;
      fetchData(dayOptions[index].days);
    }
  }

  onMount(() => {
    fetchData(dayOptions[selectedDayIndex].days);
  });
</script>

<Card.Root class="bg-background rounded-3xl shadow-none {className}">
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <div>
        <Card.Title class="text-base font-medium">{dayOptions[selectedDayIndex].text} Overview</Card.Title>
        <Card.Description class="text-xs">
          {$t("Status history and latency trend")}
        </Card.Description>
      </div>
      {#if !loading && overviewData}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger class="cursor-pointer">
            {#snippet child({ props })}
              <Button {...props} variant="outline" class="rounded-btn cursor-pointer gap-1 text-xs" size="sm">
                {dayOptions[selectedDayIndex].text}
                <ChevronDown class="size-4" />
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Label>{$t("Select Range")}</DropdownMenu.Label>
            <DropdownMenu.Group>
              {#each dayOptions as option, i}
                <DropdownMenu.Item
                  class="cursor-pointer text-xs {selectedDayIndex === i ? 'bg-secondary' : ''}"
                  onclick={() => handleDayChange(i)}
                >
                  {option.text}
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}
    </div>
  </Card.Header>
  <Card.Content class="space-y-4">
    {#if loading}
      <!-- Loading skeleton -->
      <div class="space-y-4">
        <div class="flex gap-4">
          <Skeleton class="h-16 flex-1 rounded-lg" />
          <Skeleton class="h-16 flex-1 rounded-lg" />
        </div>
        <Skeleton class="h-10 w-full rounded-lg" />
        <div class="flex justify-between">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-4 w-24" />
        </div>
        <Skeleton class="h-32 w-full rounded-lg" />
      </div>
    {:else if error}
      <!-- Error state -->
      <div class="py-12 text-center">
        <p class="text-muted-foreground">{error}</p>
      </div>
    {:else if overviewData}
      <!-- Stats Summary -->
      <div class="flex gap-4">
        <div class="flex flex-1 flex-col items-start gap-1">
          <p class="text-2xl font-semibold">{displayUptime}%</p>
          <p class="text-muted-foreground text-sm">{$t("Uptime")}</p>
        </div>
        <div class="flex flex-1 flex-col items-end gap-1">
          <p class="text-2xl font-semibold">{displayAvgLatency}</p>
          <p class="text-muted-foreground text-sm">{$t("Avg Latency")}</p>
        </div>
      </div>

      <!-- Status Bar Calendar -->
      <StatusBarCalendar data={displayData} {monitorTag} {localTz} barHeight={40} radius={8} />

      <!-- Date labels -->
      <div class="flex justify-between">
        <p class="text-muted-foreground text-xs font-medium">
          {#if displayData.length > 0}
            {formatTimestamp(displayData[0].ts)}
          {/if}
        </p>
        <p class="text-muted-foreground text-xs font-medium">
          {#if displayData.length > 0}
            {formatTimestamp(displayData[displayData.length - 1].ts)}
          {/if}
        </p>
      </div>

      <!-- Latency Chart -->
      <div class="pt-2">
        <p class="text-muted-foreground mb-2 text-xs font-medium">
          {$t("Latency Trend")}
        </p>
        <LatencyTrendChart data={displayData} height={128} />
      </div>
    {/if}
  </Card.Content>
</Card.Root>
