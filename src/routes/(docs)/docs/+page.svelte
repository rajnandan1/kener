<script lang="ts">
  import type { DocsConfig } from "$lib/types/docs";
  import { base } from "$app/paths";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Book from "@lucide/svelte/icons/book";
  import Code from "@lucide/svelte/icons/code";
  import Zap from "@lucide/svelte/icons/zap";
  import Shield from "@lucide/svelte/icons/shield";
  import Github from "@lucide/svelte/icons/github";
  import Moon from "@lucide/svelte/icons/moon";
  import Sun from "@lucide/svelte/icons/sun";
  import { toggleMode, mode } from "mode-watcher";

  interface Props {
    data: {
      config: DocsConfig;
    };
  }

  let { data }: Props = $props();

  const features = [
    {
      icon: Zap,
      title: "Quick Setup",
      description: "Get started in minutes with our simple configuration."
    },
    {
      icon: Shield,
      title: "Reliable Monitoring",
      description: "Monitor your services with multiple check types."
    },
    {
      icon: Code,
      title: "API First",
      description: "Full REST API for automation and integrations."
    },
    {
      icon: Book,
      title: "Well Documented",
      description: "Comprehensive guides and API references."
    }
  ];

  function getHref(path: string): string {
    return `${base}${path}`;
  }
</script>

<svelte:head>
  <title>Documentation - {data.config.name}</title>
  <meta name="description" content="Documentation and guides for {data.config.name}" />
</svelte:head>

<div class="bg-background text-foreground min-h-screen">
  <!-- Navbar -->
  <header class="bg-background border-border sticky top-0 z-50 border-b">
    <div class="mx-auto flex max-w-[1200px] items-center justify-between p-4 px-6">
      <a href={getHref("/docs")} class="text-foreground no-underline">
        <span class="text-xl font-bold">{data.config.name}</span>
      </a>
      <div class="flex items-center gap-6">
        {#if data.config.footerLinks}
          {#each data.config.footerLinks as link (link.url)}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground text-sm no-underline transition-colors duration-200"
            >
              {link.name}
            </a>
          {/each}
        {/if}
        <button
          class="text-muted-foreground hover:bg-accent hover:text-foreground flex h-9 w-9 cursor-pointer items-center justify-center rounded border-none bg-transparent transition-all duration-200"
          onclick={toggleMode}
          aria-label="Toggle theme"
        >
          {#if mode.current === "dark"}
            <Sun class="h-5 w-5" />
          {:else}
            <Moon class="h-5 w-5" />
          {/if}
        </button>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="from-accent to-background bg-gradient-to-b px-6 py-24 text-center">
    <div class="mx-auto max-w-[800px]">
      <h1 class="text-foreground mb-6 text-5xl leading-tight font-extrabold md:text-6xl">
        Welcome to <span class="from-accent-foreground to-primary bg-gradient-to-r bg-clip-text text-transparent"
          >{data.config.name}</span
        >
      </h1>
      <p class="text-muted-foreground mx-auto mb-10 max-w-[600px] text-lg leading-relaxed md:text-xl">
        Learn how to set up, configure, and get the most out of your status page. Our documentation covers everything
        from getting started to advanced configurations.
      </p>
      <div class="flex flex-wrap justify-center gap-4">
        {#if data.config.sidebar[0]?.pages[0]}
          <a
            href={getHref(`/docs/${data.config.sidebar[0].pages[0].slug}`)}
            class="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded px-7 py-3.5 text-base font-semibold no-underline shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
          >
            Get Started
            <ArrowRight class="h-4 w-4" />
          </a>
        {/if}
        <a
          href={getHref("/docs/api-reference")}
          class="bg-background text-foreground border-border hover:bg-accent hover:border-accent-foreground inline-flex items-center gap-2 rounded border px-7 py-3.5 text-base font-semibold no-underline transition-all duration-200"
        >
          API Reference
        </a>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="bg-background px-6 py-20">
    <div class="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
      {#each features as feature (feature.title)}
        <div
          class="bg-card border-border hover:border-accent-foreground rounded-lg border p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
        >
          <div class="bg-accent text-accent-foreground mb-5 inline-flex h-14 w-14 items-center justify-center rounded">
            <feature.icon class="h-6 w-6" />
          </div>
          <h3 class="text-foreground mb-2 text-lg font-semibold">{feature.title}</h3>
          <p class="text-muted-foreground text-[0.9375rem] leading-relaxed">{feature.description}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Documentation Sections -->
  <section class="bg-muted px-6 py-20">
    <div class="mx-auto max-w-[1200px]">
      <h2 class="text-foreground mb-3 text-center text-3xl font-bold">Explore the Documentation</h2>
      <p class="text-muted-foreground mb-12 text-center text-lg">
        Find guides, references, and resources to help you build with Kener
      </p>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each data.config.sidebar as group (group.group)}
          <div
            class="bg-card border-border hover:border-accent-foreground rounded-lg border p-7 transition-all duration-200"
          >
            <h3 class="text-foreground border-border mb-4 border-b pb-3 text-lg font-semibold">{group.group}</h3>
            <ul class="m-0 list-none p-0">
              {#each group.pages as page (page.slug)}
                <li>
                  <a
                    href={getHref(`/docs/${page.slug}`)}
                    class="text-muted-foreground hover:text-accent-foreground flex items-center justify-between py-2.5 text-[0.9375rem] no-underline transition-all duration-200 hover:pl-2"
                  >
                    <span>{page.title}</span>
                    <ArrowRight class="h-4 w-4" />
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-background border-border border-t px-6 py-8">
    <div class="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 md:flex-row">
      <p class="text-muted-foreground text-sm">Built with ❤️ by the Kener team</p>
      {#if data.config.footerLinks}
        <div class="flex gap-6">
          {#each data.config.footerLinks as link (link.url)}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground text-sm no-underline transition-colors duration-200"
            >
              {link.name}
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </footer>
</div>
