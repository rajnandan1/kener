<script lang="ts">
  import bannerImage from "$lib/assets/banner.png";
  import { page } from "$app/state";
  import { resolve } from "$app/paths";
  import { mode, setMode } from "mode-watcher";
  import clientResolver from "$lib/client/resolver.js";
  import type { Snippet } from "svelte";
  import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-svelte";

  interface Props {
    children?: Snippet;
    footerHTML?: string;
  }

  let { children, footerHTML = "" }: Props = $props();

  const year = new Date().getFullYear();

  type ThemePref = "light" | "dark" | "system";

  // Read stored preference so the active indicator is correct on mount.
  let preference = $state<ThemePref>(() => {
    if (typeof localStorage === "undefined") return "system";
    const stored = localStorage.getItem("mode-watcher-mode");
    return (stored === "light" || stored === "dark" || stored === "system" ? stored : "system") as ThemePref;
  });

  function handleTheme(p: ThemePref) {
    preference = p;
    setMode(p);
  }

  const themeTabs: { id: ThemePref; Icon: typeof IconSun; label: string }[] = [
    { id: "light",  Icon: IconSun,           label: "Light"  },
    { id: "dark",   Icon: IconMoon,          label: "Dark"   },
    { id: "system", Icon: IconDeviceDesktop, label: "System" },
  ];
</script>

<div class="kracking-public-shell min-h-screen dark:bg-zinc-950 bg-white dark:text-zinc-50 text-zinc-900">
  <div class="mx-auto flex min-h-screen w-full max-w-[1126px] flex-col">
    <section class="flex flex-1 flex-col px-6 py-6 md:px-10 md:py-8">

      <!-- Nav header -->
      <div class="mx-auto flex w-full max-w-5xl items-center justify-between">
        <a href={clientResolver(resolve, "/")} class="flex items-center gap-3">
          <img
            src={bannerImage}
            alt="Kracking"
            class="h-9 w-auto object-contain md:h-10"
            fetchpriority="high"
            decoding="async"
          />
        </a>

        <!-- Theme switcher — icon-only 3-tab selector matching Console style -->
        <div
          role="group"
          aria-label="Theme"
          class="flex items-center gap-0.5 rounded-lg dark:bg-zinc-900/40 bg-zinc-100 p-0.5"
        >
          {#each themeTabs as tab}
            <button
              type="button"
              aria-label={tab.label}
              aria-pressed={preference === tab.id}
              onclick={() => handleTheme(tab.id)}
              class="relative flex h-7 w-8 items-center justify-center rounded-md transition-colors duration-150 ease-out
                {preference === tab.id
                  ? 'dark:bg-zinc-800/75 bg-white shadow-sm dark:text-zinc-50 text-zinc-900'
                  : 'dark:text-zinc-400 dark:hover:text-zinc-100 text-zinc-500 hover:text-zinc-900'}"
            >
              <tab.Icon class="h-3.5 w-3.5 shrink-0" />
            </button>
          {/each}
        </div>
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
