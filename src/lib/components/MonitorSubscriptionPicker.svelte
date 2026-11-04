<script lang="ts">
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Search from "@lucide/svelte/icons/search";
  import { t } from "$lib/stores/i18n";

  interface SubscribableMonitor {
    tag: string;
    name: string;
  }

  interface Props {
    monitors: SubscribableMonitor[];
    selected: string[];
    // Monitor tag → true to subscribe, false to unsubscribe; one call per click, even for "select all".
    onChange: (changes: Record<string, boolean>) => void;
    disabled?: boolean;
  }

  let { monitors, selected, onChange, disabled = false }: Props = $props();

  let query = $state("");

  const selectedTags = $derived(new Set(selected));
  const visibleMonitors = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monitors;
    return monitors.filter((m) => m.name.toLowerCase().includes(q) || m.tag.toLowerCase().includes(q));
  });
  const allVisibleSelected = $derived(
    visibleMonitors.length > 0 && visibleMonitors.every((m) => selectedTags.has(m.tag))
  );

  function toggleAllVisible() {
    const value = !allVisibleSelected;
    const changes: Record<string, boolean> = {};
    for (const m of visibleMonitors) {
      if (selectedTags.has(m.tag) !== value) changes[m.tag] = value;
    }
    onChange(changes);
  }
</script>

<div class="flex flex-col gap-2">
  <div class="relative">
    <Search class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
    <Input
      type="search"
      placeholder={$t("Search monitors")}
      aria-label={$t("Search monitors")}
      class="pl-9"
      bind:value={query}
      disabled={monitors.length === 0}
    />
  </div>

  <div class="text-muted-foreground flex items-center justify-between gap-2 text-xs">
    <span>{$t("Selected")}: {selected.length} / {monitors.length}</span>
    {#if visibleMonitors.length > 0}
      <Button variant="link" size="sm" class="h-auto p-0 text-xs" onclick={toggleAllVisible} {disabled}>
        {allVisibleSelected ? $t("Clear all") : $t("Select all")}
      </Button>
    {/if}
  </div>

  <div class="max-h-60 overflow-y-auto overscroll-contain rounded-md border" role="group" aria-label={$t("Monitors")}>
    {#if monitors.length === 0}
      <p class="text-muted-foreground px-3 py-6 text-center text-sm">{$t("No monitors available")}</p>
    {:else if visibleMonitors.length === 0}
      <p class="text-muted-foreground px-3 py-6 text-center text-sm">{$t("No monitors match your search")}</p>
    {:else}
      <ul class="divide-y">
        {#each visibleMonitors as monitor (monitor.tag)}
          <li>
            <label
              class="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-3 py-2 text-sm has-disabled:cursor-not-allowed"
              title={monitor.tag}
            >
              <Checkbox
                checked={selectedTags.has(monitor.tag)}
                onCheckedChange={(value) => onChange({ [monitor.tag]: value === true })}
                {disabled}
              />
              <span class="min-w-0 truncate">{monitor.name}</span>
            </label>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
