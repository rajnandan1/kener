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
    compactMembers?: boolean;
    children: Snippet;
  }

  let { tags, days, endOfDayTodayAtTz, display = "DRAWER", compactMembers = false, children }: Props = $props();
  const panelId = $props.id();
  let isOpen = $state(false);
  let openCount = $state(0);
  let requestKey = $derived(display === "INLINE" ? openCount : Number(isOpen));
  let monitorBarPromiseByTag = $derived.by(() => {
    if (!browser || requestKey === 0 || tags.length === 0) {
      return {} as Partial<Record<string, Promise<MonitorBarResponse>>>;
    }

    return Object.fromEntries(tags.map((tag) => [tag, requestMonitorBar(tag, days, endOfDayTodayAtTz)])) as Partial<
      Record<string, Promise<MonitorBarResponse>>
    >;
  });
</script>

{#snippet memberList(rowProps: { compact?: boolean; grid?: boolean } = {})}
  {#if tags.length === 0}
    <div class="text-muted-foreground p-4 text-sm">{$t("No monitors available.")}</div>
  {:else}
    {#each tags as tag, i (tag)}
      <div class="{i < tags.length - 1 ? 'border-b' : ''} py-2 pb-4">
        {#if monitorBarPromiseByTag[tag]}
          {#await monitorBarPromiseByTag[tag]}
            <MonitorBar {tag} {...rowProps} />
          {:then monitorBarData}
            <MonitorBar {tag} prefetchedData={monitorBarData} {...rowProps} />
          {:catch err}
            <MonitorBar {tag} prefetchedError={err instanceof Error ? err.message : "Unknown error"} {...rowProps} />
          {/await}
        {:else}
          <MonitorBar {tag} {...rowProps} />
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
      aria-controls={panelId}
      onclick={() => {
        isOpen = !isOpen;
        if (isOpen) openCount += 1;
      }}
    >
      {@render children()}
      <ChevronDown
        class="size-3 transition-transform duration-200 motion-reduce:transition-none {isOpen ? 'rotate-180' : ''}"
      />
    </Button>
    <!-- CSS cannot animate height to auto, but it can animate a grid row from 0fr to 1fr. -->
    <div
      id={panelId}
      class="grid transition-[grid-template-rows,visibility] duration-200 motion-reduce:transition-none {isOpen
        ? 'visible grid-rows-[1fr]'
        : 'invisible grid-rows-[0fr]'}"
    >
      <div class="overflow-hidden">
        {#if openCount > 0}
          <div class="flex flex-col pt-2">
            {@render memberList({ compact: compactMembers, grid: compactMembers })}
          </div>
        {/if}
      </div>
    </div>
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
