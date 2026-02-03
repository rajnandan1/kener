<script lang="ts">
  import type { DocsTableOfContentsItem, DocsPage } from "$lib/types/docs";
  import DocsTableOfContents from "../../DocsTableOfContents.svelte";
  import DocsPageNavigation from "../../DocsPageNavigation.svelte";
  import { Copy, Check } from "@lucide/svelte";

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
  let contentEl: HTMLDivElement;

  // Add copy buttons to code blocks after content is rendered
  $effect(() => {
    if (!contentEl) return;

    const codeBlocks = contentEl.querySelectorAll("pre");
    codeBlocks.forEach((pre) => {
      // Skip if already has a copy button
      if (pre.querySelector(".copy-code-btn")) return;

      // Make pre relative for button positioning
      pre.style.position = "relative";

      // Create copy button
      const btn = document.createElement("button");
      btn.className = "copy-code-btn";
      btn.setAttribute("aria-label", "Copy code");
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

      btn.onclick = async () => {
        const code = pre.querySelector("code");
        if (code) {
          await navigator.clipboard.writeText(code.textContent || "");
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
          btn.classList.add("copied");
          setTimeout(() => {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
            btn.classList.remove("copied");
          }, 2000);
        }
      };

      pre.appendChild(btn);
    });

    // Add anchor links to headings
    const headings = contentEl.querySelectorAll("h2[id], h3[id], h4[id], h5[id], h6[id]");
    headings.forEach((heading) => {
      // Skip if already has an anchor link
      if (heading.querySelector(".heading-anchor")) return;

      // Make heading relative for anchor positioning
      (heading as HTMLElement).style.position = "relative";

      // Create anchor link button
      const anchor = document.createElement("a");
      anchor.className = "heading-anchor";
      anchor.href = `#${heading.id}`;
      anchor.setAttribute("aria-label", "Copy link to section");
      anchor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

      anchor.onclick = async (e) => {
        e.preventDefault();
        const url = `${window.location.origin}${window.location.pathname}#${heading.id}`;
        await navigator.clipboard.writeText(url);
        anchor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
        anchor.classList.add("copied");
        setTimeout(() => {
          anchor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
          anchor.classList.remove("copied");
        }, 2000);
      };

      heading.insertBefore(anchor, heading.firstChild);
    });
  });
</script>

<svelte:head>
  <title>{data.title} - Documentation</title>
  <meta name="description" content={data.description || `Documentation for ${data.title}`} />
  <meta property="og:title" content="{data.title} - Documentation" />
  <meta property="og:description" content={data.description || `Documentation for ${data.title}`} />
  <meta property="og:type" content="article" />
</svelte:head>

<div class="mx-auto flex max-w-[1100px] gap-8">
  <article class="max-w-4xl min-w-0 flex-1">
    <div class="mb-8">
      <span class="text-accent-foreground mb-2 inline-block text-xs font-semibold tracking-wide uppercase"
        >{data.group}</span
      >
      <h1 class="text-foreground m-0 text-3xl leading-tight font-bold">{data.title}</h1>
      {#if data.description}
        <p class="text-muted-foreground mt-1">{data.description}</p>
      {/if}
    </div>

    <div class="prose dark:prose-invert prose-neutral max-w-none" bind:this={contentEl}>
      {@html data.htmlContent}
    </div>

    <DocsPageNavigation prevPage={data.prevPage} nextPage={data.nextPage} />
  </article>

  <DocsTableOfContents items={data.tableOfContents} />
</div>

<style>
  :global(.copy-code-btn) {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.375rem;
    border-radius: 0.375rem;
    background-color: hsl(var(--muted));
    color: hsl(var(--muted-foreground));
    border: 1px solid hsl(var(--border));
    cursor: pointer;
    opacity: 0;
    transition:
      opacity 0.2s,
      background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(pre:hover .copy-code-btn) {
    opacity: 1;
  }

  :global(.copy-code-btn:hover) {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }

  :global(.copy-code-btn.copied) {
    color: hsl(var(--primary));
  }

  /* Heading anchor links */
  :global(.heading-anchor) {
    position: absolute;
    left: -1.75rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.25rem;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));
    opacity: 0;
    transition:
      opacity 0.2s,
      color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(h2:hover .heading-anchor),
  :global(h3:hover .heading-anchor),
  :global(h4:hover .heading-anchor),
  :global(h5:hover .heading-anchor),
  :global(h6:hover .heading-anchor) {
    opacity: 1;
  }

  :global(.heading-anchor:hover) {
    color: hsl(var(--primary));
  }

  :global(.heading-anchor.copied) {
    opacity: 1;
    color: hsl(var(--primary));
  }
</style>
