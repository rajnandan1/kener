<script module lang="ts">
  /*
   * Monitor row — Console dashboard list style.
   *
   * The Console's dashboard list rows (e.g. databases, object storage)
   * use a `px-4 py-3` row with `text-sm font-medium text-zinc-100` for
   * the resource name, Console `<Badge>` tones for lifecycle chips,
   * and `text-[13px] leading-5 text-zinc-400` for dates/secondary text.
   * Kener monitor rows follow the exact same rhythm plus two extra
   * rows for the 90-day status bar and date range — these stack
   * underneath the main row so one monitor reads as one Console-style
   * list item.
   *
   * Maps Kener's status strings (UP / DOWN / DEGRADED / MAINTENANCE)
   * onto Console Badge tones (emerald / red / amber / blue) so status
   * chips pick up the same visual language the Console uses for
   * `active / stopped / error / provisioning` resource states.
   */
  import type { BadgeTone } from "$lib/components/ui/badge";

  export function statusBadgeTone(status: string): BadgeTone {
    switch (status) {
      case "UP":
        return "emerald";
      case "DOWN":
        return "red";
      case "DEGRADED":
        return "amber";
      case "MAINTENANCE":
        return "blue";
      default:
        return "zinc";
    }
  }

  export function statusDisplayLabel(status: string, t: (key: string) => string): string {
    if (status === "UP") return t("Operational");
    if (status === "DOWN") return t("Outage");
    if (status === "DEGRADED") return t("Degraded");
    if (status === "MAINTENANCE") return t("Maintenance");
    return t("No data");
  }
</script>

<script lang="ts">
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { KrackingBadge } from "$lib/components/ui/badge";
  import StatusBarCalendar from "$lib/components/StatusBarCalendar.svelte";
  import type { MonitorBarResponse } from "$lib/server/api-server/monitor-bar/get.js";
  import { formatDate } from "$lib/stores/datetime";
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
</script>

<div class="px-4 py-3">
  {#if loading}
    <!-- Skeleton — mirrors the loaded-state row rhythm -->
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <Skeleton class="h-4 w-40 rounded-md" />
        <Skeleton class="mt-1.5 h-3 w-64 rounded-md" />
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <Skeleton class="h-5 w-20 rounded-md" />
        <Skeleton class="h-4 w-12 rounded-md" />
      </div>
    </div>
    {#if !compact}
      <div class="mt-3 flex flex-col gap-1.5">
        <Skeleton class="h-6 w-full rounded-md" />
        <div class="flex items-center justify-between">
          <Skeleton class="h-3 w-20 rounded-md" />
          <Skeleton class="h-3 w-20 rounded-md" />
        </div>
      </div>
    {/if}
  {:else if error}
    <!-- Error — muted single-line, Console pattern -->
    <div class="text-center text-[13px] text-zinc-500">
      {$t("Failed to load monitor")}: {error}
    </div>
  {:else if data}
    <!--
      Main row. Left: name + description. Right: status Badge + uptime
      value + current latency. Every piece of text uses Console's
      dashboard list scales (`text-sm text-zinc-100` for primary,
      `text-[13px] text-zinc-400` for secondary).
    -->
    <div class="flex items-start justify-between gap-3 sm:items-center">
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm leading-5 font-medium text-zinc-100">
          {data.name}
        </div>
        {#if data.description}
          <div class="mt-0.5 line-clamp-2 text-[13px] leading-5 text-zinc-400 wrap-break-word">
            {data.description}
          </div>
        {/if}
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <KrackingBadge tone={statusBadgeTone(data.currentStatus)}>
          {statusDisplayLabel(data.currentStatus, $t)}
        </KrackingBadge>
        <div class="flex flex-col items-end gap-0.5 text-right">
          <span class={grid ? "text-[13px] font-medium leading-5 text-zinc-100" : "text-sm font-medium leading-5 text-zinc-100"}>
            {data.uptime}%
          </span>
          {#if data.avgLatency}
            <span class="text-[11px] leading-4 text-zinc-500">
              {data.avgLatency}
            </span>
          {/if}
        </div>
      </div>
    </div>

    {#if !compact}
      <!--
        90-day status bar. Dropped to 24 px height to match the Console's
        compact row rhythm — the previous 36 px made the row feel
        visually unbalanced against the surrounding dashboard lists.
      -->
      <div class="mt-3 flex flex-col gap-1.5">
        <StatusBarCalendar
          data={data.uptimeData}
          monitorTag={tag}
          barHeight={24}
          radius={4}
          class="px-0"
        />
        <div class="flex min-w-0 items-center justify-between gap-3">
          <span class="min-w-0 truncate text-[11px] leading-4 text-zinc-500">
            {$formatDate(new Date(data.fromTimeStamp * 1000), page.data.dateAndTimeFormat.dateOnly)}
          </span>
          {#if data.currentStatus === "UP"}
            <span class="shrink-0 text-[11px] leading-4 text-zinc-500">
              {$t("Checked")}
              {$formatDate(new Date(data.toTimeStamp * 1000), page.data.dateAndTimeFormat.datePlusTime)}
            </span>
          {/if}
          <span class="min-w-0 truncate text-right text-[11px] leading-4 text-zinc-500">
            {$formatDate(new Date(data.toTimeStamp * 1000), page.data.dateAndTimeFormat.dateOnly)}
          </span>
        </div>
      </div>
    {/if}

    {#if showGroupPopover}
      <div class="mt-3">
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
