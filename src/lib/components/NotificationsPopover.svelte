<script lang="ts">
  import NotificationsList from "$lib/components/NotificationsList.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { requestNotifications } from "$lib/client/notifications-client.js";
  import ICONS from "$lib/icons";
  import { t } from "$lib/stores/i18n";
  import type { NotificationEvent } from "$lib/types/notifications.js";
  import { onMount } from "svelte";

  interface Props {
    monitorTags?: string[];
    compact?: boolean;
    eventsPath?: string;
  }

  let { monitorTags = [], compact = true, eventsPath = "" }: Props = $props();
  let open = $state(false);
  let notifications = $state<NotificationEvent[]>([]);
  let loading = $state(false);

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
    void fetchNotifications();
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
    <NotificationsList {monitorTags} {eventsPath} fetchOnMount={false} bind:notifications bind:loading />
  </Popover.Content>
</Popover.Root>
