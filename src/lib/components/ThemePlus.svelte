<script lang="ts">
  import { page } from "$app/state";
  import SiteBanner from "./SiteBanner.svelte";
</script>

{#if !!page.data.announcement && !!page.data.announcement.title && !!page.data.announcement.message}
  <SiteBanner announcement={page.data.announcement} />
{/if}
