<script lang="ts">
  import { onMount, tick } from "svelte";

  type TabItem = {
    id: string;
    label: string;
    icon?: any;
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
    <button
      type="button"
      role="tab"
      data-tab-index={index}
      aria-selected={active === tab.id}
      onclick={() => handleTabChange(tab.id)}
      class="relative z-10 inline-flex h-7 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs leading-none font-medium whitespace-nowrap outline-none transition-colors duration-150 ease-out {active ===
      tab.id
        ? 'text-zinc-50'
        : 'text-zinc-400 hover:text-zinc-100'}"
    >
      {#if tab.icon}
        <svelte:component this={tab.icon} class="h-3.5 w-3.5 shrink-0" />
      {/if}
      <span class="whitespace-nowrap">{tab.label}</span>
    </button>
  {/each}
</div>
