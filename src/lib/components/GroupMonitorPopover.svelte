<script lang="ts">
  import { browser } from "$app/environment";
  import type { Snippet } from "svelte";
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Drawer from "$lib/components/ui/drawer/index.js";
  import { requestMonitorBar } from "$lib/client/monitor-bar-client";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get";
  import type { GroupMemberDisplay } from "$lib/server/types/monitor";
  import MonitorBar from "$lib/components/MonitorBar.svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { t } from "$lib/stores/i18n";

  interface Props {
    tags: string[];
    days: number;
    endOfDayTodayAtTz: number;
    display?: GroupMemberDisplay;
    children: Snippet;
  }

  let { tags, days, endOfDayTodayAtTz, display = "DRAWER", children }: Props = $props();
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

{#snippet memberList()}
  {#if tags.length === 0}
    <div class="text-muted-foreground p-4 text-sm">{$t("No monitors available.")}</div>
  {:else}
    {#each tags as tag, i (tag)}
      <div class="{i < tags.length - 1 ? 'border-b' : ''} py-2 pb-4">
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
  {/if}
{/snippet}

<div class="w-full">
  {#if display === "INLINE"}
    <Button
      variant="ghost"
      size="sm"
      class="rounded-btn bg-secondary w-full text-xs"
      aria-expanded={isOpen}
      onclick={() => (isOpen = !isOpen)}
    >
      {@render children()}
      <ChevronDown class="size-3 transition-transform {isOpen ? 'rotate-180' : ''}" />
    </Button>
    {#if isOpen}
      <div class="flex flex-col pt-2">
        {@render memberList()}
      </div>
    {/if}
  {:else}
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
          {@render memberList()}
        </div>
      </Drawer.Content>
    </Drawer.Root>
  {/if}
</div>
