<script>
  import "../../../../app.postcss";
  import "../../../../kener.css";
  import "../../../../manage.css";
  import { base } from "$app/paths";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import Sun from "lucide-svelte/icons/sun";
  import Moon from "lucide-svelte/icons/moon";
  import Github from "lucide-svelte/icons/github";
  import { Button } from "$lib/components/ui/button";
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/stores";
  import Play from "lucide-svelte/icons/play";
  import User from "lucide-svelte/icons/user";
  import { setMode, mode, ModeWatcher } from "mode-watcher";

  let thisYear = new Date().getFullYear();
  function toggleMode() {
    if ($mode === "light") {
      setMode("dark");
    } else {
      setMode("light");
    }
  }
  // setMode("dark");

  let nav = [
    { name: "Site", url: `${base}/manage/app/site`, id: "/(manage)/manage/(app)/app/site" },
    { name: "SEO", url: `${base}/manage/app/seo`, id: "/(manage)/manage/(app)/app/seo" },
    { name: "Home", url: `${base}/manage/app/home`, id: "/(manage)/manage/(app)/app/home" },
    { name: "Theme", url: `${base}/manage/app/theme`, id: "/(manage)/manage/(app)/app/theme" },
    {
      name: "Monitors",
      url: `${base}/manage/app/monitors`,
      id: "/(manage)/manage/(app)/app/monitors"
    },
    {
      name: "Triggers",
      url: `${base}/manage/app/triggers`,
      id: "/(manage)/manage/(app)/app/triggers"
    },
    {
      name: "Alerts",
      url: `${base}/manage/app/alerts`,
      id: "/(manage)/manage/(app)/app/alerts"
    },
    {
      name: "Events",
      url: `${base}/manage/app/events`,
      id: "/(manage)/manage/(app)/app/events"
    },
    {
      name: "Badges",
      url: `${base}/manage/app/badges`,
      id: "/(manage)/manage/(app)/app/badges"
    },
    {
      name: "API Keys",
      url: `${base}/manage/app/api-keys`,
      id: "/(manage)/manage/(app)/app/api-keys"
    },
    {
      name: "Users",
      url: `${base}/manage/app/users`,
      id: "/(manage)/manage/(app)/app/users"
    },
    {
      name: "Subscription",
      url: `${base}/manage/app/subscriptions`,
      id: "/(manage)/manage/(app)/app/subscriptions"
    },
    {
      name: "Profile",
      url: `${base}/manage/app/profile`,
      id: "/(manage)/manage/(app)/app/profile"
    }
  ];

  let activeTab = "";

  afterNavigate((e) => {
    activeTab = e.to.route.id;
  });
</script>

<svelte:window
  on:noScroll={(e) => {
    let noScroll = e.detail;
    if (noScroll) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }}
/>

<ModeWatcher />
<svelte:head>
  <title>Manage Kener</title>
  <meta name="description" content="Manage your Kener project" />
  <meta name="robots" content="noindex" />
  <link rel="icon" href="{base}/logo96.png" />
</svelte:head>
<header class="fixed inset-x-0 top-0 z-50 mx-auto mt-2 flex px-2">
  <div class=" flex w-full justify-between rounded-lg border bg-card px-5 py-4">
    <div class="mt-2 flex gap-x-1.5">
      <img src="{base}/logo.png" alt="Kener" class="inline h-6 w-6" />
      <h1 class="font-semibold">Manage Kener</h1>
    </div>
    <div class="flex">
      <Button on:click={toggleMode} variant="ghost" size="icon" class="flex">
        <Sun class="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon class="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span class="sr-only">Toggle theme</span>
      </Button>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button size="icon" variant="ghost">
            <User class="h-4 w-4" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <DropdownMenu.Label class="text-xs">My Account</DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item class="text-xs font-semibold">
              <a href="{base}/manage/app/profile">Profile</a>
            </DropdownMenu.Item>
            <DropdownMenu.Item class="text-xs font-semibold">
              <a
                href="{base}/manage/signin/logout"
                on:click={(e) => {
                  e.preventDefault();
                  window.location = base + "/manage/signin/logout";
                }}>Logout</a
              >
            </DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <div class="ml-3">
        <a
          type="button"
          href="{base}/"
          rel="external"
          class=" flex gap-x-1 rounded-lg bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-3.5 py-2.5 text-center text-sm font-medium text-white hover:bg-gradient-to-br focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
        >
          <Play class="mr-1 mt-0.5 inline-block h-4 w-4" />
          <span> Preview </span>
        </a>
      </div>
    </div>
  </div>
</header>
<main class="manage">
  <div class="fixed left-2 top-[5.2rem] my-2 h-[calc(100vh-6.5rem)] w-56 rounded-lg border bg-card px-2 py-2 shadow-md">
    <nav class="flex flex-col justify-start gap-x-2 overflow-x-auto">
      {#each nav as item}
        <Button variant={item.id.includes(activeTab) ? "secondary" : "ghost"} href={item.url} class="justify-start "
          >{item.name}</Button
        >
      {/each}
    </nav>
  </div>

  <div class=" mx-auto my-2 w-full max-w-7xl pl-60 pr-2 pt-24">
    <slot></slot>
  </div>
</main>

<!-- ========== FOOTER ========== -->
<footer class="mx-auto mt-8 w-full max-w-3xl px-4 sm:px-6 lg:px-8">
  <div class="border-t py-6 dark:border-neutral-700">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p class="text-xs text-muted-foreground">
          Kener.ing
          <a
            target="_blank"
            class="text-xs font-semibold text-muted-foreground hover:underline"
            href="https://kener.ing/docs/changelogs#v{$page.data.kenerVersion.replaceAll('.', '-')}"
          >
            v{$page.data.kenerVersion}
          </a>
          by
          <a
            target="_blank"
            class="text-xs font-semibold text-muted-foreground hover:underline"
            href="https://www.rajnandan.com"
          >
            Raj Nandan Sharma
          </a>
        </p>
      </div>
      <!-- End Col -->

      <!-- List -->
      <ul class="flex flex-wrap items-center">
        <li
          class="relative inline-block pe-4 text-xs before:absolute before:end-1.5 before:top-1/2 before:size-[3px] before:-translate-y-1/2 before:rounded-full before:bg-gray-400 last:pe-0 last-of-type:before:hidden dark:text-neutral-500 dark:before:bg-neutral-600"
        >
          <a
            target="_blank"
            class="text-xs font-medium text-muted-foreground hover:underline hover:decoration-1 focus:decoration-1 focus:outline-none"
            href="https://buymeacoffee.com/rajnandan1"
          >
            Donate
          </a>
        </li>
        <li
          class="relative inline-block pe-4 text-xs before:absolute before:end-1.5 before:top-1/2 before:size-[3px] before:-translate-y-1/2 before:rounded-full before:bg-gray-400 last:pe-0 last-of-type:before:hidden dark:text-neutral-500 dark:before:bg-neutral-600"
        >
          <a
            target="_blank"
            class="text-xs font-medium text-muted-foreground hover:underline hover:decoration-1 focus:decoration-1 focus:outline-none"
            href="https://twitter.com/_rajnandan_"
          >
            Contact
          </a>
        </li>
        <li
          class="relative inline-block pe-4 text-xs before:absolute before:end-1.5 before:top-1/2 before:size-[3px] before:-translate-y-1/2 before:rounded-full before:bg-gray-400 last:pe-0 last-of-type:before:hidden dark:text-neutral-500 dark:before:bg-neutral-600"
        >
          <a
            target="_blank"
            class="text-xs font-medium text-muted-foreground hover:underline hover:decoration-1 focus:decoration-1 focus:outline-none"
            href="https://discord.gg/uSTpnuK9XR"
          >
            Discord
          </a>
        </li>
        <li
          class="relative inline-block pe-4 text-xs before:absolute before:end-1.5 before:top-1/2 before:size-[3px] before:-translate-y-1/2 before:rounded-full before:bg-gray-400 last:pe-0 last-of-type:before:hidden dark:text-neutral-500 dark:before:bg-neutral-600"
        >
          <a
            target="_blank"
            class="text-xs font-medium text-muted-foreground hover:underline hover:decoration-1 focus:decoration-1 focus:outline-none"
            href="https://github.com/rajnandan1/kener"
          >
            Github
          </a>
        </li>
        <li
          class="relative inline-block pe-4 text-xs before:absolute before:end-1.5 before:top-1/2 before:size-[3px] before:-translate-y-1/2 before:rounded-full before:bg-gray-400 last:pe-0 last-of-type:before:hidden dark:text-neutral-500 dark:before:bg-neutral-600"
        >
          <a
            target="_blank"
            class="text-xs font-medium text-muted-foreground hover:underline hover:decoration-1 focus:decoration-1 focus:outline-none"
            href="https://kener.ing/docs/home"
          >
            Documentation
          </a>
        </li>
      </ul>
      <!-- End List -->
    </div>
  </div>
</footer>
<!-- ========== END FOOTER ========== -->
