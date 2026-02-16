<script lang="ts">
  import type { DocsConfig } from "$lib/types/docs";

  import { goto } from "$app/navigation";
  import Sun from "@lucide/svelte/icons/sun";
  import Moon from "@lucide/svelte/icons/moon";
  import Menu from "@lucide/svelte/icons/menu";
  import X from "@lucide/svelte/icons/x";
  import Search from "@lucide/svelte/icons/search";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";

  import { toggleMode, mode } from "mode-watcher";
  import DocsSearch from "./DocsSearch.svelte";
  import { Button } from "$lib/components/ui/button";

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

  function getVersionHref(versionSlug: string): string {
    const version = config.versions?.find((item) => item.slug === versionSlug);
    const firstPageSlug = version?.firstPageSlug;

    if (!firstPageSlug) {
      return `/docs/${versionSlug}`;
    }

    const normalizedFirstPageSlug = firstPageSlug.startsWith(`${versionSlug}/`)
      ? firstPageSlug.slice(versionSlug.length + 1)
      : firstPageSlug;

    return `/docs/${versionSlug}/${normalizedFirstPageSlug}`;
  }

  function getActiveVersionLabel(): string {
    if (!config.versions || config.versions.length === 0) {
      return "Docs";
    }

    const activeVersion = config.versions.find((version) => version.slug === config.activeVersion);
    return activeVersion?.name ?? config.versions[0].name;
  }

  function isActiveVersion(versionSlug: string): boolean {
    return config.activeVersion === versionSlug;
  }

  async function selectVersion(versionSlug: string) {
    await goto(getVersionHref(versionSlug));
  }

  function openSearch() {
    searchOpen = true;
  }
</script>

<!-- Main Navbar -->
<header class="bg-background border-border/50 fixed top-0 right-0 left-0 z-50">
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
      <a href="/docs" class="text-foreground flex items-center gap-2 no-underline">
        <img src={config.logo?.light} alt="" srcset="" class="h-8 dark:hidden" />
        <img src={config.logo?.dark} alt="" srcset="" class="hidden h-8 dark:block" />
        <span class="text-base font-medium">{config.name}</span>
      </a>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="link" class="text-muted-foreground h-8 px-0 text-xs "
              >{getActiveVersionLabel()}</Button
            >
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-56" align="start">
          <DropdownMenu.Label>Select Version</DropdownMenu.Label>
          <DropdownMenu.Group>
            {#if config.versions && config.versions.length > 0}
              {#each config.versions as version (version.slug)}
                <DropdownMenu.Item
                  onclick={() => selectVersion(version.slug)}
                  class={isActiveVersion(version.slug) ? "active" : ""}
                >
                  {version.name}
                </DropdownMenu.Item>
              {/each}
            {:else}
              <DropdownMenu.Item>Default</DropdownMenu.Item>
            {/if}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
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
    <div class="border-border/50 px-0">
      <nav class="mx-auto flex h-10 items-center gap-1 px-4">
        {#each config.navigation.tabs as tab (tab.url)}
          <Button href={tab.url} variant={!isActiveTab(tab.url) ? "ghost" : "outline"} size="sm" class="">
            {tab.name}
          </Button>
        {/each}
      </nav>
    </div>
  {/if}
</header>

<!-- Search Dialog -->
<DocsSearch bind:open={searchOpen} />
