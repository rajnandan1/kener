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
  import GitCompareArrows from "@lucide/svelte/icons/git-compare-arrows";
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
  <!-- Floating Nav Pill -->
  <header class="nav-pill fixed top-0 right-0 left-0 z-40 flex justify-center px-4 pt-5">
    <nav class="nav-pill-inner flex items-center gap-1 rounded-full px-2 py-1.5 sm:gap-2 sm:px-3">
      <a
        href={getHref("/docs")}
        class="text-foreground group flex items-center gap-2 rounded-full px-3 py-1.5 no-underline transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
      >
        <img
          src="/logo96.png"
          alt="Logo"
          class="h-6 w-6 rounded-md transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110"
        />
        <span class="font-display text-base font-semibold tracking-tight">{data.config.name}</span>
      </a>
      <div class="bg-border/40 mx-1 hidden h-4 w-px sm:block"></div>
      {#if data.config.footerLinks}
        {#each data.config.footerLinks.slice(0, 3) as link (link.url)}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-foreground hover:bg-foreground/5 hidden rounded-full px-3 py-1.5 text-[13px] font-medium tracking-tight transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:inline-flex"
          >
            {link.name}
          </a>
        {/each}
      {/if}
      <button
        onclick={toggleMode}
        aria-label="Toggle theme"
        class="text-muted-foreground hover:text-foreground hover:bg-foreground/5 inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
      >
        {#if mode.current === "dark"}
          <Sun class="h-4 w-4" />
        {:else}
          <Moon class="h-4 w-4" />
        {/if}
      </button>
    </nav>
  </header>

  <!-- Hero -->
  <section class="hero-section relative overflow-hidden px-4 pt-36 pb-28 md:px-6 md:pt-48 md:pb-40">
    <div class="hero-orb hero-orb-1"></div>
    <div class="hero-orb hero-orb-2"></div>
    <div class="hero-orb hero-orb-3"></div>
    <div class="grain-overlay"></div>

    <div class="relative z-10 mx-auto max-w-[1200px]">
      <div class="mx-auto max-w-[860px] text-center">
        <div class="fade-up mb-10 inline-flex items-center gap-2">
          <span class="eyebrow-tag">
            <span class="bg-primary inline-block h-1.5 w-1.5 animate-pulse rounded-full"></span>
            Open-source &middot; Self-hosted &middot; Docker-ready
          </span>
        </div>

        <h1
          class="fade-up font-display text-foreground mb-8 text-4xl leading-[1.08] font-semibold tracking-tight md:text-6xl lg:text-[5.25rem]"
          style="animation-delay: 100ms"
        >
          Open source status page
          <br />you can <span class="hero-gradient-text">self-host</span>
        </h1>

        <p
          class="fade-up font-body text-muted-foreground mx-auto mb-12 max-w-[600px] text-base leading-[1.7] font-light md:text-[1.125rem]"
          style="animation-delay: 200ms"
        >
          Kener is a free, open-source status page and uptime monitor. Deploy with Docker in under 2 minutes. Track 11
          service types, manage incidents, schedule maintenance, and notify subscribers — all from one platform.
        </p>

        <!-- Pill CTA Buttons -->
        <div class="fade-up mb-8 flex flex-wrap items-center justify-center gap-4" style="animation-delay: 300ms">
          {#each getCtaButtons() as button (button.title)}
            {#if button.primary}
              <a href={getHref(button.href)} class="cta-pill-primary group">
                <span class="font-body text-sm font-semibold tracking-tight">{button.title}</span>
                <span class="cta-pill-icon">
                  <ArrowRight
                    class="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px"
                  />
                </span>
              </a>
            {:else}
              <a href={getHref(button.href)} class="cta-pill-secondary group">
                <span class="font-body text-sm font-medium tracking-tight">{button.title}</span>
              </a>
            {/if}
          {/each}
        </div>

        <div class="fade-up flex flex-wrap items-center justify-center gap-3" style="animation-delay: 400ms">
          <a
            href="https://railway.com/deploy/spSvic?referralCode=1Pn7vs&utm_medium=integration&utm_source=template&utm_campaign=generic"
            target="_blank"
            rel="noopener noreferrer"
            class="opacity-60 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-100"
          >
            <img src="https://railway.com/button.svg" alt="Deploy on Railway" class="h-9" />
          </a>
          <a
            href="https://zeabur.com/templates/1YRTMI?referralCode=rajnandan1"
            target="_blank"
            rel="noopener noreferrer"
            class="opacity-60 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:opacity-100"
          >
            <img src="https://zeabur.com/button.svg" alt="Deploy on Zeabur" class="h-9" />
          </a>
        </div>
      </div>

      <!-- Double-Bezel Hero Image -->
      <div class="fade-up mx-auto mt-20 max-w-[960px]" style="animation-delay: 500ms">
        <div class="hero-bezel-outer group">
          <div class="hero-bezel-inner">
            <img
              src="/og.jpg"
              alt="Kener open source status page dashboard — uptime monitoring, incident management, and Docker deployment"
              class="bg-muted h-auto w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.015]"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Core Features -->
  <section class="relative px-4 py-28 md:px-6 md:py-36">
    <div class="mx-auto max-w-[1200px]">
      <div class="mx-auto mb-20 max-w-[640px] text-center">
        <span class="eyebrow-tag mb-5 inline-flex">Capabilities</span>
        <h2 class="font-display text-foreground mb-5 text-3xl font-bold tracking-tight md:text-5xl">
          Status page monitoring features
        </h2>
        <p class="font-body text-muted-foreground text-base leading-[1.7] font-light md:text-lg">
          From uptime monitoring to incident management — everything you need to run a production status page.
        </p>
      </div>

      <div class="bento-features">
        {#each coreFeatures as feature, i (feature.title)}
          <div class="feature-bezel-outer group bento-item h-full" style="animation-delay: {i * 60}ms">
            <div class="feature-bezel-inner h-full">
              <div class="mb-5 flex items-start justify-between gap-4">
                <div class="feature-icon-wrapper">
                  <feature.icon class="h-[18px] w-[18px]" />
                </div>
                {#if feature.href}
                  <a
                    href={getHref(feature.href)}
                    class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium tracking-tight opacity-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-100"
                  >
                    Docs
                    <ArrowRight class="h-3 w-3" />
                  </a>
                {/if}
              </div>
              <h3 class="font-display text-foreground mb-2 text-[1.0625rem] font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p class="font-body text-muted-foreground text-[0.8125rem] leading-[1.65] font-light">
                {feature.description}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Advanced Features -->
  <section class="relative overflow-hidden px-4 py-28 md:px-6 md:py-36">
    <div class="section-accent-bg"></div>
    <div class="relative z-10 mx-auto max-w-[1200px]">
      <div class="mx-auto mb-20 max-w-[640px] text-center">
        <span class="eyebrow-tag mb-5 inline-flex">For Ops Teams</span>
        <h2 class="font-display text-foreground mb-5 text-3xl font-bold tracking-tight md:text-5xl">
          Advanced ops &amp; admin tools
        </h2>
        <p class="font-body text-muted-foreground text-base leading-[1.7] font-light md:text-lg">
          Self-hosted status page with deep operational tooling — secrets vault, triggers, API keys, and analytics.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {#each advancedFeatures as feature, i (feature.title)}
          <div class="advanced-bezel-outer group" style="animation-delay: {i * 70}ms">
            <div class="advanced-bezel-inner">
              <div class="mb-5 flex items-center justify-between gap-3">
                <div class="bg-primary/10 text-primary inline-flex h-10 w-10 items-center justify-center rounded-xl">
                  <feature.icon class="h-[18px] w-[18px]" />
                </div>
                {#if feature.tag}
                  <span class="eyebrow-tag text-[10px]">{feature.tag}</span>
                {/if}
              </div>
              <h3 class="font-display text-foreground mb-2 text-[1.0625rem] font-semibold tracking-tight">
                {feature.title}
              </h3>
              <p class="font-body text-muted-foreground text-[0.8125rem] leading-[1.65] font-light">
                {feature.description}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Explore by Topic -->
  <section class="px-4 py-28 md:px-6 md:py-36">
    <div class="mx-auto max-w-[1200px]">
      <div class="mx-auto mb-20 max-w-[640px] text-center">
        <span class="eyebrow-tag mb-5 inline-flex">Documentation</span>
        <h2 class="font-display text-foreground mb-5 text-3xl font-bold tracking-tight md:text-5xl">
          Kener documentation
        </h2>
        <p class="font-body text-muted-foreground text-base leading-[1.7] font-light md:text-lg">
          Guides for Docker deployment, monitor configuration, incident workflows, and API integration.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {#each getGroupHighlights() as group (group.group)}
          <div class="topic-bezel-outer group">
            <div class="topic-bezel-inner">
              <h3 class="font-display text-foreground mb-5 text-lg font-semibold tracking-tight">{group.group}</h3>
              <div class="space-y-0.5">
                {#each group.pages as page (page.slug)}
                  <a
                    href={getHref(`/docs/${page.slug}`)}
                    class="text-muted-foreground hover:text-foreground hover:bg-foreground/5 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium tracking-tight transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                  >
                    <span>{page.title}</span>
                    <ArrowRight
                      class="h-3.5 w-3.5 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-50"
                    />
                  </a>
                {/each}
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Comparison -->
  <section class="relative overflow-hidden px-4 py-28 md:px-6 md:py-36">
    <div class="section-accent-bg"></div>
    <div class="relative z-10 mx-auto max-w-[1200px]">
      <div class="mx-auto mb-20 max-w-[640px] text-center">
        <span class="eyebrow-tag mb-5 inline-flex">Comparison</span>
        <h2 class="font-display text-foreground mb-5 text-3xl font-bold tracking-tight md:text-5xl">
          How Kener compares
        </h2>
        <p class="font-body text-muted-foreground text-base leading-[1.7] font-light md:text-lg">
          See how Kener stacks up against popular open-source and SaaS status page tools.
        </p>
      </div>

      <!-- Double-bezel table wrapper -->
      <div class="comparison-bezel-outer mx-auto max-w-[960px]">
        <div class="comparison-bezel-inner overflow-x-auto">
          <table class="comparison-table w-full text-sm">
            <thead>
              <tr>
                <th class="text-foreground font-display px-5 py-3.5 text-left text-[13px] font-semibold">Feature</th>
                <th class="text-primary font-display px-5 py-3.5 text-center text-[13px] font-semibold">Kener</th>
                <th class="text-muted-foreground font-display px-5 py-3.5 text-center text-[13px] font-semibold"
                  >Upptime</th
                >
                <th class="text-muted-foreground font-display px-5 py-3.5 text-center text-[13px] font-semibold"
                  >Uptime Kuma</th
                >
                <th class="text-muted-foreground font-display px-5 py-3.5 text-center text-[13px] font-semibold"
                  >Statuspage</th
                >
              </tr>
            </thead>
            <tbody class="font-body">
              <tr>
                <td class="text-foreground px-5 py-3 font-medium">Self-hosted</td>
                <td class="px-5 py-3 text-center">Yes</td>
                <td class="px-5 py-3 text-center">GitHub only</td>
                <td class="px-5 py-3 text-center">Yes</td>
                <td class="px-5 py-3 text-center">No</td>
              </tr>
              <tr>
                <td class="text-foreground px-5 py-3 font-medium">Monitor types</td>
                <td class="px-5 py-3 text-center">11</td>
                <td class="px-5 py-3 text-center">1</td>
                <td class="px-5 py-3 text-center">10+</td>
                <td class="px-5 py-3 text-center">External</td>
              </tr>
              <tr>
                <td class="text-foreground px-5 py-3 font-medium">Incident management</td>
                <td class="px-5 py-3 text-center">Full lifecycle</td>
                <td class="px-5 py-3 text-center">GitHub Issues</td>
                <td class="px-5 py-3 text-center">No</td>
                <td class="px-5 py-3 text-center">Yes</td>
              </tr>
              <tr>
                <td class="text-foreground px-5 py-3 font-medium">Recurring maintenance</td>
                <td class="px-5 py-3 text-center">RRULE</td>
                <td class="px-5 py-3 text-center">Basic</td>
                <td class="px-5 py-3 text-center">Basic</td>
                <td class="px-5 py-3 text-center">Basic</td>
              </tr>
              <tr>
                <td class="text-foreground px-5 py-3 font-medium">Subscriber notifications</td>
                <td class="px-5 py-3 text-center">Unlimited</td>
                <td class="px-5 py-3 text-center">No</td>
                <td class="px-5 py-3 text-center">No</td>
                <td class="px-5 py-3 text-center">Capped</td>
              </tr>
              <tr>
                <td class="text-foreground px-5 py-3 font-medium">RBAC</td>
                <td class="px-5 py-3 text-center">3 roles</td>
                <td class="px-5 py-3 text-center">No</td>
                <td class="px-5 py-3 text-center">No</td>
                <td class="px-5 py-3 text-center">Paid tiers</td>
              </tr>
              <tr>
                <td class="text-foreground px-5 py-3 font-medium">REST API</td>
                <td class="px-5 py-3 text-center">17+ endpoints</td>
                <td class="px-5 py-3 text-center">Read-only</td>
                <td class="px-5 py-3 text-center">Yes</td>
                <td class="px-5 py-3 text-center">Yes</td>
              </tr>
              <tr>
                <td class="text-foreground px-5 py-3 font-medium">Cost</td>
                <td class="text-primary px-5 py-3 text-center font-semibold">Free</td>
                <td class="px-5 py-3 text-center">Free</td>
                <td class="px-5 py-3 text-center">Free</td>
                <td class="px-5 py-3 text-center">$29–1,499/mo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-12 text-center">
        <a href={getHref("/docs/v4/guides/comparison")} class="cta-pill-primary group inline-flex">
          <GitCompareArrows class="h-3.5 w-3.5" />
          <span class="font-body text-sm font-semibold tracking-tight">View full comparison</span>
          <span class="cta-pill-icon">
            <ArrowRight
              class="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px"
            />
          </span>
        </a>
      </div>
    </div>
  </section>

  <!-- CTA Banner -->
  <section class="mt-20 px-4 pb-16 md:px-6">
    <div class="mx-auto max-w-[1200px]">
      <div class="cta-banner-outer">
        <div class="cta-banner-inner relative overflow-hidden">
          <div class="cta-banner-bg"></div>
          <div class="relative z-10 flex flex-col items-center justify-between gap-8 md:flex-row">
            <div>
              <h2 class="font-display text-foreground mb-3 text-xl font-bold tracking-tight md:text-2xl">
                Star Kener on GitHub
              </h2>
              <p class="font-body text-muted-foreground text-sm leading-relaxed font-light">
                Join the open-source community. Contribute features, report issues, and help build the best free status
                page platform.
              </p>
            </div>
            <a
              href="https://github.com/rajnandan1/kener"
              target="_blank"
              rel="noopener noreferrer"
              class="cta-github-pill group shrink-0"
            >
              <Github class="h-4 w-4" />
              <span class="font-body text-sm font-semibold tracking-tight">Star on GitHub</span>
              <span class="cta-github-icon">
                <ArrowRight
                  class="h-3 w-3 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px"
                />
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="px-4 py-10 md:px-6 md:py-12">
    <div class="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 md:flex-row">
      <p class="font-body text-muted-foreground text-sm font-light tracking-tight">Built with care by the Kener team</p>
      {#if data.config.footerLinks}
        <div class="flex flex-wrap items-center justify-center gap-6">
          {#each data.config.footerLinks as link (link.url)}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground text-sm font-medium tracking-tight transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
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
    font-family: "Bodoni Moda", serif;
  }
  .docs-landing :global(.font-body) {
    font-family:
      "Plus Jakarta Sans",
      system-ui,
      -apple-system,
      sans-serif;
  }

  /* ===== Eyebrow Tag ===== */
  .eyebrow-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 9999px;
    padding: 0.375rem 1rem;
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted-foreground);
    background: color-mix(in oklch, var(--foreground) 4%, transparent);
    border: 1px solid color-mix(in oklch, var(--foreground) 8%, transparent);
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
  }

  /* ===== Entrance Animations ===== */
  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(28px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fade-up {
    opacity: 0;
    animation: fadeUp 0.9s cubic-bezier(0.32, 0.72, 0, 1) forwards;
  }

  /* ===== Floating Nav Pill ===== */
  .nav-pill-inner {
    background: color-mix(in oklch, var(--background) 70%, transparent);
    backdrop-filter: blur(24px) saturate(1.6);
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    border: 1px solid color-mix(in oklch, var(--foreground) 8%, transparent);
    box-shadow:
      0 0 0 0.5px color-mix(in oklch, var(--foreground) 4%, transparent),
      0 8px 40px color-mix(in oklch, var(--background) 60%, transparent);
  }

  /* ===== Hero Section ===== */
  .hero-section {
    position: relative;
    background: var(--background);
  }

  .hero-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.4;
    animation: orbFloat 16s ease-in-out infinite;
    will-change: transform;
  }

  .hero-orb-1 {
    width: 600px;
    height: 600px;
    top: -15%;
    right: -8%;
    background: color-mix(in oklch, var(--primary) 20%, transparent);
  }

  .hero-orb-2 {
    width: 400px;
    height: 400px;
    top: 45%;
    left: -10%;
    background: color-mix(in oklch, var(--primary) 12%, transparent);
    animation-delay: -5s;
  }

  .hero-orb-3 {
    width: 300px;
    height: 300px;
    bottom: 5%;
    right: 15%;
    background: color-mix(in oklch, var(--primary) 10%, transparent);
    animation-delay: -10s;
  }

  @keyframes orbFloat {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(25px, -35px) scale(1.06);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.94);
    }
  }

  /* Grain — fixed, pointer-events-none */
  .grain-overlay {
    position: fixed;
    inset: 0;
    opacity: 0.025;
    pointer-events: none;
    z-index: 50;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 200px 200px;
  }

  :global(.dark) .grain-overlay {
    opacity: 0.035;
  }

  .hero-gradient-text {
    background: linear-gradient(135deg, var(--primary) 0%, color-mix(in oklch, var(--primary) 50%, transparent) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ===== Pill CTA Buttons ===== */
  .cta-pill-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: 9999px;
    padding: 0.625rem 0.625rem 0.625rem 1.5rem;
    background: var(--primary);
    color: var(--primary-foreground);
    box-shadow:
      0 1px 3px color-mix(in oklch, var(--primary) 25%, transparent),
      0 6px 24px color-mix(in oklch, var(--primary) 12%, transparent);
    transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .cta-pill-primary:hover {
    box-shadow:
      0 1px 3px color-mix(in oklch, var(--primary) 35%, transparent),
      0 10px 36px color-mix(in oklch, var(--primary) 20%, transparent);
    transform: translateY(-1px);
  }

  .cta-pill-primary:active {
    transform: scale(0.98);
  }

  .cta-pill-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 9999px;
    background: color-mix(in oklch, var(--primary-foreground) 15%, transparent);
  }

  .cta-pill-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 9999px;
    padding: 0.75rem 1.75rem;
    background: transparent;
    color: var(--foreground);
    border: 1px solid color-mix(in oklch, var(--foreground) 12%, transparent);
    transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .cta-pill-secondary:hover {
    border-color: color-mix(in oklch, var(--foreground) 20%, transparent);
    background: color-mix(in oklch, var(--foreground) 3%, transparent);
  }

  .cta-pill-secondary:active {
    transform: scale(0.98);
  }

  /* ===== Double-Bezel Hero Image ===== */
  .hero-bezel-outer {
    position: relative;
    padding: 0.5rem;
    border-radius: 1.5rem;
    background: color-mix(in oklch, var(--foreground) 4%, transparent);
    border: 1px solid color-mix(in oklch, var(--foreground) 6%, transparent);
  }

  .hero-bezel-inner {
    overflow: hidden;
    border-radius: calc(1.5rem - 0.375rem);
    border: 1px solid color-mix(in oklch, var(--foreground) 8%, transparent);
    box-shadow:
      inset 0 1px 1px color-mix(in oklch, white 8%, transparent),
      0 12px 48px color-mix(in oklch, var(--background) 50%, transparent);
  }

  /* ===== Bento Feature Grid ===== */
  .bento-features {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  @media (min-width: 640px) {
    .bento-features {
      grid-template-columns: repeat(2, 1fr);
    }
    /* First two cards span wider to break the equal-3 monotony */
    .bento-features .bento-item:nth-child(1),
    .bento-features .bento-item:nth-child(2) {
      grid-column: span 1;
    }
  }

  @media (min-width: 1024px) {
    .bento-features {
      grid-template-columns: 3fr 2fr 2fr;
    }
    /* First card takes the wide column */
    .bento-features .bento-item:nth-child(1) {
      grid-column: span 1;
    }
    /* Row 2: two wide + one narrow */
    .bento-features .bento-item:nth-child(4) {
      grid-column: 1 / span 2;
    }
    /* Row 4: one narrow + two wide */
    .bento-features .bento-item:nth-child(9) {
      grid-column: span 1;
    }
    .bento-features .bento-item:nth-child(10) {
      grid-column: 2 / span 2;
    }
  }

  /* ===== Feature Cards (Double-Bezel) ===== */
  .feature-bezel-outer {
    padding: 0.25rem;
    border-radius: 1.25rem;
    background: color-mix(in oklch, var(--foreground) 3%, transparent);
    border: 1px solid color-mix(in oklch, var(--foreground) 5%, transparent);
    cursor: default;
    transition:
      border-color 0.6s cubic-bezier(0.32, 0.72, 0, 1),
      box-shadow 0.6s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .feature-bezel-outer:hover {
    border-color: color-mix(in oklch, var(--primary) 20%, transparent);
    box-shadow: 0 8px 40px color-mix(in oklch, var(--primary) 5%, transparent);
  }

  .feature-bezel-inner {
    padding: 1.5rem;
    border-radius: calc(1.25rem - 0.1875rem);
    background: var(--card);
    border: 1px solid color-mix(in oklch, var(--border) 40%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in oklch, white 5%, transparent);
    transition: border-color 0.6s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .feature-bezel-outer:hover .feature-bezel-inner {
    border-color: color-mix(in oklch, var(--primary) 15%, transparent);
  }

  .feature-icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
    background: color-mix(in oklch, var(--primary) 8%, transparent);
    color: var(--primary);
    transition:
      background 0.6s cubic-bezier(0.32, 0.72, 0, 1),
      transform 0.6s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .feature-bezel-outer:hover .feature-icon-wrapper {
    background: color-mix(in oklch, var(--primary) 14%, transparent);
    transform: scale(1.06);
  }

  /* ===== Advanced Cards (Double-Bezel) ===== */
  .advanced-bezel-outer {
    padding: 0.25rem;
    border-radius: 1.25rem;
    background: color-mix(in oklch, var(--foreground) 2%, transparent);
    border: 1px solid color-mix(in oklch, var(--foreground) 4%, transparent);
    cursor: default;
    transition: all 0.6s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .advanced-bezel-outer:hover {
    border-color: color-mix(in oklch, var(--primary) 18%, transparent);
  }

  .advanced-bezel-inner {
    padding: 1.5rem;
    border-radius: calc(1.25rem - 0.1875rem);
    background: var(--background);
    border: 1px solid color-mix(in oklch, var(--border) 30%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in oklch, white 4%, transparent);
    transition: all 0.6s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .advanced-bezel-outer:hover .advanced-bezel-inner {
    border-color: color-mix(in oklch, var(--primary) 12%, transparent);
  }

  /* ===== Section Accent ===== */
  .section-accent-bg {
    position: absolute;
    inset: 0;
    background: color-mix(in oklch, var(--muted) 25%, transparent);
  }

  /* ===== Topic Cards (Double-Bezel) ===== */
  .topic-bezel-outer {
    padding: 0.25rem;
    border-radius: 1.25rem;
    background: color-mix(in oklch, var(--foreground) 2%, transparent);
    border: 1px solid color-mix(in oklch, var(--foreground) 5%, transparent);
    transition: all 0.6s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .topic-bezel-outer:hover {
    border-color: color-mix(in oklch, var(--foreground) 10%, transparent);
  }

  .topic-bezel-inner {
    padding: 1.5rem;
    border-radius: calc(1.25rem - 0.1875rem);
    background: color-mix(in oklch, var(--card) 60%, transparent);
    border: 1px solid color-mix(in oklch, var(--border) 30%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in oklch, white 3%, transparent);
    transition: all 0.6s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .topic-bezel-outer:hover .topic-bezel-inner {
    background: var(--card);
  }

  /* ===== Comparison Table (Double-Bezel) ===== */
  .comparison-bezel-outer {
    padding: 0.375rem;
    border-radius: 1.5rem;
    background: color-mix(in oklch, var(--foreground) 3%, transparent);
    border: 1px solid color-mix(in oklch, var(--foreground) 6%, transparent);
  }

  .comparison-bezel-inner {
    border-radius: calc(1.5rem - 0.25rem);
    background: var(--card);
    border: 1px solid color-mix(in oklch, var(--border) 40%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in oklch, white 5%, transparent);
    padding: 0.25rem;
  }

  .comparison-table {
    border-collapse: separate;
    border-spacing: 0;
  }

  .comparison-table th {
    border-bottom: 1px solid color-mix(in oklch, var(--border) 50%, transparent);
  }

  .comparison-table tbody tr {
    transition: background 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .comparison-table tbody tr:hover {
    background: color-mix(in oklch, var(--muted) 35%, transparent);
  }

  .comparison-table tbody td {
    border-bottom: 1px solid color-mix(in oklch, var(--border) 20%, transparent);
    color: var(--muted-foreground);
  }

  .comparison-table tbody tr:last-child td {
    border-bottom: none;
  }

  /* ===== CTA Banner (Double-Bezel) ===== */
  .cta-banner-outer {
    padding: 0.375rem;
    border-radius: 2rem;
    background: color-mix(in oklch, var(--foreground) 3%, transparent);
    border: 1px solid color-mix(in oklch, var(--foreground) 6%, transparent);
  }

  .cta-banner-inner {
    padding: 2.5rem;
    border-radius: calc(2rem - 0.25rem);
    background: var(--card);
    border: 1px solid color-mix(in oklch, var(--border) 40%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in oklch, white 5%, transparent);
  }

  @media (min-width: 768px) {
    .cta-banner-inner {
      padding: 3rem 3.5rem;
    }
  }

  .cta-banner-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 15% 50%, color-mix(in oklch, var(--primary) 5%, transparent) 0%, transparent 50%),
      radial-gradient(ellipse at 85% 50%, color-mix(in oklch, var(--primary) 3%, transparent) 0%, transparent 50%);
    border-radius: inherit;
  }

  .cta-github-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: 9999px;
    padding: 0.625rem 0.625rem 0.625rem 1.25rem;
    background: var(--foreground);
    color: var(--background);
    transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .cta-github-pill:hover {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 6px 24px color-mix(in oklch, var(--foreground) 15%, transparent);
  }

  .cta-github-pill:active {
    transform: scale(0.98);
  }

  .cta-github-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 9999px;
    background: color-mix(in oklch, var(--background) 15%, transparent);
  }

  /* ===== Dark mode ===== */
  :global(.dark) .hero-orb {
    opacity: 0.2;
  }

  :global(.dark) .feature-bezel-outer:hover {
    box-shadow: 0 8px 40px color-mix(in oklch, var(--primary) 3%, transparent);
  }

  :global(.dark) .nav-pill-inner {
    background: color-mix(in oklch, var(--background) 60%, transparent);
  }
</style>
