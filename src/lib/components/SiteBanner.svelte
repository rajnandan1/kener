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
        return "degraded";
      case "ERROR":
        return "down";
      case "INFO":
      default:
        return "muted";
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
  <div class="bg-background relative flex w-full flex-col gap-0 rounded-3xl border border-{typeClasses} px-4 pt-2 pb-4">
    <div class="relative flex items-center justify-between gap-2 pr-2">
      <span class="text-foreground text-base text-{typeClasses} font-medium">{announcement.title}</span>
      {#if announcement.ctaURL && announcement.ctaText}
        <div>
          <Button
            variant="link"
            class="h-8 px-0 text-xs underline"
            size="sm"
            href={announcement.ctaURL}
            target={announcement.ctaURL.startsWith("http") ? "_blank" : undefined}
          >
            {announcement.ctaText}
          </Button>
        </div>
      {/if}
    </div>

    <p class="text-muted-foreground text-sm">{announcement.message}</p>
    {#if announcement.cancellable}
      <Button
        variant="outline"
        class="rounded-btn text-muted-foreground bg-background! border-{typeClasses} absolute -top-2.5 -right-2.5 "
        size="icon-sm"
        onclick={dismiss}
      >
        <X class="size-3" />
      </Button>
    {/if}
  </div>
{/if}
