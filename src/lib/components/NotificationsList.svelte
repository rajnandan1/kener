<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { requestNotifications } from "$lib/client/notifications-client.js";
  import clientResolver from "$lib/client/resolver.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { formatDate, formatDuration } from "$lib/stores/datetime";
  import { t } from "$lib/stores/i18n";
  import type { NotificationEvent } from "$lib/types/notifications.js";
  import Calendar from "@lucide/svelte/icons/calendar-1";
  import { format } from "date-fns";
  import { onMount } from "svelte";

  interface Props {
    monitorTags?: string[];
    eventsPath?: string;
    notifications?: NotificationEvent[];
    loading?: boolean;
    fetchOnMount?: boolean;
  }

  let {
    monitorTags = [],
    eventsPath = "",
    notifications = $bindable<NotificationEvent[]>([]),
    loading = $bindable(false),
    fetchOnMount = true
  }: Props = $props();

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
      notifications = await requestNotifications(monitorTags);
    } catch {
      // silently fail
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (fetchOnMount) {
      void fetchNotifications();
    }
  });

  function getEventId(eventURL: string) {
    return eventURL.split("/").filter(Boolean).at(-1) || "";
  }
</script>

{#snippet notificationItem(item: NotificationEvent)}
  <div class="my-0.5 flex items-center justify-between gap-2 text-xs">
    <span class="text-muted-foreground text-[11px] uppercase">{$t(item.eventType)}</span>
    <span class="text-{item.eventStatus.toLowerCase()}">{$t(item.eventStatus)}</span>
  </div>
  <div class="flex items-start justify-between gap-2">
    <p class="line-clamp-2 text-sm">{item.eventTitle}</p>
  </div>
  <div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
    <span>{$formatDate(item.eventDate, page.data.dateAndTimeFormat.datePlusTime)}</span>

    <span>•</span>
    <span>{$formatDuration(item.eventStartDateTime, item.eventEndDateTime, $t("Ongoing"))}</span>
  </div>
{/snippet}

<div class="flex items-center justify-between border-b px-4 py-3">
  <h4 class="text-sm font-semibold">{$t("Events")}</h4>
  <Button
    variant="outline"
    href={clientResolver(resolve, resolvedEventsPath)}
    size="icon-sm"
    class="rounded-btn"
    aria-label={$t("Open events page")}
    title={$t("Open events page")}
  >
    <Calendar class="size-4" />
  </Button>
</div>

{#if notifications.length === 0}
  <div class="text-muted-foreground px-4 py-6 text-center text-sm">
    {$t("No events to show")}
  </div>
{:else}
  <div class="scrollbar-hidden max-h-96 overflow-y-auto">
    {#each notifications as item, i (`${item.eventType}-${item.eventURL}-${item.eventDate}-${i}`)}
      {@const eventId = getEventId(item.eventURL)}
      {#if item.eventURL.startsWith("/incidents/")}
        <a
          href={resolve("/(kener)/incidents/[incident_id]", { incident_id: eventId })}
          class="hover:bg-muted/60 block border-b px-4 py-3 last:border-b-0"
        >
          {@render notificationItem(item)}
        </a>
      {:else}
        <a
          href={resolve("/(kener)/maintenances/[maintenance_id]", { maintenance_id: eventId })}
          class="hover:bg-muted/60 block border-b px-4 py-3 last:border-b-0"
        >
          {@render notificationItem(item)}
        </a>
      {/if}
    {/each}
  </div>
{/if}
