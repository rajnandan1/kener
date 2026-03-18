<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<svelte:head>
  <title>Kener Documentation</title>
  <!-- social preview og.jpg -->
  <meta property="og:image" content="https://kener.ing/og.jpg" />
  <meta property="og:title" content="Kener Documentation" />
  <meta
    property="og:description"
    content="Comprehensive documentation for Kener, the open-source status page system. Learn how to set up, customize, and manage your own status page with monitoring, incident management, and notifications."
  />
  <meta property="og:site_name" content="Kener" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Kener Documentation" />
  <meta
    name="twitter:description"
    content="Comprehensive documentation for Kener, the open-source status page system. Learn how to set up, customize, and manage your own status page with monitoring, incident management, and notifications."
  />
  <meta name="twitter:image" content="https://kener.ing/og.jpg" />
  <meta name="author" content="Raj Nandan Sharma" />
  <link rel="author" href="https://github.com/rajnandan1" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Kener",
        url: "https://kener.ing",
        logo: "https://kener.ing/logo96.png",
        sameAs: ["https://github.com/rajnandan1/kener"]
      },
      {
        "@type": "SoftwareApplication",
        name: "Kener",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Linux, macOS, Windows",
        url: "https://kener.ing",
        description:
          "Open-source status page system built with SvelteKit. Features real-time monitoring (API, Ping, TCP, DNS, SSL, SQL, gRPC), incident management, maintenance scheduling, notifications (email, Slack, Discord, webhooks), embeddable widgets, and a REST API.",
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
        license: "https://opensource.org/licenses/MIT",
        softwareVersion: "4.x",
        downloadUrl: "https://github.com/rajnandan1/kener",
        screenshot: "https://kener.ing/og.jpg"
      },
      {
        "@type": "WebSite",
        name: "Kener",
        url: "https://kener.ing"
      }
    ]
  })}</script>`}
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-Q3MLRXCBFT"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());

    gtag("config", "G-Q3MLRXCBFT");
  </script>
</svelte:head>

{@render children()}
