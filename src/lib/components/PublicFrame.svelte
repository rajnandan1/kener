<script lang="ts">
  import bannerImage from "$lib/assets/banner.png";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import type { Snippet } from "svelte";

  interface Props {
    children?: Snippet;
    footerHTML?: string;
  }

  let { children, footerHTML = "" }: Props = $props();

  const year = new Date().getFullYear();
</script>

<div class="kracking-public-shell dark min-h-screen bg-zinc-950 text-zinc-50">
  <div class="mx-auto flex min-h-screen w-full max-w-[1126px] flex-col">
    <section class="flex flex-1 flex-col px-6 py-6 md:px-10 md:py-8">
      <div class="mx-auto flex w-full max-w-5xl items-center justify-start">
        <a href={clientResolver(resolve, "/")} class="flex items-center gap-3">
          <img
            src={bannerImage}
            alt="Kracking"
            class="h-9 w-auto object-contain md:h-10"
            fetchpriority="high"
            decoding="async"
          />
        </a>
      </div>

      <div class="mt-8 flex flex-1 flex-col px-0 py-6 md:py-8">
        <div class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
          {@render children?.()}
        </div>
      </div>
    </section>

    <footer class="border-t border-zinc-900 px-6 py-8 md:px-10">
      {#if footerHTML}
        <div class="flex justify-center text-center text-sm text-zinc-500 [&>*]:mx-auto [&_a]:text-zinc-300 [&_a]:underline [&_a]:underline-offset-4">
          {@html footerHTML}
        </div>
      {:else}
        <div class="flex justify-center text-center text-sm text-zinc-500">
          <p>&copy; {year} Kracking Technologies LLC. All rights reserved.</p>
        </div>
      {/if}
    </footer>
  </div>
</div>
