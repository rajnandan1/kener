<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { IconArrowRight } from "@tabler/icons-svelte";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { GetInitials } from "$lib/clientTools.js";
  import type { IncidentForMonitorListWithComments } from "$lib/server/types/db";
  import { SveltePurify } from "@humanspeak/svelte-purify";
  import mdToHTML from "$lib/marked";
  import { slide } from "svelte/transition";
  import { page } from "$app/state";

  interface Props {
    incident: IncidentForMonitorListWithComments;
    class?: string;
    hideMonitors?: boolean;
    showComments?: boolean;
    showSummary?: boolean;
  }

  let {
    incident,
    class: className = "",
    hideMonitors = false,
    showComments = true,
    showSummary = true
  }: Props = $props();

  // Calculate duration between start and end (or now if ongoing)
  // If ongoing, use current timestamp for duration calculation
  const endTimeForDuration = $derived(incident.end_date_time ?? Math.floor(Date.now() / 1000));

  const isEmbedded = page.route.id?.includes("(embed)");
  const target = isEmbedded ? "_blank" : "_self";
</script>

<!--
  Incident item (public surface).

  Styled to match the Console's dashboard language: subtle zinc-toned
  cards, rounded-lg info chips, dot separators for inline metadata. No
  pill-shaped pills, no heavy shadows, no rounded-3xl curves — the
  public pages share the same visual grammar as the Console.
-->
<Item.Root class="items-start p-0 {className} sm:items-center">
  <Item.Content class="min-w-0 flex-1">
    <!-- State indicator + title -->
    <div class="flex flex-col items-start justify-start gap-1">
      <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-{incident.state.toLowerCase()}">
        <span class="inline-flex size-1.5 shrink-0 rounded-full bg-{incident.state.toLowerCase()}"></span>
        {$t(incident.state)}
      </span>
      <Item.Title class="min-w-0 text-[15px] font-medium text-zinc-100 wrap-break-word break-all">
        <a {target} class="hover:underline" href={clientResolver(resolve, `/incidents/${incident.id}`)}>
          {incident.title}
        </a>
      </Item.Title>
    </div>

    <!-- Affected monitors as compact, rounded chips -->
    {#if incident.monitors && incident.monitors.length > 0 && !hideMonitors}
      <div class="mt-2 -mx-0.5 flex flex-wrap gap-1.5 overflow-x-auto">
        {#each incident.monitors as monitor (`${incident.id}-${monitor.monitor_tag}`)}
          <Popover.Root>
            <Popover.Trigger disabled={isEmbedded}>
              <span
                class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-900"
              >
                <span class="inline-flex size-1.5 shrink-0 rounded-full bg-{monitor.monitor_impact.toLowerCase()}"></span>
                {monitor.monitor_name}
              </span>
            </Popover.Trigger>
            <Popover.Content
              class="w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-xl"
            >
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-3">
                  <Avatar.Root>
                    {#if monitor.monitor_image}
                      <Avatar.Image src={clientResolver(resolve, monitor.monitor_image)} alt={monitor.monitor_name} />
                    {/if}
                    <Avatar.Fallback>{GetInitials(monitor.monitor_name)}</Avatar.Fallback>
                  </Avatar.Root>
                  <div class="flex min-w-0 flex-col">
                    <span class="truncate text-[13px] font-medium text-zinc-100">{monitor.monitor_name}</span>
                    <span class="truncate text-[11px] text-zinc-500">{monitor.monitor_tag}</span>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[11px] font-medium text-zinc-300"
                  >
                    <span class="inline-flex size-1.5 shrink-0 rounded-full bg-{monitor.monitor_impact.toLowerCase()}"></span>
                    <span class="text-{monitor.monitor_impact.toLowerCase()}">
                      {$t(monitor.monitor_impact)}
                    </span>
                  </span>
                  <div class="rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 text-zinc-500">
                    <IconArrowRight class="size-3" />
                  </div>
                </div>
              </div>
            </Popover.Content>
          </Popover.Root>
        {/each}
      </div>
    {/if}

    <!--
      Inline timeline. Replaces the earlier three rounded-full pill chips
      with a single muted row of text + dot separators. Matches the way
      the Console lists metadata under dashboard list items.
    -->
    <Item.Description
      class="mt-2 flex w-full flex-col gap-1 text-[12px] text-zinc-500 sm:flex-row sm:items-center sm:gap-2"
    >
      <span>
        <span class="text-zinc-400">{$t("Started")}</span>
        {$formatDate(incident.start_date_time, page.data.dateAndTimeFormat.datePlusTime)}
      </span>
      <span aria-hidden="true" class="hidden text-zinc-700 sm:inline">·</span>
      <span>
        <span class="text-zinc-400">{$t("Duration")}</span>
        {$formatDuration(incident.start_date_time, endTimeForDuration)}
      </span>
      <span aria-hidden="true" class="hidden text-zinc-700 sm:inline">·</span>
      {#if incident.end_date_time}
        <span>
          <span class="text-zinc-400">{$t("Ended")}</span>
          {$formatDate(incident.end_date_time, page.data.dateAndTimeFormat.datePlusTime)}
        </span>
      {:else}
        <span class="text-zinc-300">{$t("Ongoing")}</span>
      {/if}
    </Item.Description>

    <!--
      Summary strip. Three equal info chips: last updated, status,
      updates count (with expand/collapse action). Console style —
      `rounded-lg`, neutral zinc borders, compact padding.
    -->
    {#if showSummary}
      <div class="mt-3 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-3">
        <div class="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <span class="text-zinc-500">{$t("Last Updated")}</span>
          <span class="text-zinc-300">{$formatDate(incident.updated_at, page.data.dateAndTimeFormat.datePlusTime)}</span>
        </div>
        <div class="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <span class="text-zinc-500">{$t("Status")}</span>
          <span class="text-{incident.state.toLowerCase()} font-medium">
            {$t(incident.state)}
          </span>
        </div>
        <div class="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <span class="text-zinc-500">
            {incident.comments && incident.comments.length > 0
              ? `${incident.comments.length} ${$t("Updates")}`
              : $t("No Updates")}
          </span>
          {#if !isEmbedded}
            <button
              type="button"
              aria-label={showComments ? "Collapse updates" : "Expand updates"}
              aria-expanded={showComments}
              class="-mr-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
              onclick={() => (showComments = !showComments)}
            >
              <IconArrowRight
                class="size-3.5 transition-transform duration-200 {showComments ? 'rotate-90' : ''}"
              />
            </button>
          {/if}
        </div>
      </div>
    {/if}

    <!--
      Comments timeline. Simple divided rows inside the same card;
      dot indicator in front of the state uses the same
      text-{state} utility the rest of the page uses.
    -->
    {#if showSummary && showComments && incident.comments && incident.comments.length > 0}
      <div transition:slide={{ duration: 220 }} class="mt-3 flex flex-col gap-3">
        {#each incident.comments as comment (comment.id)}
          <div class="flex flex-col gap-2 border-b border-zinc-800 pb-3 last:border-b-0 last:pb-0">
            <div class="flex items-center justify-start gap-2">
              <span class="inline-flex size-1.5 shrink-0 rounded-full bg-{comment.state.toLowerCase()}"></span>
              <span class="text-[12px] font-medium text-{comment.state.toLowerCase()}">
                {$t(comment.state)}
              </span>
              <span class="text-[11px] text-zinc-500">
                {$formatDate(comment.commented_at, page.data.dateAndTimeFormat.datePlusTime)}
              </span>
            </div>
            <div
              class="prose prose-sm dark:prose-invert max-w-none min-w-0 overflow-x-auto wrap-break-word"
              style="font-size: 13px;"
            >
              <SveltePurify html={mdToHTML(comment.comment)} />
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Item.Content>
</Item.Root>
