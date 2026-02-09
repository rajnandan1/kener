<script lang="ts">
  import type { DocsTableOfContentsItem } from "$lib/types/docs";

  interface Props {
    items: DocsTableOfContentsItem[];
  }

  let { items }: Props = $props();

  let activeId = $state<string>("");

  $effect(() => {
    // Re-run whenever items changes (e.g. on soft navigation)
    const currentItems = items;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeId = entry.target.id;
          }
        }
      },
      {
        rootMargin: "-80px 0px -80% 0px",
        threshold: 0
      }
    );

    // Wait a tick for the DOM to update with new content
    const timeout = setTimeout(() => {
      for (const item of currentItems) {
        const element = document.getElementById(item.id);
        if (element) {
          observer.observe(element);
        }
      }
    }, 50);

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  });

  function scrollToHeading(id: string) {
    const element = document.getElementById(id);
    if (element) {
      const offset = 120; // Account for navbar height (96px) + some padding
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      activeId = id;
    }
  }
</script>

{#if items.length > 0}
  <aside
    class="sticky top-[calc(96px+2rem)] hidden max-h-[calc(100vh-96px-4rem)] w-[220px] shrink-0 overflow-y-auto xl:block"
  >
    <div class="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">On this page</div>
    <nav>
      <ul class="m-0 list-none p-0">
        {#each items as item, index (`${item.id}-${index}`)}
          <li class="mb-1" class:pl-3={item.level === 3} class:pl-6={item.level === 4}>
            <button
              class="text-muted-foreground hover:text-foreground block cursor-pointer border-none bg-transparent py-1 text-left text-[0.8125rem] no-underline transition-colors duration-200"
              class:active={activeId === item.id}
              onclick={() => scrollToHeading(item.id)}
            >
              {item.text}
            </button>
          </li>
        {/each}
      </ul>
    </nav>
  </aside>
{/if}

<style>
  .active {
    color: var(--accent-foreground);
    font-weight: 500;
  }
</style>
