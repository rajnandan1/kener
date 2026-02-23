<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { page } from "$app/state";
  import type { Component } from "svelte";
  let { items }: { items: { title: string; url: string; icon?: Component }[] } = $props();
</script>

<Sidebar.Group>
  <Sidebar.GroupContent class="flex flex-col gap-2">
    <Sidebar.Menu>
      {#each items as item (item.title)}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton tooltipContent={item.title} isActive={page.url.pathname.startsWith(item.url)}>
            {#snippet child({ props })}
              <a href={item.url} {...props}>
                <item.icon />
                <span>{item.title}</span>
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      {/each}
    </Sidebar.Menu>
  </Sidebar.GroupContent>
</Sidebar.Group>
