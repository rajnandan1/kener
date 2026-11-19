<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT, active: adminActive } = getAdminI18n();
  import { page } from "$app/state";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
  import * as Dropdown from "$lib/components/ui/dropdown-menu/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { navigationMenuTriggerStyle } from "$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import trackEvent from "$lib/beacon";
  import MenuIcon from "@lucide/svelte/icons/menu";

  interface Props {
    fixed?: boolean;
    localizeDefaultLinks?: boolean;
  }

  let { fixed = true, localizeDefaultLinks = false }: Props = $props();

  let { data } = page;
  const navItems: { name: string; url: string; iconURL: string }[] = data.navItems || [];
  const { siteName, logo, globalPageVisibilitySettings } = data;

  const brandPath = $derived.by(() => {
    if (globalPageVisibilitySettings?.forceExclusivity) {
      const currentPagePath = page.params?.page_path?.trim();
      return currentPagePath ? `/${currentPagePath}` : "/";
    }
    return "/";
  });

  /** Only account screens opt in; custom navigation content stays unchanged. */
  function navigationLabel(item: { name: string; url: string }): string {
    if (!localizeDefaultLinks || !adminActive) return item.name;
    const isDefaultDocumentation =
      item.name === "Documentation" &&
      (item.url === "https://kener.ing/docs" || item.url === "https://kener.ing/docs/");
    const isDefaultLogin = item.name === "Login" && item.url === "/account/signin";
    return isDefaultDocumentation || isDefaultLogin ? $adminT(item.name) : item.name;
  }

  function trackBrandClick() {
    trackEvent("nav_brand_clicked", { name: siteName });
  }

  function trackNavClick(item: { name: string; url: string }) {
    trackEvent("nav_link_clicked", { name: item.name, external: item.url.startsWith("http") });
  }
</script>

<div data-slot="kener-nav" class={fixed ? "fixed inset-x-0 top-0 z-10 py-2" : "relative w-full py-2"}>
  <div class="mx-auto max-w-5xl px-4">
    <div
      class="bg-background/80 dark:bg-background/70 flex items-center justify-between rounded-3xl border p-1 backdrop-blur-md"
    >
      <!-- Brand -->
      <a
        href={clientResolver(resolve, brandPath)}
        class="{navigationMenuTriggerStyle()} hover:border-border border border-transparent bg-transparent text-xs hover:bg-transparent"
        style="border-radius: var(--radius-3xl)"
        onclick={trackBrandClick}
      >
        {#if logo}
          <img src={clientResolver(resolve, logo)} alt={siteName} class="mr-2 h-6 w-6 rounded-full object-cover" />
        {/if}
        {siteName}
      </a>

      <!-- Desktop Nav Links -->
      <NavigationMenu.Root class="hidden sm:block">
        <NavigationMenu.List>
          {#each navItems as item (item.url)}
            <NavigationMenu.Item>
              <NavigationMenu.Link>
                {#snippet child()}
                  <a
                    data-sveltekit-preload-data="off"
                    href={clientResolver(resolve, item.url)}
                    class="{navigationMenuTriggerStyle()} hover:border-border border border-transparent bg-transparent text-xs hover:bg-transparent"
                    target={item.url.startsWith("http") ? "_blank" : undefined}
                    rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    style="border-radius: var(--radius-3xl)"
                    onclick={() => trackNavClick(item)}
                  >
                    {#if item.iconURL}
                      <img
                        src={clientResolver(resolve, item.iconURL)}
                        alt={navigationLabel(item)}
                        class="mr-2 h-4 w-4 object-cover"
                      />
                    {/if}
                    {navigationLabel(item)}
                  </a>
                {/snippet}
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          {/each}
        </NavigationMenu.List>
      </NavigationMenu.Root>

      <!-- Mobile Nav -->
      {#if navItems.length > 0}
        <Dropdown.Root>
          <Dropdown.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                class="{navigationMenuTriggerStyle()} hover:border-border border border-transparent bg-transparent text-xs hover:bg-transparent sm:hidden"
                style="border-radius: var(--radius-3xl)"
                aria-label={$adminT("Open navigation menu")}
              >
                <MenuIcon class="h-4 w-4" />
              </button>
            {/snippet}
          </Dropdown.Trigger>
          <Dropdown.Content align="end" class="w-56 rounded-3xl p-2">
            {#each navItems as item (item.url)}
              <Button
                variant="ghost"
                size="sm"
                href={clientResolver(resolve, item.url)}
                class="w-full justify-start rounded-full text-xs"
                target={item.url.startsWith("http") ? "_blank" : undefined}
                rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}
                onclick={() => trackNavClick(item)}
              >
                {#if item.iconURL}
                  <img
                    src={clientResolver(resolve, item.iconURL)}
                    alt={navigationLabel(item)}
                    class="mr-2 h-4 w-4 object-cover"
                  />
                {/if}
                {navigationLabel(item)}
              </Button>
            {/each}
          </Dropdown.Content>
        </Dropdown.Root>
      {/if}
    </div>
  </div>
</div>
