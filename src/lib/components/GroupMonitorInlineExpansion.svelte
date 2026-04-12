<script lang="ts">
  import { browser } from "$app/environment";
  import type { Snippet } from "svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import { requestMonitorBar } from "$lib/client/monitor-bar-client";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import { t } from "$lib/stores/i18n";

  interface Props {
    tags: string[];
    days: number;
    endOfDayTodayAtTz: number;
    children: Snippet;
    prefetchedDataByTag?: Partial<Record<string, MonitorBarResponse>>;
    prefetchedErrorByTag?: Record<string, string>;
    groupChildTagsByTag?: Record<string, string[]>;
    compact?: boolean;
    initiallyOpen?: boolean;
  }

  let {
    tags,
    days,
    endOfDayTodayAtTz,
    children,
    prefetchedDataByTag = {},
    prefetchedErrorByTag = {},
    groupChildTagsByTag = {},
    compact = false,
    initiallyOpen = false,
  }: Props = $props();

  let expanded = $state(false);

  $effect(() => {
    expanded = initiallyOpen;
  });

  let monitorBarPromiseByTag = $derived.by(() => {
    if (!browser || !expanded || tags.length === 0) {
      return {} as Partial<Record<string, Promise<MonitorBarResponse>>>;
    }

    return Object.fromEntries(
      tags
        .filter((tag) => !prefetchedDataByTag[tag] && !prefetchedErrorByTag[tag])
        .map((tag) => [tag, requestMonitorBar(tag, days, endOfDayTodayAtTz)]),
    ) as Partial<Record<string, Promise<MonitorBarResponse>>>;
  });
</script>

<div class="w-full">
  <button
    type="button"
    class={buttonVariants({
      variant: "ghost",
      size: "sm",
      class: "bg-secondary hover:bg-secondary/80 flex w-full items-center justify-between rounded-btn text-xs",
    })}
    onclick={() => (expanded = !expanded)}
    aria-expanded={expanded}
  >
    <span class="flex min-w-0 items-center gap-2 text-left">
      {@render children()}
    </span>
    <ChevronDown class={`size-3 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
  </button>

  {#if expanded}
    <div class="bg-muted/20 mt-3 overflow-hidden rounded-2xl border">
      {#if tags.length === 0}
        <div class="text-muted-foreground p-4 text-sm">{$t("No monitors available.")}</div>
      {:else}
        {#each tags as tag, index (tag)}
          <div class={`px-3 py-3 ${index < tags.length - 1 ? "border-b" : ""}`}>
            {#if prefetchedDataByTag[tag] || prefetchedErrorByTag[tag]}
              <MonitorBar
                {tag}
                prefetchedData={prefetchedDataByTag[tag]}
                prefetchedError={prefetchedErrorByTag[tag]}
                groupChildTags={groupChildTagsByTag[tag] || []}
                groupChildTagsByTag={groupChildTagsByTag}
                days={days}
                {endOfDayTodayAtTz}
                {compact}
              />
            {:else if monitorBarPromiseByTag[tag]}
              {#await monitorBarPromiseByTag[tag]}
                <MonitorBar
                  {tag}
                  groupChildTags={groupChildTagsByTag[tag] || []}
                  groupChildTagsByTag={groupChildTagsByTag}
                  days={days}
                  {endOfDayTodayAtTz}
                  {compact}
                />
              {:then monitorBarData}
                <MonitorBar
                  {tag}
                  prefetchedData={monitorBarData}
                  groupChildTags={groupChildTagsByTag[tag] || []}
                  groupChildTagsByTag={groupChildTagsByTag}
                  days={days}
                  {endOfDayTodayAtTz}
                  {compact}
                />
              {:catch err}
                <MonitorBar
                  {tag}
                  prefetchedError={err instanceof Error ? err.message : "Unknown error"}
                  groupChildTags={groupChildTagsByTag[tag] || []}
                  groupChildTagsByTag={groupChildTagsByTag}
                  days={days}
                  {endOfDayTodayAtTz}
                  {compact}
                />
              {/await}
            {:else}
              <MonitorBar
                {tag}
                groupChildTags={groupChildTagsByTag[tag] || []}
                groupChildTagsByTag={groupChildTagsByTag}
                days={days}
                {endOfDayTodayAtTz}
                {compact}
              />
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  {/if}
</div>
