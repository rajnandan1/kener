<script lang="ts">
  import type { DocsConfig, DocsPage } from "$lib/types/docs";
  import { base, resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import Github from "@lucide/svelte/icons/github";
  import Moon from "@lucide/svelte/icons/moon";
  import Sun from "@lucide/svelte/icons/sun";
  import { toggleMode, mode } from "mode-watcher";
  import LandingStatusDemo from "./LandingStatusDemo.svelte";

  interface Props {
    data: {
      config: DocsConfig;
    };
  }

  interface FeatureCard {
    title: string;
    description: string;
    href?: string;
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
      title: "11 Monitor Types",
      description:
        "Track API, Ping, TCP, DNS, SSL, SQL, Heartbeat, GameDig, and gRPC services with configurable check intervals and thresholds.",
      href: "/docs/monitors/overview"
    },
    {
      title: "Incident Management",
      description: "Create transparent incident timelines with updates, acknowledgements, and clear communication.",
      href: "/docs/incidents/overview"
    },
    {
      title: "Smart Notifications",
      description: "Notify subscribers via email, webhooks, Slack, and Discord with trigger-based workflows.",
      href: "/docs/alerting/overview"
    },
    {
      title: "Maintenance Scheduling",
      description: "Plan recurring maintenance windows and keep customers informed before, during, and after.",
      href: "/docs/maintenances/overview"
    },
    {
      title: "Multi-user Collaboration",
      description: "Invite your team with role-based access to monitors, incidents, and configuration workflows.",
      href: "/docs/user-management"
    },
    {
      title: "Multi-page Status Dashboard",
      description:
        "Run multiple branded status pages from a single self-hosted Kener instance: one per product, team, or region.",
      href: "/docs/pages"
    },
    {
      title: "Complete API Access",
      description: "Automate incidents, monitor operations, and reporting with the full REST API.",
      href: "/docs/spec/v4/"
    },
    {
      title: "21 Languages & i18n",
      description:
        "Built-in localization with 21 languages, timezone-aware display, and SEO-friendly pages for global audiences.",
      href: "/docs/internationalization"
    },
    {
      title: "Customization & Branding",
      description: "Customize logo, colors, CSS, and theme behavior to match your product identity.",
      href: "/docs/setup/customizations"
    },
    {
      title: "Dark Mode Ready",
      description: "Built-in theme switching and excellent readability in both light and dark environments."
    },
    {
      title: "Embeddable Widgets & Badges",
      description: "Embed status cards and badges into your website, app, or support portal.",
      href: "/docs/sharing"
    },
    {
      title: "Analytics Ready",
      description: "Connect external analytics providers and understand how users interact with status updates."
    }
  ];

  const advancedFeatures: FeatureCard[] = [
    {
      title: "Vault & Secret Management",
      description: "Securely store sensitive keys and credentials for integrations and monitor workflows."
    },
    {
      title: "Monitoring Data Explorer",
      description: "Inspect historical checks, drill into failures, and analyze uptime trends from one place."
    },
    {
      title: "Trigger System",
      description: "Create smart trigger conditions to route alerts and automate operational notifications."
    },
    {
      title: "Template-driven Messaging",
      description: "Standardize incident and notification communication with reusable templates."
    },
    {
      title: "API Key Management",
      description: "Issue and revoke API keys for secure automation and third-party integrations."
    },
    {
      title: "Analytics Provider Integrations",
      description: "Plug in providers like GA, Plausible, Mixpanel, Umami, Clarity, and more."
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

  const comparisonRows: { feature: string; kener: string; others: [string, string, string] }[] = [
    { feature: "Self-hosted", kener: "Yes", others: ["GitHub only", "Yes", "No"] },
    { feature: "Monitor types", kener: "11", others: ["1", "10+", "External"] },
    { feature: "Incident management", kener: "Full lifecycle", others: ["GitHub Issues", "No", "Yes"] },
    { feature: "Recurring maintenance", kener: "RRULE", others: ["Basic", "Basic", "Basic"] },
    { feature: "Subscriber notifications", kener: "Unlimited", others: ["No", "No", "Capped"] },
    { feature: "RBAC", kener: "3 roles", others: ["No", "No", "Paid tiers"] },
    { feature: "REST API", kener: "17+ endpoints", others: ["Read-only", "Yes", "Yes"] },
    { feature: "Cost", kener: "Free", others: ["Free", "Free", "$29–1,499/mo"] }
  ];
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
  <link rel="icon" href={clientResolver(resolve, data.config.favicon)} />
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
  <!-- Utility bar -->
  <header class="border-border/60 bg-background fixed top-0 right-0 left-0 z-40 border-b">
    <div class="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-5 md:px-8">
      <a href={getHref("/docs")} class="text-foreground group flex items-center gap-2.5 no-underline">
        <img src="{base}/logo96.png" alt="" class="h-6 w-6 rounded-md" />
        <span class="text-[15px] font-semibold tracking-tight">{data.config.name}</span>
      </a>
      <div class="flex items-center gap-1">
        {#if data.config.footerLinks}
          {#each data.config.footerLinks.slice(0, 3) as link (link.url)}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground hover:bg-foreground/5 hidden rounded-md px-3 py-1.5 text-[13px] font-medium tracking-tight transition-colors duration-300 sm:inline-flex"
            >
              {link.name}
            </a>
          {/each}
        {/if}
        <button
          onclick={toggleMode}
          aria-label="Toggle theme"
          class="text-muted-foreground hover:text-foreground hover:bg-foreground/5 inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-300"
        >
          {#if mode.current === "dark"}
            <Sun class="h-4 w-4" />
          {:else}
            <Moon class="h-4 w-4" />
          {/if}
        </button>
      </div>
    </div>
  </header>

  <!-- Hero: the page opens as a working monitor -->
  <section class="px-5 pt-28 md:px-8 md:pt-36">
    <div class="mx-auto max-w-[1080px]">
      <div class="fade-up">
        <LandingStatusDemo />
      </div>

      <h1
        class="fade-up font-display text-foreground mt-14 text-4xl leading-[1.06] font-semibold tracking-tight text-balance md:mt-16 md:text-6xl md:text-wrap lg:text-[4.5rem]"
        style="animation-delay: 100ms"
      >
        Open source status page
        <br class="hidden md:inline" />you can <em>self-host</em>
      </h1>

      <p
        class="fade-up text-muted-foreground mt-6 max-w-[62ch] text-base leading-[1.7] md:text-lg"
        style="animation-delay: 200ms"
      >
        Kener is a free, open-source status page and uptime monitor. Deploy with Docker in under 2 minutes. Track 11
        service types, manage incidents, schedule maintenance, and notify subscribers, all from one platform.
      </p>

      <div class="fade-up mt-10 flex flex-wrap items-center gap-4" style="animation-delay: 300ms">
        {#each getCtaButtons() as button (button.title)}
          {#if button.primary}
            <a href={getHref(button.href)} class="cta-pill-primary group" rel="external">
              <span class="text-sm font-semibold tracking-tight">{button.title}</span>
              <span class="cta-pill-icon">
                <ArrowRight
                  class="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-px"
                />
              </span>
            </a>
          {:else}
            <a href={getHref(button.href)} class="cta-pill-secondary" rel="external">
              <span class="text-sm font-medium tracking-tight">{button.title}</span>
            </a>
          {/if}
        {/each}

        <div class="flex items-center gap-3 sm:ml-auto">
          <a
            href="https://railway.com/deploy/spSvic?referralCode=1Pn7vs&utm_medium=integration&utm_source=template&utm_campaign=generic"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-transform duration-300 hover:scale-105"
          >
            <img src="https://railway.com/button.svg" alt="Deploy on Railway" class="h-8" />
          </a>
          <a
            href="https://zeabur.com/templates/1YRTMI?referralCode=rajnandan1"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-transform duration-300 hover:scale-105"
          >
            <img src="https://zeabur.com/button.svg" alt="Deploy on Zeabur" class="h-8" />
          </a>
        </div>
      </div>

      <!-- The real thing, framed as the page your users will see -->
      <div class="fade-up mt-20" style="animation-delay: 400ms">
        <div class="shot-window">
          <div class="shot-bar">
            <span class="shot-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="shot-url">status.your-company.com</span>
          </div>
          <img
            src="{base}/xt_white.webp"
            alt="Kener open source status page dashboard: uptime monitoring, incident management, and Docker deployment"
            class="bg-muted h-auto w-full object-cover dark:hidden"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            width="2062"
            height="1146"
          />
          <img
            src="{base}/xt_black.webp"
            alt="Kener open source status page dashboard: uptime monitoring, incident management, and Docker deployment"
            class="bg-muted hidden h-auto w-full object-cover dark:block"
            loading="eager"
            decoding="async"
            width="2056"
            height="1138"
          />
        </div>
      </div>
    </div>
  </section>

  <!-- Monitors: core features as monitor rows -->
  <section class="px-5 pt-24 md:px-8 md:pt-32">
    <div class="mx-auto max-w-[1080px]">
      <div class="rail">
        <h2 class="rail-title">Status page monitoring features</h2>
        <span class="rail-rule" aria-hidden="true"></span>
        <span class="rail-meta"><span class="rail-meta-dot" aria-hidden="true"></span>12 / 12 operational</span>
      </div>
      <p class="text-muted-foreground mt-4 max-w-[65ch] text-sm leading-[1.7]">
        From uptime monitoring to incident management: everything you need to run a production status page.
      </p>

      <div class="rows mt-10">
        {#each coreFeatures as feature (feature.title)}
          {#if feature.href}
            <a href={getHref(feature.href)} class="row group">
              <span class="row-dot" aria-hidden="true"></span>
              <span class="row-title">{feature.title}</span>
              <span class="row-desc">{feature.description}</span>
              <span class="row-action">
                Docs
                <ArrowRight
                  class="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-safe:group-hover:translate-x-0.5"
                />
              </span>
            </a>
          {:else}
            <div class="row">
              <span class="row-dot" aria-hidden="true"></span>
              <span class="row-title">{feature.title}</span>
              <span class="row-desc">{feature.description}</span>
              <span class="row-action"></span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </section>

  <!-- Advanced: a second monitor group -->
  <section class="px-5 pt-24 md:px-8 md:pt-32">
    <div class="mx-auto max-w-[1080px]">
      <div class="rail">
        <h2 class="rail-title">Advanced ops &amp; admin tools</h2>
        <span class="rail-rule" aria-hidden="true"></span>
        <span class="rail-meta">admin</span>
      </div>
      <p class="text-muted-foreground mt-4 max-w-[65ch] text-sm leading-[1.7]">
        Self-hosted status page with deep operational tooling: secrets vault, triggers, API keys, and analytics.
      </p>

      <div class="rows mt-10">
        {#each advancedFeatures as feature (feature.title)}
          <div class="row">
            <span class="row-dot" aria-hidden="true"></span>
            <span class="row-title">{feature.title}</span>
            <span class="row-desc">{feature.description}</span>
            <span class="row-action"></span>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Documentation index -->
  <section class="px-5 pt-24 md:px-8 md:pt-32">
    <div class="mx-auto max-w-[1080px]">
      <div class="rail">
        <h2 class="rail-title">Kener documentation</h2>
        <span class="rail-rule" aria-hidden="true"></span>
        <span class="rail-meta">guides &amp; reference</span>
      </div>
      <p class="text-muted-foreground mt-4 max-w-[65ch] text-sm leading-[1.7]">
        Guides for Docker deployment, monitor configuration, incident workflows, and API integration.
      </p>

      <div class="mt-10 grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {#each getGroupHighlights() as group (group.group)}
          <div>
            <h3 class="text-foreground text-sm font-semibold tracking-tight">{group.group}</h3>
            <ul class="mt-3 space-y-1">
              {#each group.pages as page (page.slug)}
                <li>
                  <a
                    href={getHref(`/docs/${page.slug}`)}
                    class="text-muted-foreground hover:text-primary group flex items-center justify-between gap-3 border-b border-transparent py-1.5 text-sm transition-colors duration-300"
                  >
                    <span>{page.title}</span>
                    <ArrowRight
                      class="h-3.5 w-3.5 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-60"
                    />
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Comparison -->
  <section class="px-5 pt-24 md:px-8 md:pt-32">
    <div class="mx-auto max-w-[1080px]">
      <div class="rail">
        <h2 class="rail-title">How Kener compares</h2>
        <span class="rail-rule" aria-hidden="true"></span>
        <span class="rail-meta">4 tools</span>
      </div>
      <p class="text-muted-foreground mt-4 max-w-[65ch] text-sm leading-[1.7]">
        See how Kener stacks up against popular open-source and SaaS status page tools.
      </p>

      <div class="mt-10 overflow-x-auto">
        <table class="cmp-table w-full text-sm">
          <thead>
            <tr>
              <th class="cmp-feature">Feature</th>
              <th class="cmp-kener">Kener</th>
              <th>Upptime</th>
              <th>Uptime Kuma</th>
              <th>Statuspage</th>
            </tr>
          </thead>
          <tbody>
            {#each comparisonRows as row (row.feature)}
              <tr>
                <td class="cmp-feature">{row.feature}</td>
                <td class="cmp-kener">{row.kener}</td>
                {#each row.others as value, i (i)}
                  <td>{value}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <div class="mt-10">
        <a href={getHref("/docs/guides/comparison")} class="cta-pill-secondary group inline-flex">
          <span class="text-sm font-medium tracking-tight">View full comparison</span>
          <ArrowRight
            class="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-safe:group-hover:translate-x-0.5"
          />
        </a>
      </div>
    </div>
  </section>

  <!-- GitHub: subscribe to the project -->
  <section class="px-5 pt-24 pb-8 md:px-8 md:pt-32">
    <div class="mx-auto max-w-[1080px]">
      <div class="gh-panel md:flex md:items-center md:justify-between md:gap-10">
        <div>
          <h2 class="text-foreground text-xl font-semibold tracking-tight">Star Kener on GitHub</h2>
          <p class="text-muted-foreground mt-2 max-w-[58ch] text-sm leading-[1.65]">
            Join the open-source community. Contribute features, report issues, and help build the best free status page
            platform.
          </p>
        </div>
        <a
          href="https://github.com/rajnandan1/kener"
          target="_blank"
          rel="noopener noreferrer"
          class="cta-github-pill group mt-6 shrink-0 md:mt-0"
        >
          <Github class="h-4 w-4" />
          <span class="text-sm font-semibold tracking-tight">Star on GitHub</span>
          <span class="cta-github-icon">
            <ArrowRight
              class="h-3 w-3 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-px"
            />
          </span>
        </a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-border/60 mt-16 border-t px-5 py-10 md:px-8">
    <div class="mx-auto flex max-w-[1080px] flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <p class="text-muted-foreground text-sm tracking-tight">Free and open source, MIT licensed.</p>
      {#if data.config.footerLinks}
        <div class="flex flex-wrap items-center gap-6">
          {#each data.config.footerLinks as link (link.url)}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground hover:text-foreground text-sm font-medium tracking-tight transition-colors duration-300"
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
  /* The landing borrows the product's own grammar: monitor rows, uptime ticks,
     status dots. One family (Geist), one accent (Kener orange), green for UP. */
  .docs-landing {
    --demo-up: oklch(0.64 0.17 152);
  }

  :global(.dark) .docs-landing {
    --demo-up: oklch(0.72 0.17 152);
  }

  .docs-landing :global(.font-display) {
    font-family:
      "Geist",
      ui-sans-serif,
      system-ui,
      -apple-system,
      sans-serif;
  }

  .docs-landing h1 em {
    font-style: normal;
    color: var(--primary);
  }

  /* ===== Entrance ===== */
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
    animation: fadeUp 0.9s cubic-bezier(0.32, 0.72, 0, 1) forwards;
  }

  /* ===== Pill CTAs ===== */
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
    transition:
      box-shadow 0.5s cubic-bezier(0.32, 0.72, 0, 1),
      transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
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
    padding: 0.6875rem 1.5rem;
    background: transparent;
    color: var(--foreground);
    border: 1px solid color-mix(in oklch, var(--foreground) 14%, transparent);
    transition:
      border-color 0.5s cubic-bezier(0.32, 0.72, 0, 1),
      background 0.5s cubic-bezier(0.32, 0.72, 0, 1),
      transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .cta-pill-secondary:hover {
    border-color: color-mix(in oklch, var(--foreground) 24%, transparent);
    background: color-mix(in oklch, var(--foreground) 3%, transparent);
  }

  .cta-pill-secondary:active {
    transform: scale(0.98);
  }

  /* ===== Screenshot window ===== */
  .shot-window {
    border: 1px solid color-mix(in oklch, var(--foreground) 10%, transparent);
    border-radius: calc(var(--radius) + 6px);
    overflow: hidden;
    background: var(--card);
    box-shadow: 0 16px 48px color-mix(in oklch, var(--foreground) 6%, transparent);
  }

  .shot-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    height: 2.25rem;
    padding: 0 1rem;
    border-bottom: 1px solid color-mix(in oklch, var(--foreground) 8%, transparent);
  }

  .shot-dots {
    display: inline-flex;
    gap: 5px;
  }

  .shot-dots i {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: color-mix(in oklch, var(--foreground) 14%, transparent);
  }

  .shot-url {
    font-family: "Geist Mono", ui-monospace, monospace;
    font-size: 0.6875rem;
    color: var(--muted-foreground);
  }

  /* ===== Section rails ===== */
  .rail {
    display: flex;
    align-items: baseline;
    gap: 1rem;
  }

  .rail-title {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--foreground);
    white-space: nowrap;
  }

  .rail-rule {
    flex: 1;
    border-top: 1px solid color-mix(in oklch, var(--foreground) 10%, transparent);
    transform: translateY(-4px);
  }

  .rail-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: "Geist Mono", ui-monospace, monospace;
    font-size: 0.6875rem;
    letter-spacing: 0.05em;
    color: var(--muted-foreground);
    white-space: nowrap;
  }

  .rail-meta-dot {
    width: 0.4375rem;
    height: 0.4375rem;
    border-radius: 9999px;
    background: var(--demo-up);
  }

  @media (max-width: 560px) {
    .rail-title {
      white-space: normal;
    }
    .rail-rule {
      display: none;
    }
    .rail {
      justify-content: space-between;
    }
  }

  /* ===== Monitor rows ===== */
  .rows {
    border-top: 1px solid color-mix(in oklch, var(--foreground) 9%, transparent);
  }

  .row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    column-gap: 0.875rem;
    row-gap: 0.25rem;
    align-items: baseline;
    padding: 1rem 0.625rem;
    border-bottom: 1px solid color-mix(in oklch, var(--foreground) 7%, transparent);
    text-decoration: none;
    transition: background 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  }

  a.row:hover {
    background: color-mix(in oklch, var(--foreground) 2.5%, transparent);
  }

  .row-dot {
    width: 0.4375rem;
    height: 0.4375rem;
    border-radius: 9999px;
    background: var(--demo-up);
    transform: translateY(-1px);
  }

  a.row:hover .row-dot {
    box-shadow: 0 0 0 4px color-mix(in oklch, var(--demo-up) 18%, transparent);
  }

  .row-title {
    font-size: 0.9375rem;
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--foreground);
  }

  .row-desc {
    grid-column: 2 / -1;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--muted-foreground);
    max-width: 72ch;
  }

  .row-action {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--muted-foreground);
    transition: color 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }

  a.row:hover .row-action {
    color: var(--primary);
  }

  @media (min-width: 1024px) {
    .row {
      grid-template-columns: auto minmax(230px, 280px) 1fr auto;
      align-items: baseline;
    }
    .row-desc {
      grid-column: auto;
    }
  }

  /* ===== Comparison table ===== */
  .cmp-table {
    border-collapse: separate;
    border-spacing: 0;
    font-variant-numeric: tabular-nums;
  }

  .cmp-table th {
    padding: 0.75rem 1rem;
    text-align: center;
    font-size: 0.8125rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--muted-foreground);
    border-bottom: 1px solid color-mix(in oklch, var(--foreground) 12%, transparent);
    white-space: nowrap;
  }

  .cmp-table td {
    padding: 0.75rem 1rem;
    text-align: center;
    color: var(--muted-foreground);
    border-bottom: 1px solid color-mix(in oklch, var(--foreground) 6%, transparent);
  }

  .cmp-table .cmp-feature {
    text-align: left;
    color: var(--foreground);
    font-weight: 500;
    padding-left: 0.625rem;
  }

  .cmp-table th.cmp-feature {
    color: var(--foreground);
  }

  .cmp-table .cmp-kener {
    color: var(--primary);
    font-weight: 600;
    background: color-mix(in oklch, var(--primary) 4%, transparent);
  }

  .cmp-table th.cmp-kener {
    color: var(--primary);
  }

  .cmp-table tbody tr:last-child td {
    border-bottom: none;
  }

  .cmp-table tbody tr {
    transition: background 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  }

  .cmp-table tbody tr:hover {
    background: color-mix(in oklch, var(--foreground) 2%, transparent);
  }

  /* ===== GitHub panel ===== */
  .gh-panel {
    border: 1px solid color-mix(in oklch, var(--primary) 22%, transparent);
    background: color-mix(in oklch, var(--primary) 4%, transparent);
    border-radius: calc(var(--radius) + 6px);
    padding: 2rem;
  }

  @media (min-width: 768px) {
    .gh-panel {
      padding: 2.5rem 3rem;
    }
  }

  .cta-github-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    border-radius: 9999px;
    padding: 0.625rem 0.625rem 0.625rem 1.25rem;
    background: var(--foreground);
    color: var(--background);
    transition:
      opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1),
      box-shadow 0.5s cubic-bezier(0.32, 0.72, 0, 1),
      transform 0.25s cubic-bezier(0.32, 0.72, 0, 1);
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

  /* ===== Focus visibility ===== */
  .docs-landing :global(:is(a, button):focus-visible) {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* ===== Reduced motion ===== */
  @media (prefers-reduced-motion: reduce) {
    .fade-up {
      animation: none;
      opacity: 1;
    }

    .cta-pill-primary:hover,
    .cta-pill-primary:active,
    .cta-pill-secondary:active,
    .cta-github-pill:hover,
    .cta-github-pill:active {
      transform: none;
    }
  }
</style>
