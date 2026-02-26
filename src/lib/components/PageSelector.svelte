<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { onMount } from "svelte";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import type { PageNavItem } from "$lib/server/controllers/dashboardController.js";
  import { page } from "$app/state";

  let currentPath = $derived(page.params.page_path);

  let pages = $state<PageNavItem[]>([]);
  let pagesLoading = $state(false);
  const defaultHomePage = $derived(pages.find((p) => p.page_path == ""));
  const currentPage = $derived(pages.find((p) => p.page_path === currentPath) || defaultHomePage);

  async function fetchPages() {
    pagesLoading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/dashboard-apis/pages"));
      if (response.ok) {
        pages = await response.json();
      }
    } catch {
      // silently fail, pages dropdown will just not show
    } finally {
      pagesLoading = false;
    }
  }

  onMount(() => {
    fetchPages();
  });
</script>

<div class="flex shrink-0 items-center gap-2">
  {#if pagesLoading}
    <Button
      variant="outline"
      size="sm"
      class="bg-background/80 dark:bg-background/70 border-foreground/10 flex items-center justify-center rounded-full border text-xs shadow-none backdrop-blur-md"
      disabled
    >
      <Spinner class="h-4 w-4" />
    </Button>
  {:else if pages.length > 0}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="outline"
            size="sm"
            class="bg-background/80 dark:bg-background/70 border-foreground/10 flex items-center justify-center rounded-full border text-xs shadow-none backdrop-blur-md"
          >
            <span class="hidden max-w-[16rem] truncate sm:inline">{currentPage?.page_title || "Home"}</span>
            <span class="sr-only sm:hidden">{currentPage?.page_title || "Home"}</span>
            <ChevronDown class="h-4 w-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class="bg-background/30 supports-backdrop-filter:bg-background/20 flex flex-col gap-1 rounded-3xl border p-2 shadow-2xl backdrop-blur-2xl"
      >
        {#each pages as page (page.page_path)}
          <Button
            variant={page.page_path === currentPath ? "outline" : "ghost"}
            size="sm"
            href={clientResolver(resolve, `/${page.page_path}`)}
            class="w-full justify-start rounded-full text-xs shadow-none"
          >
            {page.page_title}
          </Button>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</div>
