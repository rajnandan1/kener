<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Command from "$lib/components/ui/command/index.js";
  import Search from "@lucide/svelte/icons/search";
  import FileText from "@lucide/svelte/icons/file-text";
  import Loader2 from "@lucide/svelte/icons/loader-2";

  import { onMount, onDestroy } from "svelte";
  import type { DocsSearchResult } from "$lib/types/docs-search";
  import clientResolver from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let query = $state("");
  let results = $state<DocsSearchResult[]>([]);
  let isLoading = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Keyboard shortcut handler
  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      open = !open;
    }
    if (e.key === "Escape" && open) {
      open = false;
    }
  }

  onMount(() => {
    document.addEventListener("keydown", handleKeydown);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  });

  onDestroy(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
  });

  // Debounced search
  async function performSearch(searchQuery: string) {
    if (searchQuery.trim().length < 2) {
      results = [];
      return;
    }

    isLoading = true;
    try {
      const url = `?q=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(clientResolver(resolve, "/docs/api/search") + url);
      const data = await response.json();
      results = data.results || [];
    } catch (error) {
      console.error("Search error:", error);
      results = [];
    } finally {
      isLoading = false;
    }
  }

  // Watch for query changes with debounce
  $effect(() => {
    const currentQuery = query; // Capture query to track it
    if (searchTimeout) clearTimeout(searchTimeout);
    if (currentQuery.trim().length >= 2) {
      searchTimeout = setTimeout(() => {
        performSearch(currentQuery);
      }, 200);
    } else {
      results = [];
    }
  });

  function handleSelect(slug: string, anchor?: string) {
    open = false;
    query = "";
    results = [];
    const url = anchor ? `/docs/${slug}#${anchor}` : `/docs/${slug}`;
    goto(clientResolver(resolve, url)).then(() => {
      // After navigation, scroll to anchor if present
      if (anchor) {
        // Small delay to ensure DOM is updated
        setTimeout(() => {
          const element = document.getElementById(anchor);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    });
  }

  function handleOpenChange(isOpen: boolean) {
    open = isOpen;
    if (!isOpen) {
      query = "";
      results = [];
    }
  }

  // Group results by their group field
  let groupedResults = $derived.by(() => {
    const groups: Record<string, DocsSearchResult[]> = {};
    for (const result of results) {
      if (!groups[result.group]) {
        groups[result.group] = [];
      }
      groups[result.group].push(result);
    }
    return groups;
  });
</script>

<Command.Dialog
  bind:open
  title="Search Documentation"
  description="Search through all documentation pages"
  onOpenChange={handleOpenChange}
  shouldFilter={false}
>
  <Command.Input
    placeholder="Search documentation..."
    bind:value={query}
    oninput={(e) => {
      query = e.currentTarget.value;
    }}
  />
  <Command.List>
    {#if isLoading}
      <Command.Loading>
        <div class="flex items-center justify-center py-6">
          <Loader2 class="text-muted-foreground h-4 w-4 animate-spin" />
          <span class="text-muted-foreground ml-2 text-sm">Searching...</span>
        </div>
      </Command.Loading>
    {:else if query.length >= 2 && results.length === 0}
      <Command.Empty>No results found for "{query}"</Command.Empty>
    {:else if results.length > 0}
      {#each Object.entries(groupedResults) as [group, groupResults] (group)}
        <Command.Group heading={group}>
          {#each groupResults as result (result.slug + (result.anchor || ""))}
            <Command.Item
              value={result.slug + (result.anchor || "")}
              onSelect={() => handleSelect(result.slug, result.anchor)}
              class="cursor-pointer"
            >
              <FileText class="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
              <div class="flex min-w-0 flex-col gap-0.5">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{result.title}</span>
                  {#if result.sectionTitle}
                    <span class="text-muted-foreground text-xs">› {result.sectionTitle}</span>
                  {/if}
                </div>
                <span class="text-muted-foreground line-clamp-1 text-xs">{result.excerpt}</span>
              </div>
            </Command.Item>
          {/each}
        </Command.Group>
      {/each}
    {:else}
      <Command.Empty>
        <div class="text-muted-foreground flex flex-col items-center py-6">
          <Search class="mb-2 h-8 w-8 opacity-50" />
          <span class="text-sm">Type to search documentation</span>
        </div>
      </Command.Empty>
    {/if}
  </Command.List>
  <div class="border-border border-t px-3 py-2">
    <div class="text-muted-foreground flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <kbd
          class="border-border bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none"
        >
          <span class="text-xs">↵</span>
        </kbd>
        <span>to select</span>
      </div>
      <div class="flex items-center gap-2">
        <kbd
          class="border-border bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none"
        >
          esc
        </kbd>
        <span>to close</span>
      </div>
    </div>
  </div>
</Command.Dialog>
