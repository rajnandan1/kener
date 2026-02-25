<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import ICONS from "$lib/icons";
  import clientResolver from "$lib/client/resolver.js";
  import { formatDate } from "$lib/stores/datetime";
  import { t } from "$lib/stores/i18n";
  import type { NotificationEvent } from "$lib/server/controllers/dashboardController.js";
  import Calendar from "@lucide/svelte/icons/calendar-1";
  import { format } from "date-fns";
  import { onMount } from "svelte";

  interface Props {
    monitorTags?: string[];
    compact?: boolean;
    eventsPath: string;
  }

  let { monitorTags = [], compact = true, eventsPath = "" }: Props = $props();
  let open = $state(false);
  let notifications = $state<NotificationEvent[]>([]);
  let loading = $state(false);

  const defaultEventsPath = $derived(`/events/${format(new Date(), "MMMM-yyyy")}`);

  const resolvedEventsPath = $derived.by(() => {
    const finalEventsPath = eventsPath || defaultEventsPath;
    if (page.data?.globalPageVisibilitySettings?.forceExclusivity) {
      const currentPagePath = page.params?.page_path?.trim();
      return currentPagePath ? `/${currentPagePath}${finalEventsPath}` : finalEventsPath;
    }
    return finalEventsPath;
  });

  async function fetchNotifications() {
    loading = true;
    try {
      const query = monitorTags.length > 0 ? `?tags=${encodeURIComponent(monitorTags.join(","))}` : "";
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/notifications") + query);
      if (response.ok) {
        const payload = await response.json();
        notifications = payload.notifications || [];
      }
    } catch {
      // silently fail
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchNotifications();
  });
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        size={compact ? "icon-sm" : "sm"}
        class="bg-background/80 dark:bg-background/70 border-foreground/10 relative mr-2 rounded-full border text-xs shadow-none backdrop-blur-md"
        aria-label={$t("Notifications")}
      >
        {#if loading}
          <Spinner class="h-4 w-4" />
        {:else}
          <ICONS.Bell class="h-4 w-4" />
          {#if notifications.length > 0}
            <span
              class="bg-accent-foreground text-accent absolute -top-1 -right-1 min-w-4 rounded-full px-1 text-[10px] leading-4"
            >
              {notifications.length}
            </span>
          {/if}
        {/if}
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content
    align="end"
    class="bg-background/30 supports-backdrop-filter:bg-background/20 w-96 rounded-3xl border   p-0 shadow-2xl backdrop-blur-2xl"
    sideOffset={8}
  >
    <div class="flex items-center justify-between border-b px-4 py-3">
      <h4 class="text-sm font-semibold">{$t("Events")}</h4>
      <Button variant="outline" href={clientResolver(resolve, resolvedEventsPath)} size="icon-sm" class="rounded-btn">
        <Calendar class="size-4" />
      </Button>
    </div>

    {#if notifications.length === 0}
      <div class="text-muted-foreground px-4 py-6 text-sm">
        {$t("No events to show")}
      </div>
    {:else}
      <div class="scrollbar-hidden max-h-96 overflow-y-auto">
        {#each notifications as item, i (`${item.eventType}-${item.eventURL}-${item.eventDate}-${i}`)}
          <a
            href={clientResolver(resolve, item.eventURL)}
            class="hover:bg-muted/60 block border-b px-4 py-3 last:border-b-0"
          >
            <div class="my-0.5 flex items-center justify-between gap-2 text-xs">
              <span class="text-muted-foreground text-[11px] uppercase">{item.eventType}</span>
              <span class="text-{item.eventStatus.toLowerCase()}">{item.eventStatus}</span>
            </div>
            <div class="flex items-start justify-between gap-2">
              <p class="line-clamp-2 text-sm">{item.eventTitle}</p>
            </div>
            <div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span>{$formatDate(item.eventDate, "PPp")}</span>

              <span>•</span>
              <span>{item.eventDuration}</span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </Popover.Content>
</Popover.Root>
