<script lang="ts">
  import { page } from "$app/state";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
  import * as Dropdown from "$lib/components/ui/dropdown-menu/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { navigationMenuTriggerStyle } from "$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import trackEvent from "$lib/beacon";
  import MenuIcon from "@lucide/svelte/icons/menu";

  let { data } = page;
  const navItems: { name: string; url: string; iconURL: string }[] = data.navItems || [];
  const { siteName, siteUrl, logo } = data;

  function trackBrandClick() {
    trackEvent("nav_brand_clicked", { name: siteName });
  }

  function trackNavClick(item: { name: string; url: string }) {
    trackEvent("nav_link_clicked", { name: item.name, external: item.url.startsWith("http") });
  }
</script>

<div class="fixed inset-x-0 top-0 z-10 py-2">
  <div class="mx-auto max-w-5xl px-4">
    <div
      class="bg-background/80 dark:bg-background/70 flex items-center justify-between rounded-3xl border p-1 backdrop-blur-md"
    >
      <!-- Brand -->
      <a
        href={clientResolver(resolve, siteUrl)}
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
                        alt={item.name}
                        class="mr-2 h-4 w-4 object-cover"
                      />
                    {/if}
                    {item.name}
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
                aria-label="Open navigation menu"
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
                    alt={item.name}
                    class="mr-2 h-4 w-4 object-cover"
                  />
                {/if}
                {item.name}
              </Button>
            {/each}
          </Dropdown.Content>
        </Dropdown.Root>
      {/if}
    </div>
  </div>
</div>
