<script>
  import "../../app.postcss";
  import "../../kener.css";
  import "../../docs.css";
  import { Button } from "$lib/components/ui/button";
  import Sun from "lucide-svelte/icons/sun";
  import Menu from "lucide-svelte/icons/menu";
  import X from "lucide-svelte/icons/x";
  import Heart from "lucide-svelte/icons/heart";
  import { clickOutsideAction, slide } from "svelte-legos";
  import Moon from "lucide-svelte/icons/moon";
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import { page } from "$app/stores";
  let defaultTheme = "light";
  export let data;
  let siteStructure = data.siteStructure;
  let sidebar = siteStructure.sidebar;
  let docFilePath = data.docFilePath;
  let tableOfContents = [];

  function setTheme() {
    document.documentElement.classList.add("dark");
  }

  function activateSidebar(selectedDoc) {
    for (let i = 0; i < sidebar.length; i++) {
      const item = sidebar[i];
      for (let j = 0; j < item.children.length; j++) {
        const subItem = item.children[j];
        if (subItem.file == selectedDoc) {
          subItem.active = true;
          sidebar[i].children[j].active = true;
        } else {
          subItem.active = false;
          sidebar[i].children[j].active = false;
        }
      }
    }
  }

  function pageChange(e) {
    if (e.detail.docFilePath) {
      activateSidebar(e.detail.docFilePath);
    }
  }
  function updateTableOfContents(e) {
    if (e.detail.rightbar) {
      tableOfContents = e.detail.rightbar;
    }
  }
  let sideBarHidden = true;
  //if desktop show sidebar by default

  let isMounted = false;
  onMount(() => {
    setTheme();
    if (window.innerWidth > 768) {
      sideBarHidden = false;
    }
    const donationBanner = document.getElementById("donation-banner");
    const closeButton = document.getElementById("close-donation");

    // Check if we should show the banner today
    const lastShown = localStorage.getItem("kener_donation_banner_closed");
    const today = new Date().toDateString();

    // Only show the banner if it hasn't been closed today
    if (lastShown !== today) {
      donationBanner.style.display = "block";
    }

    // Add close button handler
    closeButton.addEventListener("click", () => {
      donationBanner.style.display = "none";
      localStorage.setItem("kener_donation_banner_closed", today);
    });
  });
</script>

<svelte:window on:pagechange={pageChange} on:rightbar={updateTableOfContents} />
<svelte:head>
  <link rel="icon" id="kener-app-favicon" href="{base}/logo96.png" />

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
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/styles/atom-one-dark.min.css"
  />

  <!-- Highlight.js JS -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
</svelte:head>
<div class="dark">
  <nav class="fixed left-0 right-0 top-0 z-40 h-16 bg-card">
    <div class="mx-auto h-full border-b bg-card px-4 sm:px-6 lg:px-8">
      <div class="flex h-full items-center justify-between">
        <!-- Logo/Brand -->
        <div class="flex items-center space-x-3">
          <a href="/" class="flex items-center space-x-3">
            <!-- Document Icon - Replace with your own logo -->
            <img src="https://kener.ing/logo.png" class="h-8 w-8" alt="" />
            <span class="text-xl font-medium">Kener Documentation</span>
            <span class="me-2 rounded border px-2.5 py-0.5 text-xs font-medium">
              {$page.data.kenerVersion}
            </span>
          </a>
        </div>

        <!-- Navigation Links -->
        <div class="hidden md:block">
          <div class="flex items-center space-x-8">
            <a href="https://github.com/rajnandan1/kener" class="text-sm font-medium">
              <img
                alt="GitHub Repo stars"
                src="https://img.shields.io/github/stars/rajnandan1/kener?label=Star%20Repo&style=social"
              />
            </a>
            <a href="/api-reference" class="text-sm font-medium"> API Reference </a>
            <a href="https://github.com/rajnandan1/kener/issues" class="text-sm font-medium"> Report Issue </a>
          </div>
        </div>

        <!-- Mobile Menu Button -->
        <div class="md:hidden">
          <button
            type="button"
            class="mt-2 hover:text-muted-foreground"
            on:click={() => {
              sideBarHidden = !sideBarHidden;
            }}
          >
            {#if sideBarHidden}
              <Menu class="h-6 w-6" />
            {:else}
              <X class="h-6 w-6" />
            {/if}
          </button>
        </div>
      </div>
    </div>
  </nav>

  <!-- Sidebar -->
  {#if !sideBarHidden}
    <aside
      transition:slide={{ direction: "left", duration: 200 }}
      class="fixed bottom-0 left-0 top-16 z-30 w-72 overflow-y-auto md:block"
      class:hidden={sideBarHidden}
    >
      <nav class="border-r bg-card p-6">
        <!-- Getting Started Section -->
        {#each sidebar as item}
          <div class="mb-4">
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {item.sectionTitle}
            </h3>
            <div class="">
              {#each item.children as child}
                <a
                  rel="external"
                  href={child.link.startsWith("/") ? base + child.link : child.link}
                  class="sidebar-item group flex items-center rounded-md px-3 py-2 text-sm font-medium {!!child.active
                    ? 'active'
                    : ''}"
                >
                  {child.title}
                </a>
              {/each}
            </div>
          </div>
        {/each}
      </nav>
    </aside>
  {/if}

  <!-- Main Content -->
  <main class="dark relative z-10 min-h-screen pt-16 md:ml-72">
    <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-8 md:pr-64">
      <!-- Content Header -->
      <div
        id="donation-banner"
        style="display: none;"
        class="mb-8 rounded-lg bg-gradient-to-r from-blue-900 to-indigo-900 p-4 shadow-lg"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="rounded-full bg-amber-500 p-2">
              <Heart class="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 class="text-base font-medium text-white">Support Kener Development</h3>
              <p class="text-sm text-blue-200">Help us keep this project running and improve it further</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <a
              href="https://buymeacoffee.com/rajnandan1"
              class="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
            >
              Sponsor
            </a>
            <button id="close-donation" class="rounded p-1 text-blue-300 hover:bg-blue-800 hover:text-white">
              <X class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      <div
        class="kener-md prose prose-stone max-w-none dark:prose-invert prose-code:rounded prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:font-normal prose-pre:bg-opacity-0 dark:prose-pre:bg-neutral-900"
      >
        <slot />
      </div>
    </div>
  </main>
  {#if tableOfContents.length > 0}
    <div class="blurry-bg fixed bottom-0 right-0 top-16 z-50 hidden w-64 overflow-y-auto px-6 py-10 lg:block">
      <h4 class="mb-3 text-sm font-semibold uppercase tracking-wider">On this page</h4>
      <nav class="space-y-2">
        {#each tableOfContents as item}
          <a
            href="#{item.id}"
            class="rlink block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground hover:underline {item.level ==
            3
              ? 'ml-4'
              : ''}"
          >
            {item.text}
          </a>
        {/each}
      </nav>
    </div>
  {/if}
</div>
