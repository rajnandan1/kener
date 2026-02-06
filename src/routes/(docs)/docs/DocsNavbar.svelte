<script lang="ts">
  import type { DocsConfig } from "$lib/types/docs";
  import { base } from "$app/paths";
  import { Sun, Moon, Menu, X, Search } from "lucide-svelte";
  import { toggleMode, mode } from "mode-watcher";
  import DocsSearch from "./DocsSearch.svelte";

  interface Props {
    config: DocsConfig;
    currentSlug: string;
    onMenuToggle?: () => void;
    isMobileMenuOpen?: boolean;
  }

  let { config, currentSlug, onMenuToggle, isMobileMenuOpen = false }: Props = $props();
  let searchOpen = $state(false);

  function isActiveTab(url: string): boolean {
    if (url === "/docs") {
      return currentSlug === "" || !currentSlug.startsWith("api-reference");
    }
    return currentSlug.startsWith(url.replace("/docs/", ""));
  }

  function getHref(path: string): string {
    return `${base}${path}`;
  }

  function openSearch() {
    searchOpen = true;
  }
</script>

<!-- Main Navbar -->
<header class="bg-background border-border/50 fixed top-0 right-0 left-0 z-50 border-b">
  <!-- Primary Nav Row -->
  <div class="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
    <div class="flex items-center gap-4">
      <button
        class="text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded border-none bg-transparent lg:hidden"
        onclick={onMenuToggle}
        aria-label="Toggle menu"
      >
        {#if isMobileMenuOpen}
          <X class="h-5 w-5" />
        {:else}
          <Menu class="h-5 w-5" />
        {/if}
      </button>
      <a href={getHref("/docs")} class="text-foreground flex items-center gap-2 no-underline">
        <img src="https://kener.ing/logo96.png" alt="" srcset="" class="h-8" />
        <span class="text-xl font-semibold">{config.name}</span>
      </a>
    </div>

    <!-- Search Bar in Center -->
    <button
      onclick={openSearch}
      class="border-border bg-muted/50 text-muted-foreground hover:bg-muted hidden h-9 w-full max-w-sm cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors md:flex"
    >
      <Search class="h-4 w-4" />
      <span class="flex-1 text-left">Search documentation...</span>
      <kbd
        class="border-border bg-background text-muted-foreground pointer-events-none hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium select-none sm:flex"
      >
        <span class="text-xs">⌘</span>K
      </kbd>
    </button>

    <div class="flex items-center gap-4">
      {#if config.footerLinks}
        <div class="hidden items-center gap-3 lg:flex">
          {#each config.footerLinks as link (link.url)}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground text-sm no-underline transition-colors duration-200"
            >
              {link.name}
            </a>
          {/each}
        </div>
      {/if}
      <!-- Mobile Search Button -->
      <button
        onclick={openSearch}
        class="text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded border-none bg-transparent transition-all duration-200 md:hidden"
        aria-label="Search"
      >
        <Search class="h-5 w-5" />
      </button>
      <button
        class="text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded border-none bg-transparent transition-all duration-200"
        onclick={toggleMode}
        aria-label="Toggle theme"
      >
        {#if mode.current === "dark"}
          <Sun class="h-5 w-5" />
        {:else}
          <Moon class="h-5 w-5" />
        {/if}
      </button>
    </div>
  </div>

  <!-- Sub Navbar with Tabs -->
  {#if config.navigation?.tabs}
    <div class="border-border/50 border-t px-10">
      <nav class="mx-auto flex h-10 items-center gap-1 px-6">
        {#each config.navigation.tabs as tab (tab.url)}
          <a
            href={getHref(tab.url)}
            class="text-muted-foreground hover:text-foreground hover:bg-accent rounded px-3 py-1.5 text-sm font-medium no-underline transition-all duration-200"
            class:active={isActiveTab(tab.url)}
          >
            {tab.name}
          </a>
        {/each}
      </nav>
    </div>
  {/if}
</header>

<!-- Search Dialog -->
<DocsSearch bind:open={searchOpen} />

<style>
  .active {
    color: var(--foreground);
    background-color: var(--accent);
  }
</style>
