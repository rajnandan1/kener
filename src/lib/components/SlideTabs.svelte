<script lang="ts">
  /*
   * Sliding-indicator tabs.
   *
   * Matches the Console's `tabs.component.svelte` pixel-for-pixel: same
   * container (`rounded-lg bg-zinc-900/40 p-0.5`), same indicator
   * (`rounded-md bg-zinc-800/75` with a cubic-bezier slide), same
   * `h-7 rounded-md px-2.5 text-xs` tab buttons, same `size-4` icon,
   * same active / inactive text colours. The only deliberate difference
   * is that Kener's version is horizontal-only — we don't ship a
   * vertical variant on the public pages so the extra machinery is
   * stripped out to keep this file small.
   */
  import { onMount, tick } from "svelte";

  /*
   * Icon type is loose (`any`) by design — matches the Console's
   * `IconComponent` definition. Tabler icons (Svelte 4 class components)
   * and Svelte 5 function components have incompatible constructor
   * signatures, and no unified reference type exists across both. A
   * strict union would false-positive at every call site.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type IconComponent = any;

  type TabItem = {
    id: string;
    label: string;
    icon?: IconComponent;
  };

  interface Props {
    tabs: TabItem[];
    active?: string;
    onchange?: (id: string) => void;
    class?: string;
  }

  let { tabs, active = $bindable(""), onchange, class: className = "" }: Props = $props();

  let containerRef = $state<HTMLDivElement | null>(null);
  let enableTransitions = $state(false);
  let indicator = $state({ width: 0, height: 0, left: 0, top: 0, opacity: 0 });
  let resizeObserver: ResizeObserver | null = null;

  $effect(() => {
    if (!active && tabs.length > 0) {
      active = tabs[0]?.id ?? "";
    }
  });

  function handleTabChange(tabId: string) {
    if (tabId === active) return;
    active = tabId;
    onchange?.(tabId);
  }

  function updateIndicator() {
    const container = containerRef;
    if (!container) return;

    const activeIndex = tabs.findIndex((tab) => tab.id === active);
    const activeEl = container.querySelector<HTMLElement>(`[data-tab-index="${activeIndex}"]`);

    if (!activeEl) {
      indicator = { ...indicator, opacity: 0 };
      return;
    }

    indicator = {
      width: activeEl.offsetWidth,
      height: activeEl.offsetHeight,
      left: activeEl.offsetLeft,
      top: activeEl.offsetTop,
      opacity: 1
    };
  }

  function syncResizeObserver() {
    resizeObserver?.disconnect();

    if (!containerRef || typeof ResizeObserver === "undefined") {
      resizeObserver = null;
      return;
    }

    resizeObserver = new ResizeObserver(() => updateIndicator());
    resizeObserver.observe(containerRef);

    for (const btn of containerRef.querySelectorAll<HTMLElement>("[data-tab-index]")) {
      resizeObserver.observe(btn);
    }
  }

  $effect(() => {
    tabs;
    active;

    void tick().then(() => {
      updateIndicator();
      syncResizeObserver();
    });
  });

  onMount(() => {
    const handleResize = () => updateIndicator();
    window.addEventListener("resize", handleResize);

    void tick().then(() => {
      updateIndicator();
      syncResizeObserver();
    });

    // Two-frame delay before enabling transitions so the initial paint
    // of the indicator doesn't animate in from (0, 0).
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        enableTransitions = true;
      });
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver?.disconnect();
    };
  });
</script>

<div
  bind:this={containerRef}
  role="tablist"
  class="relative inline-grid max-w-full grid-flow-col auto-cols-max gap-0.5 overflow-auto rounded-lg bg-zinc-900/40 p-0.5 outline-none {className}"
>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute z-0 rounded-md bg-zinc-800/75 {enableTransitions
      ? 'transition-[transform,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
      : ''}"
    style="width: {indicator.width}px; height: {indicator.height}px; opacity: {indicator.opacity}; transform: translate3d({indicator.left}px, {indicator.top}px, 0);"
  ></div>

  {#each tabs as tab, index (tab.id)}
    {@const Icon = tab.icon}
    <button
      type="button"
      role="tab"
      data-tab-index={index}
      aria-selected={active === tab.id}
      onclick={() => handleTabChange(tab.id)}
      class="relative z-10 inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-xs leading-none font-medium whitespace-nowrap outline-none transition-colors duration-150 ease-out {active ===
      tab.id
        ? 'text-zinc-50'
        : 'text-zinc-400 hover:text-zinc-100'}"
    >
      {#if Icon}
        <Icon class="h-4 w-4 shrink-0" />
      {/if}
      <span class="whitespace-nowrap">{tab.label}</span>
    </button>
  {/each}
</div>
