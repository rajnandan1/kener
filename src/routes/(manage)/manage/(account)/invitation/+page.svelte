<script>
  import { Button } from "$lib/components/ui/button";
  import { base } from "$app/paths";

  export let data;
</script>

<svelte:head>
  <title>Accept Invitation from Kener</title>
</svelte:head>
<div class="mx-auto mt-32 flex max-w-[475px] flex-col gap-y-4 text-center">
  {#if data.error}
    <picture class="mx-auto">
      <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f6a8/512.webp" type="image/webp" />
      <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f6a8/512.gif" alt="🚨" width="32" height="32" />
    </picture>
  {:else}
    <picture class="mx-auto">
      <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f38a/512.webp" type="image/webp" />
      <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f38a/512.gif" alt="🎊" width="32" height="32" />
    </picture>
  {/if}
  <h2 class="text-xl">
    {data.header}
  </h2>
  <p class="text-sm">
    {data.message}
  </p>
  {#if data.error}
    <Button href="{base}/" class="mt-4 ">Go back</Button>
  {:else}
    <Button href="{base}/manage/app/site" class="mt-4 ">Go to Dashboard</Button>
  {/if}
</div>
