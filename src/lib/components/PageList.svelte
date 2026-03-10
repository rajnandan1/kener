<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { onMount } from "svelte";
  import type { PageNavItem } from "$lib/server/controllers/dashboardController.js";
  import { page } from "$app/state";
  import * as Item from "$lib/components/ui/item/index.js";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";

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
        console.log(">>>>>>----  PageList:25 ", pages);
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
    <!-- loop through pages	 -->
    <div class="flex w-full flex-col gap-2">
      {#each pages as page}
        <Item.Root variant="outline" class="rounded-3xl">
          {#snippet child({ props })}
            <a href={clientResolver(resolve, `/${page.page_path}`)} {...props}>
              {#if page.page_logo}
                <Item.Media variant="image">
                  <img
                    src={page.page_logo}
                    alt={page.page_title}
                    width="32"
                    height="32"
                    class="size-8 rounded object-cover"
                  />
                </Item.Media>
              {/if}
              <Item.Content>
                <Item.Title class="line-clamp-1">
                  {page.page_title}
                </Item.Title>
                <Item.Description>{page.page_header}</Item.Description>
              </Item.Content>
              <Item.Actions>
                <ChevronRight class="size-4" />
              </Item.Actions>
            </a>
          {/snippet}
        </Item.Root>
      {/each}
    </div>
  {/if}
</div>
