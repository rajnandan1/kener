<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import ICONS from "$lib/icons";
  import StatusBarCalendar from "$lib/components/StatusBarCalendar.svelte";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { formatDate } from "$lib/stores/datetime";
  import { GetInitials } from "$lib/clientTools.js";

  interface Props {
    tag: string;
    prefetchedData?: MonitorBarResponse;
    prefetchedError?: string;
  }

  let { tag, prefetchedData, prefetchedError }: Props = $props();
  let data = $derived(prefetchedData ?? null);
  let error = $derived(prefetchedError ?? null);
  let loading = $derived(!data && !error);

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
      <Item.Media variant="image">
        <Skeleton class="size-8 rounded" />
      </Item.Media>
      <Item.Content class="min-w-0 flex-1">
        <Skeleton class="mb-2 h-5 w-40" />
        <Skeleton class="h-4 w-64" />
      </Item.Content>
      <Item.Content class="order-3 w-full text-left sm:order-0 sm:w-auto sm:flex-none sm:text-center">
        <Skeleton class="h-8 w-24" />
      </Item.Content>
      <Item.Actions class="ml-auto self-start sm:ml-0 sm:self-auto">
        <Skeleton class="size-9" />
      </Item.Actions>
    </Item.Root>
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
  {:else if error}
    <!-- Error state -->
    <div class="text-destructive p-4 text-center">
      <p>Failed to load monitor: {error}</p>
    </div>
  {:else if data}
    <!-- Loaded state -->
    {@const StatusIcon = STATUS_ICON[data.currentStatus]}
    <Item.Root class="items-start sm:items-center">
      <Item.Media variant="image">
        <Avatar.Root class="size-10">
          {#if data.image}
            <Avatar.Image src={clientResolver(resolve, data.image)} alt={data.name} class="  " />
          {/if}
          <Avatar.Fallback>{GetInitials(data.name)}</Avatar.Fallback>
        </Avatar.Root>
      </Item.Media>

      <Item.Content class="min-w-0 flex-1">
        <Item.Title class="w-full truncate">{data.name}</Item.Title>
        {#if data.description}
          <Item.Description class="line-clamp-2 wrap-break-word">{data.description}</Item.Description>
        {/if}
      </Item.Content>

      <Item.Content class="order-3 w-full text-left sm:order-0 sm:w-auto sm:flex-none sm:text-center">
        <Item.Title class="items-start text-2xl">
          <StatusIcon class="{STATUS_STROKE[data.currentStatus]} mt-1.5" />
          <div class="flex flex-col items-start gap-1">
            <span>{data.uptime}%</span>
            <span class="text-muted-foreground text-xs">
              {data.avgLatency}
            </span>
          </div>
        </Item.Title>
      </Item.Content>
      <Item.Actions class="ml-auto self-start sm:ml-0 sm:self-auto">
        <Button
          size="icon"
          variant="outline"
          class="cursor-pointer rounded-full shadow-none"
          href={clientResolver(resolve, `/monitors/${tag}`)}
        >
          <ICONS.ARROW_RIGHT />
        </Button>
      </Item.Actions>
    </Item.Root>
    <div class="mx-auto flex w-full flex-col gap-1 px-4">
      <StatusBarCalendar data={data.uptimeData} monitorTag={tag} barHeight={40} radius={8} />
      <div class="flex min-w-0 justify-between gap-3">
        <p class="text-muted-foreground min-w-0 truncate text-xs font-medium">
          {$formatDate(new Date(data.fromTimeStamp * 1000), "MMM d, yyyy")}
        </p>
        <p class="text-muted-foreground min-w-0 truncate text-right text-xs font-medium">
          {$formatDate(new Date(data.toTimeStamp * 1000), "MMM d, yyyy")}
        </p>
      </div>
    </div>
  {/if}
</div>
