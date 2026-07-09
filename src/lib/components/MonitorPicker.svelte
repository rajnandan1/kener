<script lang="ts">
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import ListPlusIcon from "@lucide/svelte/icons/list-plus";
  import clientResolver from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";

  let {
    monitors = [],
    selectedTags = [],
    onToggle,
    onAddMany,
    placeholder = "Search monitors to add..."
  }: {
    monitors: MonitorRecord[];
    selectedTags: string[];
    onToggle: (tag: string) => void;
    onAddMany?: (tags: string[]) => void;
    placeholder?: string;
  } = $props();

  let open = $state(false);
  let search = $state("");

  // Own filtering (shouldFilter={false}) so "Add all matching" counts stay
  // consistent with what the list shows. Case-insensitive over name + tag.
  const filteredMonitors = $derived.by(() => {
    const query = search.trim().toLowerCase();
    if (!query) return monitors;
    return monitors.filter((m) => m.name.toLowerCase().includes(query) || m.tag.toLowerCase().includes(query));
  });

  const unselectedMatches = $derived(filteredMonitors.filter((m) => !selectedTags.includes(m.tag)));
  const showAddAll = $derived(!!search.trim() && unselectedMatches.length > 0 && !!onAddMany);

  function addAllMatching() {
    onAddMany?.(unselectedMatches.map((m) => m.tag));
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class="w-full justify-between font-normal"
      >
        <span class="text-muted-foreground">{placeholder}</span>
        <ChevronsUpDownIcon class="text-muted-foreground size-4 shrink-0" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-[var(--bits-popover-trigger-width)] p-0" align="start">
    <Command.Root shouldFilter={false}>
      <Command.Input {placeholder} bind:value={search} />
      <Command.List class="max-h-64">
        <Command.Empty>No monitors found.</Command.Empty>
        <Command.Group>
          {#each filteredMonitors as monitor (monitor.tag)}
            {@const selected = selectedTags.includes(monitor.tag)}
            <Command.Item value={monitor.tag} onSelect={() => onToggle(monitor.tag)}>
              <CheckIcon class="size-4 {selected ? 'opacity-100' : 'opacity-0'}" />
              {#if monitor.image}
                <img
                  src={clientResolver(resolve, monitor.image)}
                  alt={monitor.name}
                  class="size-5 rounded object-cover"
                />
              {:else}
                <div class="bg-muted flex size-5 items-center justify-center rounded text-[10px] font-medium">
                  {monitor.name.charAt(0).toUpperCase()}
                </div>
              {/if}
              <span class="truncate">{monitor.name}</span>
              <span class="text-muted-foreground ml-auto truncate text-xs">{monitor.tag}</span>
            </Command.Item>
          {/each}
        </Command.Group>
        {#if showAddAll}
          <Command.Separator />
          <Command.Group>
            <Command.Item value="__add-all-matching__" onSelect={addAllMatching}>
              <ListPlusIcon class="size-4" />
              Add all {unselectedMatches.length} matching
            </Command.Item>
          </Command.Group>
        {/if}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
