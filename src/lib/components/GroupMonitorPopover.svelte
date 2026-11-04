<script lang="ts">
  import { browser } from "$app/environment";
  import type { Snippet } from "svelte";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import { requestMonitorBar } from "$lib/client/monitor-bar-client";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import { t } from "$lib/stores/i18n";
  import type { PageMonitorLayoutStyle } from "$lib/types/api";
  import { GetGridContainerClass, GetGridItemSpanClass, IsCompactLayout, IsGridLayout } from "$lib/monitorLayout";

  interface Props {
    tags: string[];
    days: number;
    endOfDayTodayAtTz: number;
    // The group's memberLayoutStyle; default-list is the layout groups had before they could choose.
    layoutStyle?: PageMonitorLayoutStyle;
    children: Snippet;
  }

  let { tags, days, endOfDayTodayAtTz, layoutStyle = "default-list", children }: Props = $props();
  let isGrid = $derived(IsGridLayout(layoutStyle));
  let isCompact = $derived(IsCompactLayout(layoutStyle));
  let isOpen = $state(false);
  let monitorBarPromiseByTag = $derived.by(() => {
    if (!browser || !isOpen || tags.length === 0) {
      return {} as Partial<Record<string, Promise<MonitorBarResponse>>>;
    }

    return Object.fromEntries(tags.map((tag) => [tag, requestMonitorBar(tag, days, endOfDayTodayAtTz)])) as Partial<
      Record<string, Promise<MonitorBarResponse>>
    >;
  });
</script>

<div class="w-full">
  <Drawer.Root bind:open={isOpen} direction="bottom">
    <Drawer.Trigger
      class={buttonVariants({
        variant: "ghost",
        size: "sm",
        class: "rounded-btn bg-secondary w-full   text-xs"
      })}
    >
      {@render children()}
    </Drawer.Trigger>
    <Drawer.Content class="max-h-[80vh]">
      <Drawer.Header>
        <Drawer.Title>{$t("Included Monitors (%count)", { count: String(tags.length) })}</Drawer.Title>
      </Drawer.Header>
      <div class="scrollbar-hidden flex flex-col overflow-y-auto px-4 pb-4">
        {#if tags.length === 0}
          <div class="text-muted-foreground p-4 text-sm">{$t("No monitors available.")}</div>
        {:else}
          <div
            class={isGrid
              ? `grid grid-cols-1 overflow-hidden rounded-3xl border ${GetGridContainerClass(layoutStyle)}`
              : ""}
            data-layout={layoutStyle}
          >
            {#each tags as tag, i (tag)}
              <div
                class={isGrid
                  ? `${GetGridItemSpanClass(i, tags.length, layoutStyle)} bg-background px-2 py-2`
                  : `${i < tags.length - 1 ? "border-b" : ""} py-2 ${isCompact ? "" : "pb-4"}`}
              >
                {#if monitorBarPromiseByTag[tag]}
                  {#await monitorBarPromiseByTag[tag]}
                    <MonitorBar {tag} compact={isCompact} grid={isGrid} />
                  {:then monitorBarData}
                    <MonitorBar {tag} prefetchedData={monitorBarData} compact={isCompact} grid={isGrid} />
                  {:catch err}
                    <MonitorBar
                      {tag}
                      prefetchedError={err instanceof Error ? err.message : "Unknown error"}
                      compact={isCompact}
                      grid={isGrid}
                    />
                  {/await}
                {:else}
                  <MonitorBar {tag} compact={isCompact} grid={isGrid} />
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </Drawer.Content>
  </Drawer.Root>
</div>
