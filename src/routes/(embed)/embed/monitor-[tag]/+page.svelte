<script lang="ts">
  import { onMount } from "svelte";
  import { setMode } from "mode-watcher";
  import { resolve } from "$app/paths";
  import StatusBarCalendar from "$lib/components/StatusBarCalendar.svelte";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";

  interface Props {
    data: {
      monitorTag: string;
      days: number;
      endOfDayTodayAtTz: number;
      theme: string;
      localTz: string;
    };
  }

  let { data }: Props = $props();

  // State
  let loading = $state(true);
  let overviewData = $state<MonitorBarResponse | null>(null);
  let error = $state<string | null>(null);

  const localTz = $derived(data.localTz || "UTC");

  // Display values from API response
  let displayUptime = $derived(overviewData?.uptime ?? "--");
  let displayAvgLatency = $derived(overviewData?.avgLatency ?? "--");
  let displayData = $derived(overviewData?.uptimeData ?? []);

  async function fetchData() {
    loading = true;
    error = null;

    try {
      const url = `${resolve("/dashboard-apis/monitor-bar")}?tag=${data.monitorTag}&endOfDayTodayAtTz=${data.endOfDayTodayAtTz}&days=${data.days}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Monitor not found");
      }

      overviewData = await response.json();
    } catch (e) {
      console.error("Failed to fetch monitor data:", e);
      error = e instanceof Error ? e.message : "Failed to load data";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (data.theme) {
      setMode(data.theme === "dark" ? "dark" : "light");
    }
    fetchData();
  });
</script>

<div class="flex flex-col gap-2 p-2">
  {#if loading}
    <!-- Loading skeleton -->
    <div class="flex items-center justify-between">
      <Skeleton class="h-4 w-20" />
      <Skeleton class="h-4 w-24" />
    </div>
    <Skeleton class="h-7.5 w-full rounded" />
  {:else if error}
    <div class="text-muted-foreground text-xs">{error}</div>
  {:else}
    <!-- Stats row -->
    <div class="flex items-center justify-between text-xs font-semibold">
      <span class="text-foreground">{displayUptime}% Uptime</span>
      {#if displayAvgLatency !== "--"}
        <span class="">{displayAvgLatency} Avg Latency</span>
      {/if}
    </div>

    <!-- Status bar calendar -->
    <StatusBarCalendar
      data={displayData}
      monitorTag={data.monitorTag}
      {localTz}
      barHeight={30}
      radius={4}
      disableClick={true}
    />
  {/if}
</div>
