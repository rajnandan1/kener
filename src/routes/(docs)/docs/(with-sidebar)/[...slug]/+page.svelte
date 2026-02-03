<script lang="ts">
  import type { DocsTableOfContentsItem, DocsPage } from "$lib/types/docs";
  import DocsTableOfContents from "../../DocsTableOfContents.svelte";
  import DocsPageNavigation from "../../DocsPageNavigation.svelte";

  interface Props {
    data: {
      title: string;
      description?: string;
      slug: string;
      htmlContent: string;
      tableOfContents: DocsTableOfContentsItem[];
      prevPage: DocsPage | null;
      nextPage: DocsPage | null;
      group: string;
    };
  }

  let { data }: Props = $props();
</script>

<svelte:head>
  <title>{data.title} - Documentation</title>
  <meta name="description" content={data.description || `Documentation for ${data.title}`} />
  <meta property="og:title" content="{data.title} - Documentation" />
  <meta property="og:description" content={data.description || `Documentation for ${data.title}`} />
  <meta property="og:type" content="article" />
</svelte:head>

<div class="mx-auto flex max-w-[1100px] gap-8">
  <article class="max-w-3xl min-w-0 flex-1">
    <div class="mb-8">
      <span class="text-accent-foreground mb-2 inline-block text-xs font-semibold tracking-wide uppercase"
        >{data.group}</span
      >
      <h1 class="text-foreground m-0 text-4xl leading-tight font-bold">{data.title}</h1>
      {#if data.description}
        <p class="text-muted-foreground mt-3 text-lg">{data.description}</p>
      {/if}
    </div>

    <div class="docs-content-body prose dark:prose-invert prose-slate max-w-none">
      {@html data.htmlContent}
    </div>

    <DocsPageNavigation prevPage={data.prevPage} nextPage={data.nextPage} />
  </article>

  <DocsTableOfContents items={data.tableOfContents} />
</div>
