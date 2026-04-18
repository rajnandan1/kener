<script lang="ts">
  // Kracking-branded banner served from the shared CDN so a brand
  // refresh is a single upload to the `kracking-assets` bucket
  // rather than another commit to this fork.
  const bannerDark = "https://cdn.krack.ing/kracking-assets/banner.png";
  const bannerLight = "https://cdn.krack.ing/kracking-assets/banner-light.png";
  import { page } from "$app/state";
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

<div class="kracking-public-shell min-h-screen dark:bg-zinc-950 bg-white dark:text-zinc-50 text-zinc-900">
  <div class="mx-auto flex min-h-screen w-full max-w-[1126px] flex-col">
    <section class="flex flex-1 flex-col px-6 py-6 md:px-10 md:py-8">

      <div class="mx-auto flex w-full max-w-5xl items-center justify-start">
        <a href={clientResolver(resolve, "/")} class="flex items-center gap-3">
          <img src={bannerDark}  alt="Kracking" class="h-9 w-auto object-contain md:h-10 hidden dark:block" fetchpriority="high" decoding="async" />
          <img src={bannerLight} alt="Kracking" class="h-9 w-auto object-contain md:h-10 block  dark:hidden" fetchpriority="high" decoding="async" />
        </a>
      </div>

      <div class="mt-8 flex flex-1 flex-col px-0 py-6 md:py-8">
        <div class="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
          {@render children?.()}
        </div>
      </div>
    </section>

    <footer class="dark:border-zinc-900 border-zinc-200 border-t px-6 py-8 md:px-10">
      {#if page.data.loggedInUser}
        <div class="mb-4 flex justify-center">
          <a
            href={clientResolver(resolve, "/manage/app/site-configurations")}
            class="text-sm font-medium dark:text-zinc-300 text-zinc-600 underline underline-offset-4 transition-colors hover:text-blue-500"
          >
            Manage Site
          </a>
        </div>
      {/if}
      {#if footerHTML}
        <div class="flex justify-center text-center text-sm dark:text-zinc-500 text-zinc-400 [&>*]:mx-auto [&_a]:dark:text-zinc-300 [&_a]:text-zinc-600 [&_a]:underline [&_a]:underline-offset-4">
          {@html footerHTML}
        </div>
      {:else}
        <div class="flex justify-center text-center text-sm dark:text-zinc-500 text-zinc-400">
          <p>&copy; {year} Kracking Technologies LLC. All rights reserved.</p>
        </div>
      {/if}
    </footer>
  </div>
</div>
