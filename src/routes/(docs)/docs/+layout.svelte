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
  <meta property="og:image" content="/og.jpg" />
  <meta property="og:title" content="Kener Documentation" />
  <meta
    property="og:description"
    content="Comprehensive documentation for Kener, the open-source status page generator. Learn how to set up, customize, and manage your own status page with Kener."
  />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Kener Documentation" />
  <meta
    name="twitter:description"
    content="Comprehensive documentation for Kener, the open-source status page generator. Learn how to set up, customize, and manage your own status page with Kener."
  />
  <meta name="twitter:image" content="/og.jpg" />
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
