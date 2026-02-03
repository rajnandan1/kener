<script lang="ts">
  import type { DocsConfig, DocsSidebarGroup } from "$lib/types/docs";
  import { ChevronDown, ChevronRight } from "lucide-svelte";
  import { base } from "$app/paths";

  interface Props {
    config: DocsConfig;
    currentSlug: string;
    onNavigate?: () => void;
  }

  let { config, currentSlug, onNavigate }: Props = $props();

  // Find the group containing the current page (for collapsible groups)
  let initialGroup = $derived.by(() => {
    for (const group of config.sidebar) {
      if (group.collapsible && group.pages.some((p) => p.slug === currentSlug)) {
        return group.group;
      }
    }
    return null;
  });

  let expandedGroups = $state<string[]>([]);

  // Auto-expand the collapsible group containing the current page
  $effect(() => {
    if (initialGroup && !expandedGroups.includes(initialGroup)) {
      expandedGroups = [...expandedGroups, initialGroup];
    }
  });

  function toggleGroup(groupName: string) {
    if (expandedGroups.includes(groupName)) {
      expandedGroups = expandedGroups.filter((g) => g !== groupName);
    } else {
      expandedGroups = [...expandedGroups, groupName];
    }
  }

  function isExpanded(group: DocsSidebarGroup): boolean {
    // Non-collapsible groups are always expanded
    if (!group.collapsible) return true;
    return expandedGroups.includes(group.group);
  }

  function isActiveSlug(slug: string): boolean {
    return currentSlug === slug;
  }

  function handleLinkClick() {
    onNavigate?.();
  }

  function getHref(slug: string): string {
    return `${base}/docs/${slug}`;
  }
</script>

<nav class="p-6 px-4">
  <div class="flex flex-col gap-2">
    {#each config.sidebar as group (group.group)}
      <div class="mb-2">
        {#if group.collapsible}
          <button
            class="text-muted-foreground hover:text-accent-foreground flex w-full cursor-pointer items-center justify-between rounded border-none bg-transparent px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-all duration-200"
            onclick={() => toggleGroup(group.group)}
            aria-expanded={isExpanded(group)}
          >
            <span>{group.group}</span>
            {#if isExpanded(group)}
              <ChevronDown class="h-4 w-4" />
            {:else}
              <ChevronRight class="h-4 w-4" />
            {/if}
          </button>
        {:else}
          <div
            class="text-foreground flex w-full items-center justify-between px-3 py-2 text-xs font-semibold tracking-wide uppercase"
          >
            <span>{group.group}</span>
          </div>
        {/if}
        {#if isExpanded(group)}
          <ul class="mt-1 list-none p-0">
            {#each group.pages as docPage (docPage.slug)}
              <li>
                <a
                  href={getHref(docPage.slug)}
                  class="text-muted-foreground hover:text-accent-foreground block rounded px-3 py-2 pl-6 text-sm no-underline transition-all duration-200"
                  class:active={isActiveSlug(docPage.slug)}
                  onclick={handleLinkClick}
                >
                  {docPage.title}
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/each}
  </div>
</nav>

<style>
  .active {
    color: var(--accent-foreground);
    font-weight: 500;
  }
</style>
