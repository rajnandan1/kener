<script lang="ts">
  import { browser } from "$app/environment";
  import { Button } from "$lib/components/ui/button/index.js";
  import { onMount } from "svelte";
  import type { SiteAnnouncement } from "$lib/types/site.js";
  import X from "@lucide/svelte/icons/x";

  interface Props {
    announcement: SiteAnnouncement;
  }

  let { announcement }: Props = $props();

  let visible = $state(false);

  const storageKey = $derived(
    `announcement:dismissed:${announcement.title}:${announcement.message}:${announcement.type}`
  );

  const toneClasses = $derived.by(() => {
    switch (announcement.type) {
      case "WARNING":
        return {
          border: "border-amber-700/50",
          title: "text-amber-300"
        };
      case "ERROR":
        return {
          border: "border-rose-700/50",
          title: "text-rose-300"
        };
      case "INFO":
      default:
        return {
          border: "border-zinc-800",
          title: "text-zinc-100"
        };
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
  <div class={`public-panel-muted relative flex w-full flex-col gap-2 px-4 pt-4 pb-4 ${toneClasses.border}`}>
    <div class="relative flex items-center justify-between gap-2 pr-2">
      <span class={`text-base font-medium ${toneClasses.title}`}>{announcement.title}</span>
      {#if announcement.ctaURL && announcement.ctaText}
        <div>
          <Button
            variant="link"
            class="h-8 px-0 text-xs text-zinc-300 underline underline-offset-4"
            size="sm"
            href={announcement.ctaURL}
            target={announcement.ctaURL.startsWith("http") ? "_blank" : undefined}
          >
            {announcement.ctaText}
          </Button>
        </div>
      {/if}
    </div>

    <p class="text-sm text-zinc-400">{announcement.message}</p>
    {#if announcement.cancellable}
      <Button
        variant="outline"
        class={`rounded-btn absolute -top-2.5 -right-2.5 border-zinc-800 bg-zinc-950 text-zinc-400 ${toneClasses.border}`}
        size="icon-sm"
        onclick={dismiss}
      >
        <X class="size-3" />
      </Button>
    {/if}
  </div>
{/if}
