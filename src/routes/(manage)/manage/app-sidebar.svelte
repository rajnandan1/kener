<script lang="ts">
  import InnerShadowTopIcon from "@lucide/svelte/icons/user";
  import NavMain from "./nav-main.svelte";
  import NavUser from "./nav-user.svelte";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import type { Component, ComponentProps } from "svelte";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  type NavItem = { title: string; url: string; icon: Component };

  let { navItems, ...restProps }: { navItems: NavItem[] } & ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root collapsible="offcanvas" {...restProps}>
  <Sidebar.Header>
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton class="data-[slot=sidebar-menu-button]:p-1.5!">
          {#snippet child({ props })}
            <a href={clientResolver(resolve, "/manage/app")} {...props}>
              <img src={clientResolver(resolve, "/logo96.png")} class="size-5!" alt="Kener Logo" />
              <span class="text-base font-semibold"> Kener </span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  </Sidebar.Header>
  <Sidebar.Content>
    <NavMain items={navItems} />
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser />
  </Sidebar.Footer>
</Sidebar.Root>
