<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
  }

  let { children }: Props = $props();
</script>

<svelte:head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://saki-production.up.railway.app/googletagmanager/gtag/js?id=G-Q3MLRXCBFT"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    gtag("js", new Date());

    gtag("config", "G-Q3MLRXCBFT", { transport_url: "https://saki-production.up.railway.app/google-analytics" });
  </script>
</svelte:head>

{@render children()}
