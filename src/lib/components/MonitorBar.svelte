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
    {@const StatusIcon = STATUS_ICON[data.currentStatus]}
    <Item.Root class="items-start px-4 py-4">
      {#if !compact}
        <Item.Media variant="image" class="hidden sm:block">
          <Avatar.Root class="size-10">
            {#if data.image}
              <Avatar.Image src={clientResolver(resolve, data.image)} alt={data.name} class="  " />
            {/if}
            <Avatar.Fallback>{GetInitials(data.name)}</Avatar.Fallback>
          </Avatar.Root>
        </Item.Media>
      {/if}
      <Item.Content class="min-w-0 flex-1">
        <Item.Title class="w-full truncate text-zinc-100">
          <a class="hover:underline" href={clientResolver(resolve, `/monitors/${tag}`)}>{data.name}</a>
        </Item.Title>
        {#if data.description}
          <Item.Description class="line-clamp-2 wrap-break-word text-zinc-400">{data.description}</Item.Description>
        {/if}
      </Item.Content>

      <Item.Content class="order-3 w-full text-left sm:order-0 sm:w-auto sm:flex-none sm:text-center">
        <Item.Title class="items-center text-2xl text-zinc-100">
          <StatusIcon class="{STATUS_STROKE[data.currentStatus]} {grid ? 'size-5' : 'size-5'}" />
          <div class="flex flex-col items-start gap-1 sm:items-end">
            <span class={grid ? "text-base sm:text-lg" : "text-lg sm:text-xl"}>{data.uptime}%</span>
            <span class="text-right text-xs text-zinc-400">
              {data.currentStatus === "UP"
                ? `${$t("All Systems Operational")} @ ${$formatDate(
                    new Date(data.toTimeStamp * 1000),
                    page.data.dateAndTimeFormat.datePlusTime
                  )} | ${data.avgLatency}`
                : data.avgLatency}
            </span>
          </div>
        </Item.Title>
      </Item.Content>
    </Item.Root>
    {#if !compact}
      <div class="mx-auto flex w-full flex-col gap-1 px-4 pb-4">
        <StatusBarCalendar data={data.uptimeData} monitorTag={tag} barHeight={40} radius={8} />
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
