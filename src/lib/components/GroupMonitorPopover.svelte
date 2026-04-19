<script lang="ts">
  import { browser } from "$app/environment";
  import type { Snippet } from "svelte";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import { requestMonitorBar } from "$lib/client/monitor-bar-client";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import { t } from "$lib/stores/i18n";

  interface Props {
    tags: string[];
    days: number;
    endOfDayTodayAtTz: number;
    children: Snippet;
  }

  let { tags, days, endOfDayTodayAtTz, children }: Props = $props();
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

<!--
  "Included Monitors" drawer trigger. The button is a full-width
  Console-style secondary button (h-8, rounded-lg, zinc-800 border,
  13 px leading-none) — matches the Console's secondary button pattern
  used for inline disclosures in dashboard lists.
-->
<div class="w-full">
  <Drawer.Root bind:open={isOpen} direction="bottom">
    <Drawer.Trigger
      class={buttonVariants({
        variant: "ghost",
        size: "sm",
        class:
          "h-8 w-full cursor-pointer rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 text-[13px] font-medium leading-none text-zinc-200 hover:bg-zinc-900"
      })}
    >
      {@render children()}
    </Drawer.Trigger>
    <Drawer.Content class="max-h-[80vh]">
      <Drawer.Header class="gap-1! px-6! pt-5! pb-4! text-start!">
        <Drawer.Title class="text-[15px] font-medium tracking-[-0.01em] text-zinc-50!">
          {$t("Included Monitors (%count)", { count: String(tags.length) })}
        </Drawer.Title>
      </Drawer.Header>
      <div class="scrollbar-hidden flex flex-col overflow-y-auto px-6 pb-6">
        {#if tags.length === 0}
          <div class="px-3 py-8 text-center text-[13px] text-zinc-500">
            {$t("No monitors available.")}
          </div>
        {:else}
          <div class="divide-y divide-zinc-800">
            {#each tags as tag (tag)}
              <div class="py-3">
                {#if monitorBarPromiseByTag[tag]}
                  {#await monitorBarPromiseByTag[tag]}
                    <MonitorBar {tag} />
                  {:then monitorBarData}
                    <MonitorBar {tag} prefetchedData={monitorBarData} />
                  {:catch err}
                    <MonitorBar {tag} prefetchedError={err instanceof Error ? err.message : "Unknown error"} />
                  {/await}
                {:else}
                  <MonitorBar {tag} />
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </Drawer.Content>
  </Drawer.Root>
</div>
