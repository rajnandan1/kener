<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { GetInitials } from "$lib/clientTools.js";
  import type { IncidentCommentRecord, IncidentForMonitorListWithComments } from "$lib/server/types/db";
  import { SveltePurify } from "@humanspeak/svelte-purify";
  import mdToHTML from "$lib/marked";
  import { slide } from "svelte/transition";

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

  // Oldest comment added to this incident
  const firstCommentAdded = $derived.by((): IncidentCommentRecord | null => {
    if (!incident.comments || incident.comments.length === 0) return null;

    // Comments are already sorted in DB by commented_at DESC, id DESC
    // so oldest comment is the last one.
    return incident.comments.at(-1) ?? null;
  });
</script>

<Item.Root class="items-start  p-0 {className} sm:items-center">
  <Item.Content class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <Item.Title class="min-w-0 text-base wrap-break-word break-all">
        <a class="hover:underline" href={clientResolver(resolve, `/incidents/${incident.id}`)}>{incident.title}</a>
      </Item.Title>
    </div>

    {#if incident.monitors && incident.monitors.length > 0 && !hideMonitors}
      <div class="my-1 overflow-x-auto p-1">
        <div class="flex gap-2">
          {#each incident.monitors as monitor (`${incident.id}-${monitor.monitor_tag}`)}
            <Popover.Root>
              <Popover.Trigger>
                <Badge
                  variant="outline"
                  class="border-{monitor.monitor_impact.toLowerCase()}   cursor-pointer rounded-none border-0 border-b px-0  text-sm font-normal"
                >
                  {monitor.monitor_name}
                </Badge>
              </Popover.Trigger>
              <Popover.Content
                class="bg-background/60 border-border w-64 rounded-3xl border shadow-2xl backdrop-blur-xl"
              >
                <div class="flex flex-col gap-3">
                  <div class="flex items-center gap-3">
                    <Avatar.Root>
                      {#if monitor.monitor_image}
                        <Avatar.Image src={clientResolver(resolve, monitor.monitor_image)} alt={monitor.monitor_name} />
                      {/if}
                      <Avatar.Fallback>{GetInitials(monitor.monitor_name)}</Avatar.Fallback>
                    </Avatar.Root>
                    <div class="flex flex-col">
                      <span class="font-medium">{monitor.monitor_name}</span>
                      <span class="text-muted-foreground text-xs">{monitor.monitor_tag}</span>
                    </div>
                  </div>
                  <div class="flex items-center justify-between">
                    <Badge variant="outline" class="text-{monitor.monitor_impact.toLowerCase()}">
                      {$t(monitor.monitor_impact)}
                    </Badge>
                    <Button
                      variant="outline"
                      class="rounded-btn"
                      size="icon-sm"
                      href={clientResolver(resolve, `/monitors/${monitor.monitor_tag}`)}
                    >
                      <ArrowRight class="size-3" />
                    </Button>
                  </div>
                </div>
              </Popover.Content>
            </Popover.Root>
          {/each}
        </div>
      </div>
    {/if}

    <Item.Description
      class="mt-2 flex w-full flex-col gap-2 text-xs font-medium sm:flex-row sm:items-center sm:justify-between"
    >
      <span class="max-w-full rounded-full border px-3 py-2 wrap-break-word">
        {$formatDate(incident.start_date_time, "PPp")}
      </span>
      <span class="relative w-full text-center sm:flex-1">
        <span
          class="absolute top-0 bottom-0 left-1/2 border-l sm:top-1/2 sm:right-0 sm:bottom-auto sm:left-0 sm:border-t sm:border-l-0"
        ></span>
        <span class="bg-background relative z-10 px-0 py-1 sm:px-2">
          {$formatDuration(incident.start_date_time, endTimeForDuration)}
        </span>
      </span>
      {#if incident.end_date_time}
        <span class="max-w-full rounded-full border px-3 py-2 wrap-break-word">
          {$formatDate(incident.end_date_time, "PPp")}
        </span>
      {:else}
        <span class="max-w-full rounded-full border px-3 py-2 wrap-break-word">
          {$t("Ongoing")}
        </span>
      {/if}
    </Item.Description>
    {#if showSummary}
      <div class="my-2 grid grid-cols-1 gap-4 text-xs font-medium sm:grid-cols-3">
        <div class="text-muted-foreground bg-secondary flex items-center justify-between rounded-full border p-2 px-4">
          <span>Last Updated</span>
          <span>{$formatDate(incident.updated_at, "PPp")}</span>
        </div>
        <div class="text-muted-foreground bg-secondary flex items-center justify-between rounded-full border p-2 px-4">
          <span>Status</span>
          <div class="flex items-center gap-2">
            <span class="text-{incident.state.toLowerCase()}">
              {incident.state}
            </span>
          </div>
        </div>
        <div
          class="text-muted-foreground bg-secondary flex items-center justify-between gap-2 rounded-full border p-2 px-4"
        >
          <span>
            {incident.comments && incident.comments.length > 0
              ? `${incident.comments.length} ${$t("Updates")}`
              : $t("No Updates")}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            class="rounded-btn -mr-2"
            onclick={() => (showComments = !showComments)}
          >
            <ArrowRight class={`transition-transform duration-200 ${showComments ? "rotate-90" : ""}`} />
          </Button>
        </div>
      </div>
    {/if}
    {#if showComments && incident.comments && incident.comments.length > 0}
      <div transition:slide={{ duration: 220 }} class=" flex flex-col gap-4">
        {#each incident.comments as comment (comment.id)}
          <div class="flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0">
            <div class="flex justify-start gap-2">
              <Badge variant="outline" class="text-{comment.state.toLowerCase()} rounded-none border-0 p-0">
                {$t(comment.state)}
              </Badge>
              <span class="text-muted-foreground text-xs">
                {$formatDate(comment.commented_at, "PPp")}
              </span>
            </div>
            <div
              class="prose prose-sm dark:prose-invert max-w-none min-w-0 overflow-x-auto wrap-break-word"
              style="font-size: 14px;"
            >
              <SveltePurify html={mdToHTML(comment.comment)} />
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </Item.Content>
</Item.Root>
