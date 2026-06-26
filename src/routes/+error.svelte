<script lang="ts">
  import { page } from "$app/state";

  // This boundary renders when a route group's layout load fails (e.g. the
  // database is unreachable), so it must not depend on app CSS or any server
  // data — everything here is self-contained.
  const isServerFailure = $derived(page.status >= 500);
</script>

<svelte:head>
  <title>{page.status} — {isServerFailure ? "Status page temporarily unavailable" : "Something went wrong"}</title>
  {#if isServerFailure}
    <meta http-equiv="refresh" content="30" />
  {/if}
</svelte:head>

<div class="error-wrap">
  <div class="error-card">
    {#if isServerFailure}
      <h1>This status page is temporarily unavailable</h1>
      <p>We are having trouble serving this page right now. It usually resolves on its own.</p>
      <p>This page will retry automatically in 30 seconds.</p>
    {:else}
      <h1>Something went wrong</h1>
      <p>{page.error?.message || "The page you requested could not be loaded."}</p>
    {/if}
    <div class="error-code">{page.status}</div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
  }
  .error-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    color: #09090b;
    font-family:
      ui-sans-serif,
      system-ui,
      -apple-system,
      "Segoe UI",
      Roboto,
      sans-serif;
  }
  .error-card {
    max-width: 28rem;
    margin: 1rem;
    padding: 2rem;
    border: 1px solid #e4e4e7;
    border-radius: 1rem;
    text-align: center;
  }
  h1 {
    font-size: 1.25rem;
    margin: 0 0 0.5rem;
  }
  p {
    color: #71717a;
    font-size: 0.875rem;
    line-height: 1.5;
    margin: 0.25rem 0;
  }
  .error-code {
    color: #71717a;
    font-size: 0.75rem;
    margin-top: 1.25rem;
  }
  @media (prefers-color-scheme: dark) {
    .error-wrap {
      background: #09090b;
      color: #fafafa;
    }
    .error-card {
      border-color: #27272a;
    }
    p,
    .error-code {
      color: #a1a1aa;
    }
  }
</style>
