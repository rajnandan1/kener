<script lang="ts">
  import type { DocsConfig, DocsSidebarGroup, DocsPage } from "$lib/types/docs";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";

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
      if (
        group.collapsible &&
        group.pages.some((p) => p.slug === currentSlug || p.pages?.some((sp) => sp.slug === currentSlug))
      ) {
        return group.group;
      }
    }
    return null;
  });

  // Find parent pages that should be expanded based on current slug
  let initialExpandedPages = $derived.by(() => {
    const expanded: string[] = [];
    for (const group of config.sidebar) {
      for (const page of group.pages) {
        // Expand if current page is the parent OR if current page is a nested page
        if (page.pages && page.pages.length > 0) {
          if (page.slug === currentSlug || page.pages.some((sp) => sp.slug === currentSlug)) {
            expanded.push(page.slug);
          }
        }
      }
    }
    return expanded;
  });

  let expandedGroups = $state<string[]>([]);
  let expandedPages = $state<string[]>([]);
  let prevSlug = $state("");

  // Auto-expand when navigating to a different page (not when manually toggling)
  $effect(() => {
    if (currentSlug !== prevSlug) {
      // Slug changed, do auto-expansion
      if (initialGroup && !expandedGroups.includes(initialGroup)) {
        expandedGroups = [...expandedGroups, initialGroup];
      }
      for (const slug of initialExpandedPages) {
        if (!expandedPages.includes(slug)) {
          expandedPages = [...expandedPages, slug];
        }
      }
      prevSlug = currentSlug;
    }
  });

  function toggleGroup(groupName: string) {
    if (expandedGroups.includes(groupName)) {
      expandedGroups = expandedGroups.filter((g) => g !== groupName);
    } else {
      expandedGroups = [...expandedGroups, groupName];
    }
  }

  function togglePage(pageSlug: string) {
    if (expandedPages.includes(pageSlug)) {
      expandedPages = expandedPages.filter((p) => p !== pageSlug);
    } else {
      expandedPages = [...expandedPages, pageSlug];
    }
  }

  function isExpanded(group: DocsSidebarGroup): boolean {
    // Non-collapsible groups are always expanded
    if (!group.collapsible) return true;
    return expandedGroups.includes(group.group);
  }

  function isPageExpanded(page: DocsPage): boolean {
    return expandedPages.includes(page.slug);
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

<nav class="p-6 pr-4 pl-10">
  <div class="scrollbar-hidden flex flex-col gap-6">
    {#each config.sidebar as group (group.group)}
      <div class="mb-2">
        {#if group.collapsible}
          <button
            class="text-foreground hover:text-accent-foreground flex w-full cursor-pointer items-center justify-start gap-2 rounded border-none bg-transparent px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-all duration-200"
            onclick={() => toggleGroup(group.group)}
            aria-expanded={isExpanded(group)}
          >
            <span>{group.group}</span>
            {#if isExpanded(group)}
              <ChevronDown class="h-3.5 w-3.5" />
            {:else}
              <ChevronRight class="h-3.5 w-3.5" />
            {/if}
          </button>
        {:else}
          <div
            class="text-foreground flex w-full items-center justify-between px-3 py-0 text-xs font-semibold tracking-wide uppercase"
          >
            <span>{group.group}</span>
          </div>
        {/if}
        {#if isExpanded(group)}
          <ul class="mt-1 list-none p-0">
            {#each group.pages as docPage (docPage.slug)}
              <li>
                {#if docPage.pages && docPage.pages.length > 0}
                  <!-- Parent page with nested pages -->
                  <button
                    class="text-muted-foreground hover:text-accent-foreground flex w-full cursor-pointer items-center justify-start gap-2 rounded border-none bg-transparent px-3 py-1 text-left text-sm transition-all duration-200"
                    class:active={isActiveSlug(docPage.slug)}
                    onclick={() => togglePage(docPage.slug)}
                    aria-expanded={isPageExpanded(docPage)}
                  >
                    <span class="truncate">{docPage.title}</span>
                    {#if isPageExpanded(docPage)}
                      <ChevronDown class="h-3.5 w-3.5 shrink-0" />
                    {:else}
                      <ChevronRight class="h-3.5 w-3.5 shrink-0" />
                    {/if}
                  </button>
                  {#if isPageExpanded(docPage)}
                    <ul class="  mt-1 ml-3 list-none p-0 pl-1">
                      <!-- Optional: Link to parent page itself -->

                      {#each docPage.pages as nestedPage (nestedPage.slug)}
                        <li>
                          <a
                            href={getHref(nestedPage.slug)}
                            class="text-muted-foreground hover:text-accent-foreground block truncate rounded px-3 py-1 text-sm no-underline transition-all duration-200"
                            class:active={isActiveSlug(nestedPage.slug)}
                            onclick={handleLinkClick}
                          >
                            {nestedPage.title}
                          </a>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                {:else}
                  <!-- Regular page without nested pages -->
                  <a
                    href={getHref(docPage.slug)}
                    class="text-muted-foreground hover:text-accent-foreground block truncate rounded px-3 py-1 text-sm no-underline transition-all duration-200"
                    class:active={isActiveSlug(docPage.slug)}
                    onclick={handleLinkClick}
                  >
                    {docPage.title}
                  </a>
                {/if}
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
