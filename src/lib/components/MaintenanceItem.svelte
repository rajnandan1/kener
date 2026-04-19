<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { IconArrowRight } from "@tabler/icons-svelte";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { GetInitials } from "$lib/clientTools.js";
  import type { MaintenanceEventsMonitorList } from "$lib/server/types/db";
  import { page } from "$app/state";

  interface Props {
    maintenance: MaintenanceEventsMonitorList;
    class?: string;
    hideMonitors?: boolean;
  }

  let { maintenance, class: className = "", hideMonitors = false }: Props = $props();
  // Check if maintenance is ongoing (current time is between start and end)
  const isOngoing = $derived(() => {
    const now = Date.now() / 1000;
    return now >= maintenance.start_date_time && now <= maintenance.end_date_time;
  });
  const isEmbedded = page.route.id?.includes("(embed)");
  const target = isEmbedded ? "_blank" : "_self";
</script>

<!--
  Maintenance item (public surface).

  Mirrors the IncidentItem layout and visual language so the two item
  types read as siblings in the status feed — same dot+state kicker,
  same rounded-md monitor chips, same inline date line, same popover
  treatment. Console dashboard aesthetic throughout.
-->
<Item.Root class="items-start p-0 {className} sm:items-center">
  <Item.Content class="min-w-0 flex-1">
    <!-- Status indicator + title -->
    <div class="flex flex-col items-start justify-start gap-1">
      <span class="inline-flex items-center gap-1.5 text-[12px] font-medium text-{maintenance.status.toLowerCase()}">
        <span class="inline-flex size-1.5 shrink-0 rounded-full bg-{maintenance.status.toLowerCase()}"></span>
        {$t(maintenance.status)}
      </span>
      <Item.Title class="min-w-0 text-[15px] font-medium text-zinc-100 wrap-break-word break-all">
        <a {target} class="hover:underline" href={clientResolver(resolve, `/maintenances/${maintenance.id}`)}>
          {maintenance.title}
        </a>
      </Item.Title>
    </div>

    {#if maintenance.description}
      <p class="mt-1 text-[13px] leading-5 text-zinc-400">
        {maintenance.description}
      </p>
    {/if}

    <!-- Affected monitor chips -->
    {#if maintenance.monitors && maintenance.monitors.length > 0 && !hideMonitors}
      <div class="mt-2 flex flex-wrap gap-1.5">
        {#each maintenance.monitors as monitor}
          <Popover.Root>
            <Popover.Trigger disabled={isEmbedded}>
              <span
                class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-zinc-900"
              >
                <span class="inline-flex size-1.5 shrink-0 rounded-full bg-{monitor.monitor_impact.toLowerCase()}"></span>
                {monitor.monitor_name}
              </span>
            </Popover.Trigger>
            <Popover.Content class="w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-(--shadow-dropdown)">
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
                    <span class="text-{monitor.monitor_impact.toLowerCase()}">{$t(monitor.monitor_impact)}</span>
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

    <!-- Inline maintenance window timing -->
    <Item.Description
      class="mt-2 flex w-full flex-col gap-1 text-[12px] text-zinc-500 sm:flex-row sm:items-center sm:gap-2"
    >
      <span>
        <span class="text-zinc-400">{$t("Start Time")}</span>
        {$formatDate(maintenance.start_date_time, page.data.dateAndTimeFormat.datePlusTime)}
      </span>
      <span aria-hidden="true" class="hidden text-zinc-700 sm:inline">·</span>
      <span>
        <span class="text-zinc-400">{$t("Duration")}</span>
        {$formatDuration(maintenance.start_date_time, maintenance.end_date_time)}
      </span>
      <span aria-hidden="true" class="hidden text-zinc-700 sm:inline">·</span>
      <span>
        <span class="text-zinc-400">{$t("End Time")}</span>
        {$formatDate(maintenance.end_date_time, page.data.dateAndTimeFormat.datePlusTime)}
      </span>
    </Item.Description>
  </Item.Content>
</Item.Root>
