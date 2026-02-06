<script lang="ts">
  import { onMount, untrack } from "svelte";
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import ICONS from "$lib/icons";
  import { getEndOfDayAtTz } from "$lib/client/datetime";
  import StatusBarCalendar from "$lib/components/StatusBarCalendar.svelte";
  import { selectedTimezone } from "$lib/stores/timezone";
  import type { MonitorBarResponse, BarData } from "$lib/server/api-server/monitor-bar/get.js";
  import { resolve } from "$app/paths";

  interface Props {
    tag: string;
  }

  let { tag }: Props = $props();

  let loading = $state(true);
  let data = $state<MonitorBarResponse | null>(null);
  let error = $state<string | null>(null);

  const STATUS_ICON = {
    UP: ICONS.UP,
    DOWN: ICONS.DOWN,
    DEGRADED: ICONS.DEGRADED,
    MAINTENANCE: ICONS.MAINTENANCE,
    NO_DATA: ICONS.MAINTENANCE
  } as const;

  const STATUS_STROKE = {
    UP: "stroke-up",
    DOWN: "stroke-down",
    DEGRADED: "stroke-degraded",
    MAINTENANCE: "stroke-maintenance",
    NO_DATA: "stroke-muted-foreground"
  } as const;

  function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: $selectedTimezone
    });
  }

  async function fetchData() {
    loading = true;
    error = null;
    try {
      const endOfDayTodayAtTz = getEndOfDayAtTz($selectedTimezone);
      const response = await fetch(
        `${resolve("/dashboard-apis/monitor-bar")}?tag=${encodeURIComponent(tag)}&endOfDayTodayAtTz=${endOfDayTodayAtTz}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch monitor data");
      }
      data = await response.json();
    } catch (e) {
      console.error("Failed to fetch monitor bar data:", e);
      error = e instanceof Error ? e.message : "Unknown error";
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchData();
  });

  // Re-fetch when timezone changes
  let initialLoad = true;
  $effect(() => {
    // Use untrack to avoid tracking loading/data state changes
    untrack(() => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      fetchData();
    });
  });
</script>

<div>
  {#if loading}
    <!-- Skeleton loader -->
    <Item.Root>
      <Item.Media variant="image">
        <Skeleton class="size-8 rounded" />
      </Item.Media>
      <Item.Content>
        <Skeleton class="mb-2 h-5 w-40" />
        <Skeleton class="h-4 w-64" />
      </Item.Content>
      <Item.Content class="flex-none text-center">
        <Skeleton class="h-8 w-24" />
      </Item.Content>
      <Item.Actions>
        <Skeleton class="size-9" />
      </Item.Actions>
    </Item.Root>
    <div class="mx-auto flex w-full flex-col gap-1 px-4">
      <div class="flex justify-end overflow-hidden rounded-full">
        {#each Array(54) as _, i}
          <Skeleton
            class="h-4 w-4 shrink-0 {i === 0 ? 'rounded-tl-full rounded-bl-full' : ''} {i === 53
              ? 'rounded-tr-full rounded-br-full'
              : ''}"
          />
        {/each}
      </div>
      <div class="flex justify-end">
        <Skeleton class="h-3 w-32" />
      </div>
    </div>
  {:else if error}
    <!-- Error state -->
    <div class="text-destructive p-4 text-center">
      <p>Failed to load monitor: {error}</p>
    </div>
  {:else if data}
    <!-- Loaded state -->
    {@const StatusIcon = STATUS_ICON[data.currentStatus]}
    <Item.Root>
      <Item.Media variant="image">
        <Avatar.Root class="size-10">
          <Avatar.Image src={data.image} alt={data.name} class="  " />
          <Avatar.Fallback>{data.name.charAt(1)}</Avatar.Fallback>
        </Avatar.Root>
      </Item.Media>

      <Item.Content>
        <Item.Title>{data.name}</Item.Title>
        {#if data.description}
          <Item.Description>{data.description}</Item.Description>
        {/if}
      </Item.Content>

      <Item.Content class="flex-none text-center">
        <Item.Title class="text-2xl">
          <StatusIcon class={STATUS_STROKE[data.currentStatus]} />
          <div class="flex flex-col items-start gap-1">
            <span>{data.uptime}%</span>
            <span class="text-muted-foreground text-xs">
              {data.avgLatency}
            </span>
          </div>
        </Item.Title>
      </Item.Content>
      <Item.Actions>
        <Button size="icon" variant="outline" class="cursor-pointer rounded-full shadow-none" href="/monitors/{tag}">
          <ICONS.ARROW_RIGHT />
        </Button>
      </Item.Actions>
    </Item.Root>
    <div class="mx-auto flex w-full flex-col gap-1 px-4">
      <StatusBarCalendar data={data.uptimeData} monitorTag={tag} barHeight={40} radius={8} />
      <div class="flex justify-between">
        <p class="text-muted-foreground text-xs font-medium">
          {formatTimestamp(data.fromTimeStamp)}
        </p>
        <p class="text-muted-foreground text-xs font-medium">
          {formatTimestamp(data.toTimeStamp)}
        </p>
      </div>
    </div>
  {/if}
</div>
