<script lang="ts">
  import { onMount } from "svelte";
  import { format } from "date-fns";
  import { resolve } from "$app/paths";
  import * as Chart from "$lib/components/ui/chart/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Loader from "lucide-svelte/icons/loader";
  import { AreaChart, Area, LinearGradient } from "layerchart";
  import { curveCatmullRom } from "d3-shape";

  interface Props {
    monitorTag: string;
    localTz: string;
    class?: string;
  }

  let { monitorTag, localTz, class: className = "" }: Props = $props();

  interface TimeRangeOption {
    label: string;
    value: string;
  }

  const timeRanges: TimeRangeOption[] = [
    { label: "Last Hour", value: "1h" },
    { label: "Last 3 Hours", value: "3h" },
    { label: "Last 6 Hours", value: "6h" },
    { label: "Last 12 Hours", value: "12h" },
    { label: "Last 24 Hours", value: "24h" },
    { label: "Last 48 Hours", value: "48h" },
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 14 Days", value: "14d" },
    { label: "Last 30 Days", value: "30d" }
  ];

  interface ChartDataPoint {
    timestamp: number;
    avgLatency: number | null;
    minLatency: number | null;
    maxLatency: number | null;
    time: string;
  }

  // State
  let loading = $state(true);
  let chartData = $state<ChartDataPoint[]>([]);
  let selectedRange = $state("24h");
  let rangeLabel = $state("Last 24 Hours");
  let avgInterval = $state(30);
  let error = $state<string | null>(null);

  // Chart config
  const chartConfig = {
    avgLatency: {
      label: "Avg Latency",
      color: "var(--chart-1)"
    }
  } satisfies Chart.ChartConfig;

  // Fetch chart data
  async function fetchChartData(range: string) {
    loading = true;
    error = null;

    try {
      const response = await fetch(
        `${resolve("/dashboard-apis/monitor-latency-chart")}?tag=${monitorTag}&range=${range}&localTz=${encodeURIComponent(localTz)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch latency data");
      }

      const result = await response.json();

      // Transform data for chart - filter out null values and add formatted time
      chartData = result.data
        .filter((d: ChartDataPoint) => d.avgLatency !== null)
        .map((d: ChartDataPoint) => ({
          ...d,
          time: formatTimestamp(d.timestamp, range)
        }));

      rangeLabel = result.rangeLabel;
      avgInterval = result.avgInterval;
    } catch (e) {
      console.error("Failed to fetch latency chart data:", e);
      error = e instanceof Error ? e.message : "Failed to load data";
    } finally {
      loading = false;
    }
  }

  // Format timestamp based on range
  function formatTimestamp(timestamp: number, range: string): string {
    const date = new Date(timestamp * 1000);
    if (range === "1h" || range === "3h" || range === "6h") {
      return format(date, "HH:mm");
    } else if (range === "12h" || range === "24h" || range === "48h") {
      return format(date, "MMM d, HH:mm");
    } else {
      return format(date, "MMM d");
    }
  }

  // Format x-axis labels
  function formatXAxis(value: string): string {
    // Shorten the time display for x-axis
    if (value.includes(",")) {
      const parts = value.split(", ");
      return parts[1] || parts[0]; // Show time part if available
    }
    return value;
  }

  // Handle range change
  function handleRangeChange(range: string) {
    selectedRange = range;
    fetchChartData(range);
  }

  onMount(() => {
    fetchChartData(selectedRange);
  });
</script>

<Card.Root class="bg-background overflow-hidden rounded-3xl shadow-none {className}">
  <Card.Header class="flex flex-row items-center justify-between pb-2">
    <div>
      <Card.Title class="text-base font-medium">Latency Over Time</Card.Title>
      <Card.Description class="text-xs">
        {#if avgInterval >= 60}
          Averaged every {avgInterval / 60} hour{avgInterval / 60 > 1 ? "s" : ""}
        {:else}
          Averaged every {avgInterval} minute{avgInterval > 1 ? "s" : ""}
        {/if}
      </Card.Description>
    </div>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger class="cursor-pointer">
        {#snippet child({ props })}
          <Button {...props} variant="outline" class="rounded-btn  cursor-pointer gap-1 text-xs" size="sm">
            {rangeLabel}
            <ChevronDown class="size-3" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Label>Select Range</DropdownMenu.Label>
        <DropdownMenu.Group>
          {#each timeRanges as range}
            <DropdownMenu.Item
              class="cursor-pointer text-xs {selectedRange === range.value ? 'bg-secondary' : ''}"
              onclick={() => handleRangeChange(range.value)}
            >
              {range.label}
              {#if loading && selectedRange === range.value}
                <Loader class="ml-2 size-3 animate-spin" />
              {/if}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Card.Header>
  <Card.Content class="pt-0">
    {#if loading}
      <div class="flex h-50 items-center justify-center">
        <Skeleton class="h-full w-full rounded-lg" />
      </div>
    {:else if error}
      <div class="flex h-50 items-center justify-center">
        <p class="text-muted-foreground text-sm">{error}</p>
      </div>
    {:else if chartData.length === 0}
      <div class="flex h-50 items-center justify-center">
        <p class="text-muted-foreground text-sm">No latency data available for this period</p>
      </div>
    {:else}
      <Chart.Container config={chartConfig} class="h-50 w-full">
        <AreaChart
          data={chartData}
          x="time"
          y="avgLatency"
          axis="x"
          grid={false}
          series={[
            {
              key: "avgLatency",
              label: "Avg Latency",
              color: "var(--color-avgLatency)"
            }
          ]}
          props={{
            area: {
              curve: curveCatmullRom,
              "fill-opacity": 0.4,
              line: { class: "stroke-1" }
            },
            xAxis: {
              format: (d: string) => formatXAxis(d),
              ticks: Math.min(chartData.length, 6)
            },
            tooltip: {
              item: {
                format: (value: number) => `${Math.round(value)} ms`
              }
            }
          }}
        >
          {#snippet marks({ series, getAreaProps })}
            {#each series as s, i (s.key)}
              <LinearGradient stops={[s.color ?? "", "color-mix(in lch, " + s.color + " 10%, transparent)"]} vertical>
                {#snippet children({ gradient })}
                  <Area {...getAreaProps(s, i)} fill={gradient} />
                {/snippet}
              </LinearGradient>
            {/each}
          {/snippet}
          {#snippet tooltip()}
            <Chart.Tooltip hideLabel>
              {#snippet formatter({ value, name, item })}
                <div class="flex w-full items-start gap-2">
                  <div
                    style="--color-bg: {item.color}; --color-border: {item.color};"
                    class="mt-0.5 size-2.5 shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)"
                  ></div>
                  <div class="flex flex-1 flex-col items-start justify-between gap-1 leading-none">
                    <span class="text-muted-foreground text-xs">{item.payload?.time}</span>
                    <div class="flex items-center gap-2">
                      <span class="text-foreground font-mono font-medium tabular-nums">
                        {Math.round(Number(value))} ms
                      </span>
                    </div>
                  </div>
                </div>
              {/snippet}
            </Chart.Tooltip>
          {/snippet}
        </AreaChart>
      </Chart.Container>
    {/if}
  </Card.Content>
</Card.Root>
