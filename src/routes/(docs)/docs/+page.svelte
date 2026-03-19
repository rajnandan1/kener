<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
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
      title: "11 Monitor Types",
      description:
        "Track API, Ping, TCP, DNS, SSL, SQL, Heartbeat, GameDig, and gRPC services with configurable check intervals and thresholds.",
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
      title: "Multi-page Status Dashboard",
      description:
        "Run multiple branded status pages from a single self-hosted Kener instance — one per product, team, or region.",
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
      title: "21 Languages & i18n",
      description:
        "Built-in localization with 21 languages, timezone-aware display, and SEO-friendly pages for global audiences.",
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
  <title>{data.config.name} - Open Source Status Page | Self-Hosted Docker Status Page & Uptime Monitor</title>
  <meta
    name="description"
    content="{data.config
      .name} is a free, open-source status page system you can self-host with Docker. Monitor APIs, Ping, TCP, DNS, SSL, and SQL services. Features incident management, maintenance scheduling, real-time notifications, embeddable widgets, and a REST API. Supports 11 monitor types, 21 languages, and deploys in under 2 minutes."
  />
  <meta
    name="keywords"
    content="open source status page, docker status page, self-hosted status page, uptime monitor, incident management, status page tool, free status page, kener, status page docker compose, open source uptime monitoring"
  />
  <link rel="icon" href={data.config.favicon} />
  <link rel="canonical" href="https://kener.ing/docs" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://kener.ing/docs" />
  <meta property="og:title" content="{data.config.name} - Open Source Status Page | Self-Hosted with Docker" />
  <meta
    property="og:description"
    content="Free, open-source status page you can self-host with Docker. Monitor 11 service types, manage incidents, schedule maintenance, and notify subscribers. Deploy in under 2 minutes with Docker Compose."
  />
  <meta property="og:image" content="https://kener.ing/og.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta
    property="og:image:alt"
    content="Kener open source status page dashboard showing uptime monitoring and incident management"
  />
  <meta property="og:site_name" content={data.config.name} />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{data.config.name} - Open Source Status Page & Docker Uptime Monitor" />
  <meta
    name="twitter:description"
    content="Free, self-hosted status page with Docker support. Monitor APIs, DNS, SSL, and more. Incident management, maintenance scheduling, and real-time notifications out of the box."
  />
  <meta name="twitter:image" content="https://kener.ing/og.jpg" />
  {@html `<script type="application/ld+json">${JSON.stringify([
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Kener",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Linux, macOS, Windows, Docker",
      description:
        "Kener is a free, open-source status page system and uptime monitor. Self-host with Docker or deploy to Railway and Zeabur. Supports 11 monitor types including API, Ping, TCP, DNS, SSL, SQL, gRPC, and more.",
      url: "https://kener.ing",
      downloadUrl: "https://github.com/rajnandan1/kener",
      softwareVersion: "latest",
      license: "https://opensource.org/licenses/MIT",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD"
      },
      author: {
        "@type": "Person",
        name: "Raj Nandan Sharma",
        url: "https://github.com/rajnandan1"
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5",
        ratingCount: "1",
        bestRating: "5"
      },
      featureList:
        "Uptime Monitoring, Incident Management, Maintenance Scheduling, Status Page, Docker Deployment, REST API, Email Notifications, Slack Integration, Discord Integration, Webhook Alerts, Embeddable Widgets, Multi-language Support, Dark Mode"
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Kener?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kener is a free, open-source status page system built with SvelteKit and Node.js. It provides real-time uptime monitoring across 11 service types, incident management, maintenance scheduling, and customizable dashboards. You can self-host it with Docker in under 2 minutes, or one-click deploy to Railway and Zeabur."
          }
        },
        {
          "@type": "Question",
          name: "How do I deploy Kener with Docker?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kener can be deployed with a single docker-compose.yml file. Run 'docker compose up -d' to start. It supports SQLite (default), PostgreSQL, and MySQL databases. You need Redis for the job queue. One-click deploy options are also available for Railway and Zeabur."
          }
        },
        {
          "@type": "Question",
          name: "What types of monitors does Kener support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kener supports 11 monitor types: API (HTTP), Ping, TCP, DNS, SSL certificate, SQL database, Heartbeat, GameDig (game server), gRPC, Group, and None. Each monitor type can be configured with custom check intervals, thresholds, and alerting rules."
          }
        },
        {
          "@type": "Question",
          name: "Is Kener a good alternative to Statuspage, Betteruptime, or Upptime?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Kener is a free, MIT-licensed, open-source alternative to paid status page services like Atlassian Statuspage, Better Uptime, and Instatus. Unlike SaaS options, Kener gives you full control over your data with self-hosted Docker deployment, supports 11 monitor types, 21 languages, and includes incident management, maintenance scheduling, and subscriber notifications at no cost."
          }
        },
        {
          "@type": "Question",
          name: "Does Kener support incident management?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Kener has full incident management with transparent timelines, status updates, acknowledgements, and clear communication workflows. You can create, update, and resolve incidents through the admin dashboard or the REST API."
          }
        },
        {
          "@type": "Question",
          name: "Can I customize the look and feel of my Kener status page?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Kener offers extensive customization including custom logos, colors, CSS, theme behavior (light/dark mode), localization across 21 languages, and multiple branded status pages from a single instance. It also supports embeddable status widgets and uptime badges."
          }
        },
        {
          "@type": "Question",
          name: "Does Kener have an API?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Kener provides a complete REST API (v4) for automating incidents, monitor operations, and reporting. API access is secured with Bearer token authentication and supports full CRUD operations."
          }
        },
        {
          "@type": "Question",
          name: "What notification channels does Kener support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kener supports notifications via email, webhooks, Slack, and Discord. It uses a trigger-based workflow system where you can configure smart conditions to route alerts and automate operational notifications to your team."
          }
        },
        {
          "@type": "Question",
          name: "Is Kener free and open source?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, Kener is 100% free and open-source, licensed under the MIT license. The source code is available on GitHub at github.com/rajnandan1/kener. There are no paid tiers or premium features — every feature is available to all users."
          }
        }
      ]
    }
  ])}</script>`}
</svelte:head>

<div class="docs-landing bg-background text-foreground min-h-screen">
  <!-- Navbar -->
  <header class="nav-bar border-border/50 fixed top-0 z-50 w-full border-b backdrop-blur-xl">
    <div class="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3">
      <a href={getHref("/docs")} class="text-foreground group no-underline">
        <span class="inline-flex items-center gap-2.5 text-base font-medium tracking-tight">
          <img
            src="/logo96.png"
            alt="Logo"
            class="h-7 w-7 rounded-md transition-transform duration-300 group-hover:scale-110"
          />
          <span class="font-display text-lg font-semibold">{data.config.name}</span>
        </span>
      </a>
      <div class="flex items-center gap-2 sm:gap-4">
        {#if data.config.footerLinks}
          {#each data.config.footerLinks.slice(0, 3) as link (link.url)}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground hidden text-sm font-medium tracking-tight transition-colors duration-200 sm:inline-flex"
            >
              {link.name}
            </a>
          {/each}
        {/if}
        <button
          onclick={toggleMode}
          aria-label="Toggle theme"
          class="text-muted-foreground hover:text-foreground hover:bg-muted/50 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200"
        >
          {#if mode.current === "dark"}
            <Sun class="h-[18px] w-[18px]" />
          {:else}
            <Moon class="h-[18px] w-[18px]" />
          {/if}
        </button>
      </div>
    </div>
  </header>

  <!-- Hero -->
  <section class="hero-section relative overflow-hidden px-6 pt-32 pb-20 md:pt-40 md:pb-28">
    <!-- Animated gradient orbs -->
    <div class="hero-orb hero-orb-1"></div>
    <div class="hero-orb hero-orb-2"></div>
    <div class="hero-orb hero-orb-3"></div>
    <!-- Grain overlay -->
    <div class="grain-overlay"></div>

    <div class="relative z-10 mx-auto max-w-[1200px]">
      <div class="mx-auto max-w-[820px] text-center">
        <div class="fade-up mb-8 inline-flex items-center gap-2">
          <Badge
            variant="outline"
            class="hero-badge border-foreground/10 bg-background/60 gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide backdrop-blur-sm"
          >
            <span class="bg-primary inline-block h-1.5 w-1.5 animate-pulse rounded-full"></span>
            Open-source &middot; Self-hosted &middot; Docker-ready
          </Badge>
        </div>

        <h1
          class="fade-up font-display text-foreground mb-6 text-4xl leading-[1.1] font-bold tracking-tight md:text-6xl lg:text-7xl"
          style="animation-delay: 80ms"
        >
          Open source status page
          <br />you can <span class="hero-gradient-text">self-host</span>
        </h1>

        <p
          class="fade-up font-body text-muted-foreground mx-auto mb-10 max-w-[640px] text-base leading-relaxed font-light md:text-lg"
          style="animation-delay: 160ms"
        >
          Kener is a free, open-source status page and uptime monitor. Deploy with Docker in under 2 minutes. Track 11
          service types, manage incidents, schedule maintenance, and notify subscribers — all from one platform.
        </p>

        <div class="fade-up mb-6 flex flex-wrap items-center justify-center gap-3" style="animation-delay: 240ms">
          {#each getCtaButtons() as button (button.title)}
            {#if button.primary}
              <a
                href={getHref(button.href)}
                class="cta-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold tracking-tight transition-all duration-300"
              >
                {button.title}
                <ArrowRight class="h-4 w-4" />
              </a>
            {:else}
              <a
                href={getHref(button.href)}
                class="border-border/60 text-foreground hover:bg-muted/40 inline-flex items-center gap-2 rounded-lg border bg-transparent px-6 py-3 text-sm font-medium tracking-tight backdrop-blur-sm transition-all duration-300"
              >
                {button.title}
              </a>
            {/if}
          {/each}
        </div>

        <div class="fade-up flex flex-wrap items-center justify-center gap-3" style="animation-delay: 300ms">
          <a
            href="https://railway.com/deploy/spSvic?referralCode=1Pn7vs&utm_medium=integration&utm_source=template&utm_campaign=generic"
            target="_blank"
            rel="noopener noreferrer"
            class="opacity-70 transition-opacity duration-200 hover:opacity-100"
          >
            <img src="https://railway.com/button.svg" alt="Deploy on Railway" class="h-9" />
          </a>
          <a
            href="https://zeabur.com/templates/1YRTMI?referralCode=rajnandan1"
            target="_blank"
            rel="noopener noreferrer"
            class="opacity-70 transition-opacity duration-200 hover:opacity-100"
          >
            <img src="https://zeabur.com/button.svg" alt="Deploy on Zeabur" class="h-9" />
          </a>
        </div>
      </div>

      <!-- Hero image -->
      <div class="fade-up mx-auto mt-16 max-w-[960px]" style="animation-delay: 380ms">
        <div class="hero-image-wrapper group relative">
          <div class="hero-image-glow"></div>
          <div class="relative overflow-hidden rounded-xl border border-white/10 shadow-2xl">
            <img
              src="/og.jpg"
              alt="Kener open source status page dashboard — uptime monitoring, incident management, and Docker deployment"
              class="bg-muted h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Core Features -->
  <section class="relative px-6 py-24 md:py-32">
    <div class="mx-auto max-w-[1200px]">
      <div class="mx-auto mb-16 max-w-[640px] text-center">
        <p class="font-body text-primary mb-3 text-sm font-semibold tracking-widest uppercase">Capabilities</p>
        <h2 class="font-display text-foreground mb-4 text-3xl font-bold tracking-tight md:text-5xl">
          Status page monitoring features
        </h2>
        <p class="font-body text-muted-foreground text-base leading-relaxed font-light md:text-lg">
          From uptime monitoring to incident management — everything you need to run a production status page.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {#each coreFeatures as feature, i (feature.title)}
          <div
            class="feature-card group relative overflow-hidden rounded-xl border border-transparent p-6 transition-all duration-500"
            style="animation-delay: {i * 50}ms"
          >
            <div class="feature-card-bg"></div>
            <div class="relative z-10">
              <div class="mb-4 flex items-start justify-between gap-4">
                <div
                  class="feature-icon-wrapper inline-flex h-11 w-11 items-center justify-center rounded-lg transition-all duration-300"
                >
                  <feature.icon class="h-5 w-5" />
                </div>
                {#if feature.href}
                  <a
                    href={getHref(feature.href)}
                    class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium tracking-tight opacity-0 transition-all duration-300 group-hover:opacity-100"
                  >
                    Learn more
                    <ArrowRight class="h-3 w-3" />
                  </a>
                {/if}
              </div>
              <h3 class="font-display text-foreground mb-2 text-lg font-semibold tracking-tight">{feature.title}</h3>
              <p class="font-body text-muted-foreground text-sm leading-relaxed font-light">{feature.description}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Advanced Features -->
  <section class="relative overflow-hidden px-6 py-24 md:py-32">
    <div class="section-accent-bg"></div>
    <div class="relative z-10 mx-auto max-w-[1200px]">
      <div class="mx-auto mb-16 max-w-[640px] text-center">
        <p class="font-body text-primary mb-3 text-sm font-semibold tracking-widest uppercase">For Ops Teams</p>
        <h2 class="font-display text-foreground mb-4 text-3xl font-bold tracking-tight md:text-5xl">
          Advanced ops &amp; admin tools
        </h2>
        <p class="font-body text-muted-foreground text-base leading-relaxed font-light md:text-lg">
          Self-hosted status page with deep operational tooling — secrets vault, triggers, API keys, and analytics.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each advancedFeatures as feature, i (feature.title)}
          <div
            class="advanced-card group relative overflow-hidden rounded-xl p-6 transition-all duration-500"
            style="animation-delay: {i * 60}ms"
          >
            <div class="advanced-card-border"></div>
            <div class="relative z-10">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div class="bg-primary/10 text-primary inline-flex h-10 w-10 items-center justify-center rounded-lg">
                  <feature.icon class="h-5 w-5" />
                </div>
                {#if feature.tag}
                  <span
                    class="text-muted-foreground bg-muted/60 rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-widest uppercase"
                    >{feature.tag}</span
                  >
                {/if}
              </div>
              <h3 class="font-display text-foreground mb-2 text-lg font-semibold tracking-tight">{feature.title}</h3>
              <p class="font-body text-muted-foreground text-sm leading-relaxed font-light">{feature.description}</p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Explore by Topic -->
  <section class="px-6 py-24 md:py-32">
    <div class="mx-auto max-w-[1200px]">
      <div class="mx-auto mb-16 max-w-[640px] text-center">
        <p class="font-body text-primary mb-3 text-sm font-semibold tracking-widest uppercase">Documentation</p>
        <h2 class="font-display text-foreground mb-4 text-3xl font-bold tracking-tight md:text-5xl">
          Kener documentation
        </h2>
        <p class="font-body text-muted-foreground text-base leading-relaxed font-light md:text-lg">
          Guides for Docker deployment, monitor configuration, incident workflows, and API integration.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {#each getGroupHighlights() as group (group.group)}
          <div class="topic-card group rounded-xl border border-transparent p-6 transition-all duration-400">
            <h3 class="font-display text-foreground mb-4 text-lg font-semibold tracking-tight">{group.group}</h3>
            <div class="space-y-1">
              {#each group.pages as page (page.slug)}
                <a
                  href={getHref(`/docs/${page.slug}`)}
                  class="text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium tracking-tight transition-all duration-200"
                >
                  <span>{page.title}</span>
                  <ArrowRight class="h-3.5 w-3.5 opacity-0 transition-all duration-200 group-hover:opacity-60" />
                </a>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- CTA Banner -->
  <section class="px-6 pb-12">
    <div class="mx-auto max-w-[1200px]">
      <div class="cta-banner relative overflow-hidden rounded-2xl p-8 md:p-12">
        <div class="cta-banner-bg"></div>
        <div class="relative z-10 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <h2 class="font-display text-foreground mb-2 text-xl font-bold tracking-tight md:text-2xl">
              Star Kener on GitHub
            </h2>
            <p class="font-body text-muted-foreground text-sm font-light">
              Join the open-source community. Contribute features, report issues, and help build the best free status
              page platform.
            </p>
          </div>
          <a
            href="https://github.com/rajnandan1/kener"
            target="_blank"
            rel="noopener noreferrer"
            class="cta-github inline-flex shrink-0 items-center gap-2.5 rounded-lg px-6 py-3 text-sm font-semibold tracking-tight transition-all duration-300"
          >
            <Github class="h-4 w-4" />
            Star on GitHub
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-border/40 border-t px-6 py-8">
    <div class="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 md:flex-row">
      <p class="font-body text-muted-foreground text-sm font-light">Built with care by the Kener team</p>
      {#if data.config.footerLinks}
        <div class="flex flex-wrap items-center justify-center gap-5">
          {#each data.config.footerLinks as link (link.url)}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground text-sm font-medium tracking-tight transition-colors duration-200"
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
  /* ===== Typography ===== */
  .docs-landing :global(.font-display) {
    font-family: "Inria Serif", Georgia, "Times New Roman", serif;
  }
  .docs-landing :global(.font-body) {
    font-family:
      "Source Sans 3",
      system-ui,
      -apple-system,
      sans-serif;
  }

  /* ===== Entrance Animations ===== */
  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fade-up {
    opacity: 0;
    animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* ===== Navbar ===== */
  .nav-bar {
    background: color-mix(in oklch, var(--background) 80%, transparent);
  }

  /* ===== Hero Section ===== */
  .hero-section {
    position: relative;
    background: var(--background);
  }

  /* Gradient orbs */
  .hero-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.5;
    animation: orbFloat 12s ease-in-out infinite;
  }

  .hero-orb-1 {
    width: 500px;
    height: 500px;
    top: -10%;
    right: -5%;
    background: color-mix(in oklch, var(--primary) 25%, transparent);
    animation-delay: 0s;
  }

  .hero-orb-2 {
    width: 350px;
    height: 350px;
    top: 40%;
    left: -8%;
    background: color-mix(in oklch, var(--primary) 15%, transparent);
    animation-delay: -4s;
  }

  .hero-orb-3 {
    width: 250px;
    height: 250px;
    bottom: 10%;
    right: 20%;
    background: color-mix(in oklch, var(--primary) 12%, transparent);
    animation-delay: -8s;
  }

  @keyframes orbFloat {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(20px, -30px) scale(1.05);
    }
    66% {
      transform: translate(-15px, 15px) scale(0.95);
    }
  }

  /* Grain texture */
  .grain-overlay {
    position: absolute;
    inset: 0;
    opacity: 0.03;
    pointer-events: none;
    z-index: 1;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 200px 200px;
  }

  :global(.dark) .grain-overlay {
    opacity: 0.04;
  }

  /* Hero gradient text */
  .hero-gradient-text {
    background: linear-gradient(135deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 60%, transparent) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Hero badge */
  :global(.hero-badge) {
    transition: all 0.3s ease;
  }
  :global(.hero-badge:hover) {
    border-color: color-mix(in oklch, var(--primary) 30%, transparent);
  }

  /* CTA primary button */
  .cta-primary {
    background: var(--primary);
    color: var(--primary-foreground);
    box-shadow:
      0 1px 2px color-mix(in oklch, var(--primary) 30%, transparent),
      0 4px 16px color-mix(in oklch, var(--primary) 15%, transparent);
  }
  .cta-primary:hover {
    box-shadow:
      0 1px 2px color-mix(in oklch, var(--primary) 40%, transparent),
      0 8px 24px color-mix(in oklch, var(--primary) 25%, transparent);
    transform: translateY(-1px);
  }

  /* Hero image */
  .hero-image-wrapper {
    position: relative;
  }

  .hero-image-glow {
    position: absolute;
    inset: -1px;
    border-radius: 0.85rem;
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--primary) 30%, transparent),
      color-mix(in oklch, var(--primary) 5%, transparent),
      color-mix(in oklch, var(--primary) 20%, transparent)
    );
    z-index: -1;
    opacity: 0.6;
    transition: opacity 0.5s ease;
  }

  .hero-image-wrapper:hover .hero-image-glow {
    opacity: 1;
  }

  /* ===== Feature Cards ===== */
  .feature-card {
    cursor: default;
  }

  .feature-card-bg {
    position: absolute;
    inset: 0;
    border-radius: 0.75rem;
    background: var(--card);
    border: 1px solid color-mix(in oklch, var(--border) 50%, transparent);
    transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .feature-card:hover .feature-card-bg {
    border-color: color-mix(in oklch, var(--primary) 30%, transparent);
    box-shadow: 0 8px 32px color-mix(in oklch, var(--primary) 6%, transparent);
  }

  .feature-icon-wrapper {
    background: color-mix(in oklch, var(--primary) 8%, transparent);
    color: var(--primary);
  }

  .feature-card:hover .feature-icon-wrapper {
    background: color-mix(in oklch, var(--primary) 14%, transparent);
    transform: scale(1.05);
  }

  /* ===== Advanced Section ===== */
  .section-accent-bg {
    position: absolute;
    inset: 0;
    background: color-mix(in oklch, var(--muted) 30%, transparent);
  }

  .advanced-card {
    position: relative;
    background: var(--background);
    cursor: default;
  }

  .advanced-card-border {
    position: absolute;
    inset: 0;
    border-radius: 0.75rem;
    border: 1px solid color-mix(in oklch, var(--border) 40%, transparent);
    transition: all 0.4s ease;
    pointer-events: none;
  }

  .advanced-card:hover .advanced-card-border {
    border-color: color-mix(in oklch, var(--primary) 25%, transparent);
  }

  /* ===== Topic Cards ===== */
  .topic-card {
    background: color-mix(in oklch, var(--card) 50%, transparent);
    border: 1px solid color-mix(in oklch, var(--border) 40%, transparent);
  }

  .topic-card:hover {
    background: var(--card);
    border-color: color-mix(in oklch, var(--border) 70%, transparent);
  }

  /* ===== CTA Banner ===== */
  .cta-banner {
    border: 1px solid color-mix(in oklch, var(--border) 50%, transparent);
  }

  .cta-banner-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 50%, color-mix(in oklch, var(--primary) 6%, transparent) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 50%, color-mix(in oklch, var(--primary) 4%, transparent) 0%, transparent 60%),
      var(--card);
    border-radius: inherit;
  }

  .cta-github {
    background: var(--foreground);
    color: var(--background);
  }

  .cta-github:hover {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px color-mix(in oklch, var(--foreground) 20%, transparent);
  }

  /* ===== Dark mode adjustments ===== */
  :global(.dark) .hero-orb {
    opacity: 0.25;
  }

  :global(.dark) .hero-image-glow {
    opacity: 0.4;
  }

  :global(.dark) .feature-card:hover .feature-card-bg {
    box-shadow: 0 8px 32px color-mix(in oklch, var(--primary) 4%, transparent);
  }
</style>
