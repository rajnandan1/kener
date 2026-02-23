<script lang="ts">
  import { onMount, untrack } from "svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import StatusBarCalendar from "$lib/components/StatusBarCalendar.svelte";
  import LatencyTrendChart from "$lib/components/LatencyTrendChart.svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import { Button } from "$lib/components/ui/button";
  import { t } from "$lib/stores/i18n";
  import { selectedTimezone } from "$lib/stores/timezone";
  import { getEndOfDayAtTz } from "$lib/client/datetime";
  import { formatDate } from "$lib/stores/datetime";
  import { requestMonitorBar, clearMonitorBarCache } from "$lib/client/monitor-bar-client";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";
  import GroupMonitorPopover from "$lib/components/GroupMonitorPopover.svelte";

  interface Props {
    monitorTag: string;
    class?: string;
    maxDays?: number;
    groupTags?: string[];
  }

  let { monitorTag, class: className = "", maxDays = 90, groupTags = [] }: Props = $props();

  // State
  let loading = $state(true);
  let overviewData = $state<MonitorBarResponse | null>(null);
  let error = $state<string | null>(null);

  // All possible day range options (ascending)
  const allDayOptions = [1, 7, 14, 30, 60, 90];

  // Filter options up to maxDays, always include maxDays itself
  let dayOptions = $derived.by(() => {
    const filtered = allDayOptions.filter((d) => d <= maxDays);
    if (!filtered.includes(maxDays)) {
      filtered.push(maxDays);
    }
    // Sort descending for dropdown display
    filtered.sort((a, b) => b - a);
    return filtered.map((d) => ({
      days: d,
      text: `${d} ${d === 1 ? $t("Day") : $t("Days")}`
    }));
  });

  // Default to maxDays (first item since sorted descending)
  let selectedDayIndex = $state(0);
  let selectedDays = $derived(dayOptions[selectedDayIndex]?.days ?? maxDays);
  let endOfDayTodayAtTz = $derived(getEndOfDayAtTz($selectedTimezone));

  // Latency metric toggle: "average" | "maximum" | "minimum"
  let latencyMetric = $state("average");

  // Display values from API response (already formatted as strings)
  let displayUptime = $derived(overviewData?.uptime ?? "--");

  let displayAvgLatency = $derived(overviewData?.avgLatency ?? "--");
  let displayMaxLatency = $derived(overviewData?.maxLatency ?? "--");
  let displayMinLatency = $derived(overviewData?.minLatency ?? "--");

  // Data for calendar/chart comes directly from API
  let displayData = $derived(overviewData?.uptimeData ?? []);

  // Latency metric label map
  const metricLabels: Record<string, string> = {
    average: $t("Avg Latency"),
    maximum: $t("Max Latency"),
    minimum: $t("Min Latency")
  };

  // Transform uptimeData into chart-ready points based on selected metric
  let latencyChartData = $derived.by(() => {
    if (!displayData) return [];
    return displayData.map((d) => ({
      date: new Date(d.ts * 1000),
      value: latencyMetric === "maximum" ? d.maxLatency : latencyMetric === "minimum" ? d.minLatency : d.avgLatency
    }));
  });

  let latencyChartLabel = $derived(metricLabels[latencyMetric] ?? metricLabels.average);

  // Fetch data with days parameter
  async function fetchData(days: number) {
    loading = true;
    error = null;

    try {
      overviewData = await requestMonitorBar(monitorTag, days, endOfDayTodayAtTz);
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
      // Evict cache so the new range fetches fresh data
      clearMonitorBarCache();
      fetchData(dayOptions[index].days);
    }
  }

  onMount(() => {
    fetchData(dayOptions[selectedDayIndex].days);
  });

  // Re-fetch when timezone changes
  let initialLoad = true;
  $effect(() => {
    // Track only the timezone - this is the dependency we care about
    const tz = $selectedTimezone;

    // Use untrack to avoid tracking loading/data state changes
    untrack(() => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      fetchData(dayOptions[selectedDayIndex].days);
    });
  });
</script>

<Card.Root class="bg-background rounded-3xl shadow-none {className}">
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <div>
        <Card.Title class="text-base font-medium">{dayOptions[selectedDayIndex].text}</Card.Title>
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
              {#each dayOptions as option, i (option.days)}
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
          <p class="text-muted-foreground text-sm font-medium">{$t("Uptime")}</p>
        </div>
      </div>

      <!-- Status Bar Calendar -->
      <div class="flex flex-col gap-1">
        <StatusBarCalendar data={displayData} {monitorTag} barHeight={40} radius={8} />

        <!-- Date labels -->
        <div class="flex justify-between">
          <p class="text-muted-foreground text-xs font-medium">
            {#if displayData.length > 0}
              {$formatDate(displayData[0].ts, "d MMM yyyy")}
            {/if}
          </p>
          <p class="text-muted-foreground text-xs font-medium">
            {#if displayData.length > 0}
              {$formatDate(displayData[displayData.length - 1].ts, "d MMM yyyy")}
            {/if}
          </p>
        </div>
      </div>
      <!-- Add group GroupMonitorPopover here -->
      {#if groupTags.length > 0}
        <div class="flex justify-center">
          <GroupMonitorPopover tags={groupTags} days={selectedDays} {endOfDayTodayAtTz}>
            {$t("Included Monitors")} ({groupTags.length})
            <ArrowUp class="size-3" />
          </GroupMonitorPopover>
        </div>
      {/if}

      <!-- Latency Chart -->
      <div class="pt-2">
        <p class="text-muted-foreground mb-2 text-sm font-medium">
          {$t("Latency Trend")}
          <Popover.Root>
            <Popover.Trigger class="text-foreground cursor-pointer underline">{latencyChartLabel}</Popover.Trigger>
            <Popover.Content class="flex w-fit flex-col gap-2">
              <p class="text-muted-foreground text-xs font-medium">
                {$t("Select latency metric to display")}
              </p>
              <ToggleGroup.Root
                type="single"
                spacing={2}
                size="sm"
                value={latencyMetric}
                onValueChange={(v) => {
                  if (v) latencyMetric = v;
                }}
                class="flex justify-between"
              >
                <ToggleGroup.Item value="average" aria-label="Average latency">{$t("Avg Latency")}</ToggleGroup.Item>
                <ToggleGroup.Item value="maximum" aria-label="Maximum latency">{$t("Max Latency")}</ToggleGroup.Item>
                <ToggleGroup.Item value="minimum" aria-label="Minimum latency">{$t("Min Latency")}</ToggleGroup.Item>
              </ToggleGroup.Root>
            </Popover.Content>
          </Popover.Root>
        </p>

        <!-- Latency Stats -->
        <div class="mb-3 flex justify-between gap-4">
          <div class="flex flex-col items-start gap-1">
            <p class="text-lg font-semibold">{displayMinLatency}</p>
            <p class="text-muted-foreground text-xs">{$t("Minimum Latency")}</p>
          </div>
          <div class="flex flex-col items-center gap-1">
            <p class="text-lg font-semibold">{displayAvgLatency}</p>
            <p class="text-muted-foreground text-xs">{$t("Average Latency")}</p>
          </div>
          <div class="flex flex-col items-end gap-1">
            <p class="text-lg font-semibold">{displayMaxLatency}</p>
            <p class="text-muted-foreground text-xs">{$t("Maximum Latency")}</p>
          </div>
        </div>

        <LatencyTrendChart data={latencyChartData} label={latencyChartLabel} height={128} />
      </div>
    {/if}
  </Card.Content>
</Card.Root>
