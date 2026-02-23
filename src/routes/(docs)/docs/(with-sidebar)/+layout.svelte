<script lang="ts">
  import type { DocsLayoutData } from "$lib/types/docs";
  import DocsSidebar from "../DocsSidebar.svelte";
  import DocsNavbar from "../DocsNavbar.svelte";
  import type { Snippet } from "svelte";

  interface Props {
    data: DocsLayoutData;
    children: Snippet;
  }

  let { data, children }: Props = $props();

  let isMobileMenuOpen = $state(false);

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }
</script>

<svelte:head>
  <title>{data.config.name}</title>
  <meta name="description" content="Documentation for {data.config.name}" />
  <!-- favicon -->
  <link rel="icon" href={data.config.favicon} />
</svelte:head>

<div class="bg-background text-foreground min-h-screen">
  <DocsNavbar config={data.config} currentSlug={data.currentSlug} onMenuToggle={toggleMobileMenu} {isMobileMenuOpen} />

  <div class="mx-auto flex px-0 pt-24">
    <!-- Mobile sidebar overlay -->
    {#if isMobileMenuOpen}
      <div class="fixed inset-0 top-24 z-35 bg-black/50 lg:hidden" onclick={closeMobileMenu} role="presentation"></div>
    {/if}

    <!-- Sidebar -->
    <aside
      class="bg-background scrollbar-hidden fixed top-24 bottom-0 left-0 z-40 w-[240px] -translate-x-full overflow-y-auto transition-transform duration-300 ease-in-out lg:translate-x-0"
      class:translate-x-0={isMobileMenuOpen}
    >
      <DocsSidebar config={data.config} currentSlug={data.currentSlug} onNavigate={closeMobileMenu} />
    </aside>

    <!-- Main content -->
    <div class="min-w-0 flex-1 p-6 px-8 lg:ml-[240px] lg:p-8 lg:px-8">
      {@render children()}
    </div>
  </div>
</div>
