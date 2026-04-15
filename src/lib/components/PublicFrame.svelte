<script lang="ts">
  import bannerDark  from "$lib/assets/banner.png";
  import bannerLight from "$lib/assets/banner-light.png";
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import { setMode } from "mode-watcher";
  import { onMount, tick } from "svelte";
  import clientResolver from "$lib/client/resolver.js";
  import type { Snippet } from "svelte";
  import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-svelte";

  interface Props {
    children?: Snippet;
    footerHTML?: string;
  }

  let { children, footerHTML = "" }: Props = $props();

  const year = new Date().getFullYear();

  type ThemePref = "light" | "dark" | "system";

  let preference = $state<ThemePref>(() => {
    if (typeof localStorage === "undefined") return "system";
    const s = localStorage.getItem("mode-watcher-mode");
    return (s === "light" || s === "dark" || s === "system" ? s : "system") as ThemePref;
  });

  function handleTheme(p: ThemePref) {
    preference = p;
    setMode(p);
  }

  const themeTabs: { id: ThemePref; Icon: typeof IconSun }[] = [
    { id: "light",  Icon: IconSun           },
    { id: "dark",   Icon: IconMoon          },
    { id: "system", Icon: IconDeviceDesktop },
  ];

  // ── Sliding indicator (same logic as Console Tabs component) ──────────────
  let containerRef = $state<HTMLDivElement | null>(null);
  let enableTransitions = $state(false);
  let indicator = $state({ height: 0, left: 0, opacity: 0, top: 0, width: 0 });

  function updateIndicator() {
    const container = containerRef;
    if (!container) return;
    const activeIndex = themeTabs.findIndex((t) => t.id === preference);
    const activeEl = container.querySelector<HTMLElement>(`[data-tab-index="${activeIndex}"]`);
    if (!activeEl) { indicator = { ...indicator, opacity: 0 }; return; }
    indicator = {
      height: activeEl.offsetHeight,
      left:   activeEl.offsetLeft,
      opacity: 1,
      top:    activeEl.offsetTop,
      width:  activeEl.offsetWidth,
    };
  }

  $effect(() => {
    preference; // reactive — re-measure when active tab changes
    void tick().then(() => updateIndicator());
  });

  onMount(() => {
    updateIndicator();
    // Wait two frames so the indicator snaps to its initial position
    // before enabling transitions (avoids the "slide from origin" flash).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { enableTransitions = true; });
    });
  });
</script>

<div class="kracking-public-shell min-h-screen dark:bg-zinc-950 bg-white dark:text-zinc-50 text-zinc-900">
  <div class="mx-auto flex min-h-screen w-full max-w-[1126px] flex-col">
    <section class="flex flex-1 flex-col px-6 py-6 md:px-10 md:py-8">

      <!-- Nav header -->
      <div class="mx-auto flex w-full max-w-5xl items-center justify-between">
        <a href={clientResolver(resolve, "/")} class="flex items-center gap-3">
          <!-- Dark banner — hidden in light mode -->
          <img src={bannerDark}  alt="Kracking" class="h-9 w-auto object-contain md:h-10 hidden dark:block" fetchpriority="high" decoding="async" />
          <!-- Light banner — hidden in dark mode -->
          <img src={bannerLight} alt="Kracking" class="h-9 w-auto object-contain md:h-10 block  dark:hidden" fetchpriority="high" decoding="async" />
        </a>

        <!-- Theme switcher: icon-only sliding tabs matching Console -->
        <div
          bind:this={containerRef}
          role="group"
          aria-label="Theme"
          class="relative inline-grid grid-flow-col auto-cols-max gap-0.5 overflow-hidden rounded-lg dark:bg-zinc-900/40 bg-zinc-100 p-0.5 outline-none"
        >
          <!-- Sliding indicator -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute z-0 rounded-md dark:bg-zinc-800/75 bg-white shadow-sm {enableTransitions ? 'transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]' : ''}"
            style="width:{indicator.width}px;height:{indicator.height}px;opacity:{indicator.opacity};transform:translate3d({indicator.left}px,{indicator.top}px,0)"
          ></div>

          {#each themeTabs as tab, index}
            <button
              type="button"
              data-tab-index={index}
              aria-label={tab.id}
              aria-pressed={preference === tab.id}
              onclick={() => handleTheme(tab.id)}
              class="relative z-10 flex h-7 w-8 items-center justify-center rounded-md outline-none transition-colors duration-150 ease-out
                {preference === tab.id
                  ? 'dark:text-zinc-50 text-zinc-900'
                  : 'dark:text-zinc-400 dark:hover:text-zinc-100 text-zinc-500 hover:text-zinc-900'}"
            >
              <tab.Icon class="h-3.5 w-3.5 shrink-0" />
            </button>
          {/each}
        </div>
      </div>

      <div class="mt-8 flex flex-1 flex-col px-0 py-6 md:py-8">
        <div class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
          {@render children?.()}
        </div>
      </div>
    </section>

    <footer class="dark:border-zinc-900 border-zinc-200 border-t px-6 py-8 md:px-10">
      {#if page.data.loggedInUser}
        <div class="mb-4 flex justify-center">
          <a
            href={clientResolver(resolve, "/manage/app/site-configurations")}
            class="text-sm font-medium dark:text-zinc-300 text-zinc-600 underline underline-offset-4 transition-colors hover:text-blue-500"
          >
            Manage Site
          </a>
        </div>
      {/if}
      {#if footerHTML}
        <div class="flex justify-center text-center text-sm dark:text-zinc-500 text-zinc-400 [&>*]:mx-auto [&_a]:dark:text-zinc-300 [&_a]:text-zinc-600 [&_a]:underline [&_a]:underline-offset-4">
          {@html footerHTML}
        </div>
      {:else}
        <div class="flex justify-center text-center text-sm dark:text-zinc-500 text-zinc-400">
          <p>&copy; {year} Kracking Technologies LLC. All rights reserved.</p>
        </div>
      {/if}
    </footer>
  </div>
</div>
