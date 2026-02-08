<script lang="ts">
  import { page } from "$app/state";
  import * as NavigationMenu from "$lib/components/ui/navigation-menu/index.js";
  import { navigationMenuTriggerStyle } from "$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  let { data } = page;
  const navItems: { name: string; url: string; iconURL: string }[] = data.navItems || [];
  const { siteName, siteUrl, logo } = data;
</script>

<div class="fixed inset-x-0 top-0 z-10 py-2">
  <div class="mx-auto max-w-5xl">
    <div class="bg-background flex items-center justify-between rounded-3xl border p-1">
      <!-- Brand -->
      <a
        href={clientResolver(resolve, siteUrl)}
        class="{navigationMenuTriggerStyle()} hover:border-border border border-transparent text-xs hover:bg-transparent"
        style="border-radius: var(--radius-3xl)"
      >
        {#if logo}
          <img src={clientResolver(resolve, logo)} alt={siteName} class="mr-2 h-6 w-6 rounded-full object-cover" />
        {/if}
        {siteName}
      </a>

      <!-- Nav Links -->
      <NavigationMenu.Root>
        <NavigationMenu.List>
          {#each navItems as item}
            <NavigationMenu.Item>
              <NavigationMenu.Link>
                {#snippet child()}
                  <a
                    data-sveltekit-preload-data="off"
                    href={clientResolver(resolve, item.url)}
                    class="{navigationMenuTriggerStyle()} hover:border-border border border-transparent text-xs hover:bg-transparent"
                    target={item.url.startsWith("http") ? "_blank" : undefined}
                    rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}
                    style="border-radius: var(--radius-3xl)"
                  >
                    {#if item.iconURL}
                      <img src={clientResolver(resolve, item.iconURL)} alt={item.name} class="mr-2 h-4 w-4" />
                    {/if}
                    {item.name}
                  </a>
                {/snippet}
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          {/each}
        </NavigationMenu.List>
      </NavigationMenu.Root>
    </div>
  </div>
</div>
