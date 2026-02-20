<script lang="ts">
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import STATUS_ICON from "$lib/icons";
  import { t } from "$lib/stores/i18n";
  import { formatDate, formatDuration } from "$lib/stores/datetime";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { GetInitials } from "$lib/clientTools.js";
  import type { MaintenanceEventsMonitorList } from "$lib/server/types/db";

  interface Props {
    maintenance: MaintenanceEventsMonitorList;
    class?: string;
    hideMonitors?: boolean;
  }

  let { maintenance, class: className = "", hideMonitors = false }: Props = $props();
  console.log(">>>>>>----  MaintenanceItem:23 ", maintenance);
  // Check if maintenance is ongoing (current time is between start and end)
  const isOngoing = $derived(() => {
    const now = Date.now() / 1000;
    return now >= maintenance.start_date_time && now <= maintenance.end_date_time;
  });
</script>

<Item.Root class="items-start p-0 {className} sm:items-center">
  <Item.Content class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <Item.Title class="min-w-0 text-base wrap-break-word break-all">
        <a class="hover:underline" href={clientResolver(resolve, `/maintenances/${maintenance.id}`)}
          >{maintenance.title}</a
        >
      </Item.Title>
      {#if isOngoing()}
        <Badge variant="outline" class="text-maintenance border-maintenance text-xs">{$t("In Progress")}</Badge>
      {/if}
    </div>

    {#if maintenance.description}
      <p class="text-muted-foreground mt-1 text-sm">
        {maintenance.description}
      </p>
    {/if}

    {#if maintenance.monitors && maintenance.monitors.length > 0 && !hideMonitors}
      <div class="flex gap-2">
        {#each maintenance.monitors as monitor}
          <Popover.Root>
            <Popover.Trigger>
              <Badge
                variant="outline"
                class="border-{monitor.monitor_impact.toLowerCase()}   cursor-pointer rounded-none border-0 border-b px-0  text-sm font-normal"
              >
                {monitor.monitor_name}
              </Badge>
            </Popover.Trigger>
            <Popover.Content class="w-64">
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
    {/if}

    <Item.Description
      class="mt-2 flex w-full flex-col gap-2 text-xs font-medium sm:flex-row sm:items-center sm:justify-between"
    >
      <span class="max-w-full rounded-full border px-3 py-2 wrap-break-word">
        {$formatDate(maintenance.start_date_time, "PPp")}
      </span>
      <span class="relative w-full text-center sm:flex-1">
        <span
          class="absolute top-0 bottom-0 left-1/2 border-l sm:top-1/2 sm:right-0 sm:bottom-auto sm:left-0 sm:border-t sm:border-l-0"
        ></span>
        <span class="bg-background relative z-10 px-0 py-1 sm:px-2">
          {$formatDuration(maintenance.start_date_time, maintenance.end_date_time)}
        </span>
      </span>
      <span class="max-w-full rounded-full border px-3 py-2 wrap-break-word">
        {$formatDate(maintenance.end_date_time, "PPp")}
      </span>
    </Item.Description>
  </Item.Content>
</Item.Root>
