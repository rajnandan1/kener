<script lang="ts">
  import { browser } from "$app/environment";
  import { Button } from "$lib/components/ui/button/index.js";
  import { onMount } from "svelte";
  import type { SiteAnnouncement } from "$lib/types/site.js";
  import { X } from "@lucide/svelte";

  interface Props {
    announcement: SiteAnnouncement;
  }

  let { announcement }: Props = $props();

  let visible = $state(false);

  const storageKey = $derived(
    `announcement:dismissed:${announcement.title}:${announcement.message}:${announcement.type}`
  );

  const typeClasses = $derived.by(() => {
    switch (announcement.type) {
      case "WARNING":
        return "text-degraded";
      case "ERROR":
        return "text-down";
      case "INFO":
      default:
        return "text-foreground";
    }
  });

  function applyVisibilityFromStorage() {
    if (!browser) return;
    if (!announcement.cancellable) {
      visible = true;
      return;
    }

    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      visible = true;
      return;
    }

    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) {
      visible = true;
      return;
    }

    if (announcement.reshowAfterInHours == null) {
      visible = false;
      return;
    }

    const elapsedMs = Date.now() - dismissedAt;
    const shouldReshow = elapsedMs >= announcement.reshowAfterInHours * 60 * 60 * 1000;
    visible = shouldReshow;

    if (shouldReshow) {
      localStorage.removeItem(storageKey);
    }
  }

  function dismiss() {
    if (!browser || !announcement.cancellable) return;
    localStorage.setItem(storageKey, String(Date.now()));
    visible = false;
  }

  onMount(() => {
    applyVisibilityFromStorage();
  });
</script>

{#if visible}
  <div class="bg-secondary relative flex w-full flex-col gap-0 rounded-3xl border p-4">
    <div class="relative flex items-center justify-between gap-2">
      <span class="text-foreground text-sm {typeClasses} font-medium">{announcement.title}</span>
      {#if announcement.cta}
        <div>
          <Button
            variant="link"
            class="px-0 text-xs underline"
            size="sm"
            href={announcement.cta}
            target={announcement.cta.startsWith("http") ? "_blank" : undefined}
          >
            Learn more
          </Button>
        </div>
      {/if}
    </div>

    <p class="text-muted-foreground text-xs">{announcement.message}</p>
    {#if announcement.cancellable}
      <Button
        variant="outline"
        class="rounded-btn bg-secondary! absolute -top-2.5 -right-2.5 "
        size="icon-sm"
        onclick={dismiss}
      >
        <X class="size-3" />
      </Button>
    {/if}
  </div>
{/if}
