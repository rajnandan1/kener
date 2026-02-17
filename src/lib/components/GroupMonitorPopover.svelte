<script lang="ts">
  import type { Snippet } from "svelte";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { requestMonitorBar } from "$lib/client/monitor-bar-client";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import MonitorBar from "$lib/components/MonitorBar.svelte";

  interface Props {
    tags: string[];
    days: number;
    endOfDayTodayAtTz: number;
    children: Snippet;
  }

  let { tags, days, endOfDayTodayAtTz, children }: Props = $props();
  let monitorBarPromiseByTag = $derived.by(() => {
    return Object.fromEntries(tags.map((tag) => [tag, requestMonitorBar(tag, days, endOfDayTodayAtTz)])) as Record<
      string,
      Promise<MonitorBarResponse>
    >;
  });
</script>

<div class=" px-4">
  <Popover.Root>
    <Popover.Trigger class={buttonVariants({ variant: "outline", size: "sm", class: "rounded-btn" })}>
      {@render children()}
    </Popover.Trigger>
    <Popover.Content
      class="bg-background/60 border-border max-h-[75vh] w-[min(92vw,64rem)] overflow-y-auto rounded-3xl border p-0 shadow-2xl backdrop-blur-xl"
      side="bottom"
      align="center"
    >
      <div class="flex flex-col">
        <div class="px-4 pt-4 pb-2 text-sm font-medium">Included Monitors</div>
        {#if tags.length === 0}
          <div class="text-muted-foreground p-4 text-sm">No monitors available.</div>
        {:else}
          {#each tags as tag, i (tag)}
            <div class="{i < tags.length - 1 ? 'border-b' : ''} py-2 pb-4">
              {#await monitorBarPromiseByTag[tag]}
                <MonitorBar {tag} />
              {:then monitorBarData}
                <MonitorBar {tag} prefetchedData={monitorBarData} />
              {:catch err}
                <MonitorBar {tag} prefetchedError={err instanceof Error ? err.message : "Unknown error"} />
              {/await}
            </div>
          {/each}
        {/if}
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
