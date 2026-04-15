<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import ICONS from "$lib/icons";
  import StatusBarCalendar from "$lib/components/StatusBarCalendar.svelte";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { formatDate } from "$lib/stores/datetime";
  import { GetInitials } from "$lib/clientTools.js";
  import GroupMonitorPopover from "./GroupMonitorPopover.svelte";
  import { t } from "$lib/stores/i18n";
  import { page } from "$app/state";

  interface Props {
    tag: string;
    prefetchedData?: MonitorBarResponse;
    prefetchedError?: string;
    groupChildTags?: string[];
    days?: number;
    endOfDayTodayAtTz?: number;
    compact?: boolean;
    grid?: boolean;
  }

  let {
    tag,
    prefetchedData,
    prefetchedError,
    groupChildTags = [],
    days,
    endOfDayTodayAtTz,
    compact = false,
    grid = false
  }: Props = $props();
  let data = $derived(prefetchedData ?? null);
  let error = $derived(prefetchedError ?? null);
  let loading = $derived(!data && !error);
  let showGroupPopover = $derived(
    groupChildTags.length > 0 && typeof days === "number" && typeof endOfDayTodayAtTz === "number"
  );

  const STATUS_DOT = {
    UP: "bg-up",
    DOWN: "bg-down",
    DEGRADED: "bg-degraded",
    MAINTENANCE: "bg-maintenance",
    NO_DATA: "bg-zinc-600"
  } as const;
</script>

<div>
  {#if loading}
    <!-- Skeleton loader -->
    <Item.Root class="items-start sm:items-center">
      {#if !compact}
        <Item.Media variant="image">
          <Skeleton class="size-8 rounded" />
        </Item.Media>
      {/if}
      <Item.Content class="min-w-0 flex-1">
        <Skeleton class="mb-2 h-5 w-full" />
        <Skeleton class="h-4 w-full" />
      </Item.Content>
      <Item.Content class="order-3 w-full text-left sm:order-0 sm:w-auto sm:flex-none sm:text-center">
        <Skeleton class="h-8 w-full" />
      </Item.Content>
    </Item.Root>
    {#if !compact}
      <div class="mx-auto flex w-full flex-col gap-1 px-4">
        <div class="flex justify-end overflow-hidden rounded-full">
          {#each Array(54) as _, i (i)}
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
    {/if}
  {:else if error}
    <!-- Error state -->
    <div class="text-destructive p-4 text-center">
      <p>Failed to load monitor: {error}</p>
    </div>
  {:else if data}
    <!-- Loaded state -->
    <Item.Root class="items-start px-4 py-3">

      <Item.Content class="min-w-0 flex-1">
        <Item.Title class="w-full truncate text-zinc-100">
          <span>{data.name}</span>
        </Item.Title>
        {#if data.description}
          <Item.Description class="line-clamp-2 wrap-break-word text-zinc-400">{data.description}</Item.Description>
        {/if}
      </Item.Content>

      <Item.Content class="order-3 w-full text-left sm:order-0 sm:w-auto sm:flex-none sm:text-center">
        <Item.Title class="items-center gap-3 text-2xl text-zinc-100">
          <div class="flex flex-col items-start gap-1 sm:items-end">
            <span class={grid ? "text-base sm:text-lg" : "text-lg sm:text-xl"}>{data.uptime}%</span>
            <span class="flex flex-wrap items-center gap-1.5 text-right text-xs text-zinc-400 sm:justify-end">
              {#if data.currentStatus === "UP"}
                <span class="{STATUS_DOT[data.currentStatus]} inline-flex size-1.5 shrink-0 rounded-full"></span>
                <span class="font-medium text-zinc-300">{$t("All Systems Operational")}</span>
                <span class="text-zinc-600">@</span>
                <span>{$formatDate(new Date(data.toTimeStamp * 1000), page.data.dateAndTimeFormat.datePlusTime)}</span>
                <span class="text-zinc-600">|</span>
                <span>{data.avgLatency}</span>
              {:else}
                <span class="{STATUS_DOT[data.currentStatus]} inline-flex size-1.5 shrink-0 rounded-full"></span>
                <span>{data.avgLatency}</span>
              {/if}
            </span>
          </div>
        </Item.Title>
      </Item.Content>
    </Item.Root>
    {#if !compact}
      <div class="mx-auto flex w-full flex-col gap-2 px-4 pb-4">
        <StatusBarCalendar data={data.uptimeData} monitorTag={tag} barHeight={36} radius={6} class="px-0.5" />
        <div class="flex min-w-0 justify-between gap-3">
          <p class="min-w-0 truncate text-xs font-medium text-zinc-500">
            {$formatDate(new Date(data.fromTimeStamp * 1000), page.data.dateAndTimeFormat.dateOnly)}
          </p>

          <p class="min-w-0 truncate text-right text-xs font-medium text-zinc-500">
            {$formatDate(new Date(data.toTimeStamp * 1000), page.data.dateAndTimeFormat.dateOnly)}
          </p>
        </div>
      </div>
    {/if}
    {#if showGroupPopover}
      <div class="mt-2 flex justify-center gap-2 px-4">
        <GroupMonitorPopover
          tags={groupChildTags}
          days={days as number}
          endOfDayTodayAtTz={endOfDayTodayAtTz as number}
        >
          {$t("Included Monitors (%count)", { count: String(groupChildTags.length) })}
        </GroupMonitorPopover>
      </div>
    {/if}
  {/if}
</div>
