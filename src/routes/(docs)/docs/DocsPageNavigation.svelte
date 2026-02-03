<script lang="ts">
  import type { DocsPage } from "$lib/types/docs";
  import { base } from "$app/paths";
  import { ChevronLeft, ChevronRight } from "lucide-svelte";

  interface Props {
    prevPage: DocsPage | null;
    nextPage: DocsPage | null;
  }

  let { prevPage, nextPage }: Props = $props();

  function getHref(slug: string): string {
    return `${base}/docs/${slug}`;
  }
</script>

<nav class="border-border mt-16 border-t pt-8">
  <div class="grid grid-cols-2 gap-4">
    {#if prevPage}
      <a
        href={getHref(prevPage.slug)}
        class="border-border text-foreground hover:bg-accent hover:border-accent-foreground flex items-center justify-start gap-3 rounded border p-4 no-underline transition-all duration-200"
      >
        <ChevronLeft class="h-4 w-4" />
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs tracking-wide uppercase">Previous</span>
          <span class="text-[0.9375rem] font-medium">{prevPage.title}</span>
        </div>
      </a>
    {:else}
      <div></div>
    {/if}

    {#if nextPage}
      <a
        href={getHref(nextPage.slug)}
        class="border-border text-foreground hover:bg-accent hover:border-accent-foreground flex items-center justify-end gap-3 rounded border p-4 text-right no-underline transition-all duration-200"
      >
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-xs tracking-wide uppercase">Next</span>
          <span class="text-[0.9375rem] font-medium">{nextPage.title}</span>
        </div>
        <ChevronRight class="h-4 w-4" />
      </a>
    {:else}
      <div></div>
    {/if}
  </div>
</nav>
