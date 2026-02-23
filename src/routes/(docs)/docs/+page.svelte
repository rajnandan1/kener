<script lang="ts">
  import type { DocsConfig, DocsPage } from "$lib/types/docs";
  import { base } from "$app/paths";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Book from "@lucide/svelte/icons/book";
  import Code from "@lucide/svelte/icons/code";
  import Zap from "@lucide/svelte/icons/zap";
  import Shield from "@lucide/svelte/icons/shield";
  import Github from "@lucide/svelte/icons/github";
  import Moon from "@lucide/svelte/icons/moon";
  import Sun from "@lucide/svelte/icons/sun";
  import Database from "@lucide/svelte/icons/database";
  import Users from "@lucide/svelte/icons/users";
  import Bell from "@lucide/svelte/icons/bell";
  import Wrench from "@lucide/svelte/icons/wrench";
  import Globe from "@lucide/svelte/icons/globe";
  import Palette from "@lucide/svelte/icons/palette";
  import KeyRound from "@lucide/svelte/icons/key-round";
  import Activity from "@lucide/svelte/icons/activity";
  import { toggleMode, mode } from "mode-watcher";

  interface Props {
    data: {
      config: DocsConfig;
    };
  }

  type IconComponent = typeof Zap;

  interface FeatureCard {
    icon: IconComponent;
    title: string;
    description: string;
    href?: string;
    tag?: string;
  }

  interface GroupHighlight {
    group: string;
    pages: DocsPage[];
  }

  interface CtaButton {
    title: string;
    href: string;
    primary: boolean;
  }

  let { data }: Props = $props();

  function flattenPages(pages: DocsPage[]): DocsPage[] {
    return pages.flatMap((page) => [page, ...(page.pages ? flattenPages(page.pages) : [])]);
  }

  function getAllPages(): DocsPage[] {
    return data.config.sidebar.flatMap((group) => flattenPages(group.pages));
  }

  function findFirstSlug(candidates: string[]): string | undefined {
    const match = getAllPages().find((page) => {
      if (candidates.includes(page.slug)) return true;

      const unprefixed =
        data.config.activeVersion && page.slug.startsWith(`${data.config.activeVersion}/`)
          ? page.slug.slice(data.config.activeVersion.length + 1)
          : page.slug;

      return candidates.includes(unprefixed);
    });
    return match?.slug;
  }

  function getQuickStartSlug(): string | undefined {
    return findFirstSlug(["quickstart", "introduction"]) ?? data.config.sidebar[0]?.pages[0]?.slug;
  }

  const coreFeatures: FeatureCard[] = [
    {
      icon: Zap,
      title: "Powerful Monitoring",
      description: "Track API, Ping, TCP, DNS, SSL, SQL, Heartbeat, and GameDig monitors with flexible checks.",
      href: "/docs/monitors/overview"
    },
    {
      icon: Shield,
      title: "Incident Management",
      description: "Create transparent incident timelines with updates, acknowledgements, and clear communication.",
      href: "/docs/incidents/overview"
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Notify subscribers via email, webhooks, Slack, and Discord with trigger-based workflows.",
      href: "/docs/alerting/overview"
    },
    {
      icon: Wrench,
      title: "Maintenance Scheduling",
      description: "Plan recurring maintenance windows and keep customers informed before, during, and after.",
      href: "/docs/maintenances/overview"
    },
    {
      icon: Users,
      title: "Multi-user Collaboration",
      description: "Invite your team with role-based access to monitors, incidents, and configuration workflows.",
      href: "/docs/user-management"
    },
    {
      icon: Database,
      title: "Multiple Status Pages",
      description: "Manage multiple branded status pages from one Kener instance for different products or teams.",
      href: "/docs/pages"
    },
    {
      icon: Code,
      title: "Complete API Access",
      description: "Automate incidents, monitor operations, and reporting with the full REST API.",
      href: "/docs/spec/v4/"
    },
    {
      icon: Globe,
      title: "Global Reach",
      description: "Use localization, timezone-aware display, and SEO-friendly pages for global audiences.",
      href: "/docs/internationalization"
    },
    {
      icon: Palette,
      title: "Customization & Branding",
      description: "Customize logo, colors, CSS, and theme behavior to match your product identity.",
      href: "/docs/setup/customizations"
    },
    {
      icon: Moon,
      title: "Dark Mode Ready",
      description: "Built-in theme switching and excellent readability in both light and dark environments."
    },
    {
      icon: Book,
      title: "Embeddable Widgets & Badges",
      description: "Embed status cards and badges into your website, app, or support portal.",
      href: "/docs/sharing"
    },
    {
      icon: Activity,
      title: "Analytics Ready",
      description: "Connect external analytics providers and understand how users interact with status updates."
    }
  ];

  const advancedFeatures: FeatureCard[] = [
    {
      icon: KeyRound,
      title: "Vault & Secret Management",
      description: "Securely store sensitive keys and credentials for integrations and monitor workflows.",
      tag: "Admin"
    },
    {
      icon: Activity,
      title: "Monitoring Data Explorer",
      description: "Inspect historical checks, drill into failures, and analyze uptime trends from one place.",
      tag: "Admin"
    },
    {
      icon: Bell,
      title: "Trigger System",
      description: "Create smart trigger conditions to route alerts and automate operational notifications.",
      tag: "Admin"
    },
    {
      icon: Book,
      title: "Template-driven Messaging",
      description: "Standardize incident and notification communication with reusable templates.",
      tag: "Admin"
    },
    {
      icon: Code,
      title: "API Key Management",
      description: "Issue and revoke API keys for secure automation and third-party integrations.",
      tag: "Admin"
    },
    {
      icon: Globe,
      title: "Analytics Provider Integrations",
      description: "Plug in providers like GA, Plausible, Mixpanel, Umami, Clarity, and more.",
      tag: "Admin"
    }
  ];

  function getGroupHighlights(): GroupHighlight[] {
    return data.config.sidebar.slice(0, 6).map((group) => ({
      group: group.group,
      pages: flattenPages(group.pages).slice(0, 3)
    }));
  }

  function getMetrics(): Array<{ label: string; value: string }> {
    return [];
  }

  function getCtaButtons(): CtaButton[] {
    const quickStartSlug = getQuickStartSlug();

    return [
      {
        title: "Get Started",
        href: quickStartSlug ? `/docs/${quickStartSlug}` : "/docs",
        primary: true
      },
      {
        title: "API Reference",
        href: "/docs/spec/v4/",
        primary: false
      }
    ];
  }

  function getHref(path: string): string {
    if (!path.startsWith("/docs") || !data.config.activeVersion) {
      return `${base}${path}`;
    }

    if (path.startsWith("/docs/spec/")) {
      return `${base}${path}`;
    }

    const suffix = path.replace(/^\/docs\/?/, "");

    if (suffix.startsWith(`${data.config.activeVersion}/`)) {
      return `${base}/docs/${suffix}`;
    }

    const versionedPath = suffix
      ? `/docs/${data.config.activeVersion}/${suffix}`
      : `/docs/${data.config.activeVersion}`;

    return `${base}${versionedPath}`;
  }
</script>

<svelte:head>
  <title>Documentation - {data.config.name}</title>
  <meta name="description" content="Documentation and guides for {data.config.name}" />
  <link rel="icon" href={data.config.favicon} />
</svelte:head>

<div class="bg-background text-foreground min-h-screen">
  <header class="bg-background/95 border-border fixed top-0 z-50 w-full border-b backdrop-blur">
    <div class="mx-auto flex max-w-[1200px] items-center justify-between p-4 px-6">
      <a href={getHref("/docs")} class="text-foreground no-underline">
        <span class="inline-flex items-center gap-2 text-base font-medium">
          <img src="/logo96.png" alt="Logo" class="h-6 w-6 rounded-sm" />
          {data.config.name}
        </span>
      </a>
      <div class="flex items-center gap-3 sm:gap-6">
        {#if data.config.footerLinks}
          {#each data.config.footerLinks.slice(0, 3) as link (link.url)}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground hidden text-sm no-underline transition-colors duration-200 sm:inline"
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

  <section class="bg-background min-h-screen bg-(image:--docs-home-hero-gradient) px-6 py-20 text-center md:py-24">
    <div class="mx-auto mt-20 max-w-[980px]">
      <div
        class="bg-background/80 border-border mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium backdrop-blur"
      >
        <Shield class="h-3.5 w-3.5" />
        Production-ready status page platform
      </div>
      <h1 class="text-foreground mb-6 text-4xl leading-tight font-extrabold tracking-tight md:text-6xl">
        Build trust with
        <span class="from-primary to-accent-foreground bg-linear-to-r bg-clip-text text-transparent"
          >{data.config.name}</span
        >
        documentation that actually gets used
      </h1>
      <p class="text-muted-foreground mx-auto mb-10 max-w-[760px] text-base leading-relaxed md:text-xl">
        From quick setup to advanced operations, Kener gives you open-source monitoring, incident workflows,
        notifications, maintenance scheduling, embeds, and automation APIs—all in one modern platform.
      </p>

      <div class="mb-10 flex flex-wrap justify-center gap-3 md:gap-4">
        {#each getCtaButtons() as button (button.title)}
          <a
            href={getHref(button.href)}
            rel="external"
            class={[
              "inline-flex items-center gap-2 rounded px-6 py-3 text-sm font-semibold no-underline transition-all duration-200 md:px-7 md:py-3.5 md:text-base",
              button.primary
                ? "bg-primary text-primary-foreground shadow-lg hover:-translate-y-0.5 hover:shadow-xl"
                : "bg-background text-foreground border-border hover:bg-accent hover:border-accent-foreground border"
            ]}
          >
            {button.title}
            {#if button.primary}
              <ArrowRight class="h-4 w-4" />
            {/if}
          </a>
        {/each}
      </div>

      <div class="mx-auto grid max-w-[920px] grid-cols-2 gap-3 sm:grid-cols-4">
        {#each getMetrics() as metric (metric.label)}
          <div class="bg-card/70 border-border rounded-lg border px-4 py-3 backdrop-blur">
            <p class="text-foreground text-lg font-bold md:text-xl">{metric.value}</p>
            <p class="text-muted-foreground text-xs tracking-wide uppercase">{metric.label}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section class="bg-background px-6 py-20 md:py-24">
    <div class="mx-auto mb-10 max-w-[1200px] text-center">
      <h2 class="text-foreground mb-3 text-3xl font-bold tracking-tight md:text-4xl">
        Everything from Introduction—and more
      </h2>
      <p class="text-muted-foreground mx-auto max-w-[760px] text-sm leading-relaxed md:text-base">
        This docs homepage brings together Kener's full capabilities from the introduction page plus advanced admin
        workflows you may have missed.
      </p>
    </div>

    <div class="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {#each coreFeatures as feature (feature.title)}
        <div
          class="bg-card border-border hover:border-accent-foreground rounded-lg border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          <div class="mb-4 flex items-start justify-between gap-4">
            <div class="bg-accent text-accent-foreground inline-flex h-11 w-11 items-center justify-center rounded-md">
              <feature.icon class="h-5 w-5" />
            </div>
            {#if feature.href}
              <a
                rel="external"
                href={getHref(feature.href)}
                class="text-muted-foreground hover:text-foreground text-xs font-medium no-underline transition-colors"
              >
                Learn more →
              </a>
            {/if}
          </div>
          <h3 class="text-foreground mb-2 text-lg font-semibold">{feature.title}</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="bg-muted/30 px-6 py-20 md:py-24">
    <div class="mx-auto mb-10 max-w-[1200px]">
      <h2 class="text-foreground text-center text-3xl font-bold tracking-tight md:text-4xl">
        Advanced power tools for ops teams
      </h2>
      <p class="text-muted-foreground mx-auto mt-3 max-w-[760px] text-center text-sm leading-relaxed md:text-base">
        Beyond public status pages, Kener includes deep operational tooling surfaced in the admin app.
      </p>
    </div>

    <div class="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {#each advancedFeatures as feature (feature.title)}
        <div
          class="bg-background border-border rounded-lg border p-6 shadow-sm transition-all duration-300 hover:shadow-md"
        >
          <div class="mb-4 flex items-center justify-between gap-3">
            <div class="bg-accent text-accent-foreground inline-flex h-10 w-10 items-center justify-center rounded-md">
              <feature.icon class="h-5 w-5" />
            </div>
            {#if feature.tag}
              <span
                class="bg-accent text-accent-foreground rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase"
              >
                {feature.tag}
              </span>
            {/if}
          </div>
          <h3 class="text-foreground mb-2 text-lg font-semibold">{feature.title}</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="bg-background px-6 py-20 md:py-24">
    <div class="mx-auto mb-10 max-w-[1200px]">
      <h2 class="text-foreground text-center text-3xl font-bold tracking-tight md:text-4xl">Explore by topic</h2>
      <p class="text-muted-foreground mx-auto mt-3 max-w-[680px] text-center text-sm leading-relaxed md:text-base">
        Jump to major sections and quickly find the pages your team needs most.
      </p>
    </div>

    <div class="mx-auto grid max-w-[1200px] grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {#each getGroupHighlights() as group (group.group)}
        <div class="bg-card border-border rounded-lg border p-6">
          <h3 class="text-foreground mb-3 text-lg font-semibold">{group.group}</h3>
          <div class="space-y-2">
            {#each group.pages as page (page.slug)}
              <a
                href={getHref(`/docs/${page.slug}`)}
                class="text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-between rounded px-2.5 py-2 text-sm no-underline transition-colors"
              >
                <span>{page.title}</span>
                <ArrowRight class="h-3.5 w-3.5" />
              </a>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="bg-background px-6 pb-6">
    <div class="mx-auto max-w-[1200px]">
      <div
        class="bg-card border-border flex flex-col items-center justify-between gap-4 rounded-xl border px-6 py-6 text-center md:flex-row md:text-left"
      >
        <div>
          <h3 class="text-foreground text-lg font-semibold">Need help or want to contribute?</h3>
          <p class="text-muted-foreground text-sm">
            Join the community, browse examples, and help shape Kener's future.
          </p>
        </div>
        <a
          href="https://github.com/rajnandan1/kener"
          target="_blank"
          rel="noopener noreferrer"
          class="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded px-4 py-2.5 text-sm font-semibold no-underline transition-transform duration-200 hover:-translate-y-0.5"
        >
          <Github class="h-4 w-4" />
          Star on GitHub
        </a>
      </div>
    </div>
  </section>

  <footer class="bg-background border-border border-t px-6 py-8">
    <div class="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 md:flex-row">
      <p class="text-muted-foreground text-sm">Built with ❤️ by the Kener team</p>
      {#if data.config.footerLinks}
        <div class="flex flex-wrap items-center justify-center gap-4 md:gap-6">
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

<style>
  :global(:root) {
    --docs-home-hero-gradient: radial-gradient(
      circle at 80% 20%,
      rgba(255, 180, 77, 0.5) 0%,
      rgba(255, 143, 61, 0.2) 30%,
      transparent 60%
    );
  }

  :global(.dark) {
    --docs-home-hero-gradient: radial-gradient(
      circle at 80% 20%,
      rgba(72, 54, 24, 0.3) 0%,
      rgba(72, 54, 24, 0.1) 30%,
      transparent 70%
    );
  }
</style>
