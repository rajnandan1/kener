<script>
  import "../../app.postcss";
  import "../../kener.css";
  import "../../theme.css";
  import Nav from "$lib/components/nav.svelte";
  import { onMount } from "svelte";
  import { Input } from "$lib/components/ui/input";
  import { base } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import Sun from "lucide-svelte/icons/sun";
  import Moon from "lucide-svelte/icons/moon";
  import Languages from "lucide-svelte/icons/languages";
  import Globe from "lucide-svelte/icons/globe";
  import * as Popover from "$lib/components/ui/popover";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { analyticsEvent } from "$lib/boringOne";
  import { setMode, mode, ModeWatcher } from "mode-watcher";
  import { l } from "$lib/i18n/client";

  export let data;
  let defaultLocaleKey = data.selectedLang;
  let allTimezones = Intl.supportedValuesOf("timeZone");
  let searchTzValue = "";
  let defaultTheme = data.site.theme;
  const allLocales = data.site.i18n?.locales.filter((locale) => locale.selected === true);

  function toggleMode() {
    if ($mode === "light") {
      setMode("dark");
    } else {
      setMode("light");
    }

    analyticsEvent("theme_change", {
      theme: $mode
    });
  }
  let defaultLocaleValue;
  if (!allLocales) {
    defaultLocaleValue = "English";
  } else {
    let lclFi = allLocales.find((locale) => locale.code === defaultLocaleKey);
    if (lclFi) {
      defaultLocaleValue = lclFi.name;
    }
  }
  /**
   * @param {string} locale
   */
  function setLanguage(locale) {
    document.cookie = `localLang=${locale};max-age=${60 * 60 * 24 * 365 * 30};path=${base ? "base" : "/"};`;
    if (locale === defaultLocaleKey) return;
    defaultLocaleValue = allLocales[locale];
    analyticsEvent("language_change", {
      locale: locale
    });
    location.reload();
  }

  //set timezone
  function setTz(tz) {
    document.cookie = `localTz=${tz};max-age=${60 * 60 * 24 * 365 * 30};path=${base ? "base" : "/"};`;
    analyticsEvent("timezone_changed", {
      time_zone: tz
    });
    location.reload();
  }

  let myTimezone = data.localTz;
  onMount(async () => {
    myTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (data.localTz === "UTC") {
      if (data.isBot === false) {
        setTz(myTimezone);
      }
    }
    if (defaultTheme != "none") {
      setMode(defaultTheme);
    }

    if (!!data.bgc && data.bgc[0] == "#") {
      document.body.style.backgroundColor = data.bgc;
    }
  });

  let customCSS = `<style>${data.site.customCSS}</style>`;
  if (!!data.site.favicon && !data.site.favicon.startsWith("http")) data.site.favicon = `${base}${data.site.favicon}`;

  let kenerTheme = data.site.kenerTheme || "default";
</script>

<svelte:head>
  <script src="{base}/api/js/capture.js"></script>
  {#if data.site.favicon}
    <link rel="icon" id="kener-app-favicon" href={data.site.favicon} />
  {/if}
  {#if !!data.site.font.cssSrc}
    <link href={data.site.font.cssSrc} rel="stylesheet" />
  {/if}

  {#if !!data.site.customCSS}
    {@html customCSS}
  {/if}
</svelte:head>
<ModeWatcher />
<main
  style="
	--font-family: {data.site.font.family};
	--bg-custom: {data.bgc};
	--up-color: {data.site.colors.UP};
	--down-color: {data.site.colors.DOWN};
	--degraded-color: {data.site.colors.DEGRADED}
	"
  class="kener-theme-{kenerTheme}"
>
  <Nav {data} />
  <div class="main-content min-h-[70vh]">
    <slot />
  </div>

  {#if !!data.site.footerHTML}
    <footer class="kener-footer z-10 py-6 md:px-8 md:py-0">
      {@html data.site.footerHTML}
    </footer>
  {/if}
  <div class="fixed bottom-4 right-4 z-20 flex flex-col rounded-md bg-background">
    {#if !!data.site.tzToggle && data.site.tzToggle === "YES"}
      <div>
        <Popover.Root>
          <Popover.Trigger>
            <Button variant="ghost" size="icon" class="flex">
              <Globe class="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </Popover.Trigger>
          <Popover.Content class="px-0 py-2">
            <div class="flex flex-col gap-2">
              <div class="flex px-2 pb-1 text-xs font-semibold">
                <span class="flex-1">
                  {@html l(data.lang, "Timezone set to %tz", {
                    tz: "<i>" + data.localTz + "</i>"
                  })}
                </span>
              </div>
              <div class="flex flex-col gap-2">
                <div class="border-b px-2 pb-2">
                  <Input
                    placeholder="Search for a timezone"
                    class="h-8 px-2 py-1 text-xs"
                    value={searchTzValue}
                    on:input={(e) => {
                      searchTzValue = e.target.value;
                    }}
                  />
                </div>
                <div class="flex h-[200px] flex-col overflow-y-auto">
                  {#each allTimezones as tz}
                    {#if tz.toLowerCase().includes(searchTzValue.toLowerCase())}
                      <div class="text-xs font-semibold">
                        <Button
                          variant={tz === data.localTz ? "primary" : "ghost"}
                          class="h-8 w-full justify-start rounded-none text-xs {tz === data.localTz
                            ? 'text-background'
                            : 'text-muted-foreground'}"
                          on:click={() => setTz(tz)}
                        >
                          {tz}
                        </Button>
                      </div>
                    {/if}
                  {/each}
                </div>
                {#if myTimezone !== data.localTz}
                  <div class="px-2">
                    <Button
                      variant="outline"
                      class="h-6 w-full bg-transparent px-2 text-xs"
                      on:click={() => setTz(myTimezone)}
                    >
                      {l(data.lang, "Switch to your timezone")}
                    </Button>
                  </div>
                {/if}
              </div>
            </div>
          </Popover.Content>
        </Popover.Root>
      </div>
    {/if}
    {#if data.site.i18n && data.site.i18n.locales && allLocales.length > 1}
      <div>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="ghost" size="icon" class="flex">
              <Languages class="h-[1.2rem] w-[1.2rem]" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="max-h-[250px] overflow-y-auto">
            <DropdownMenu.Group>
              {#each allLocales as locale}
                <DropdownMenu.Item
                  class={defaultLocaleKey == locale.code ? "bg-input" : ""}
                  on:click={(e) => {
                    setLanguage(locale.code);
                  }}>{locale.name}</DropdownMenu.Item
                >
              {/each}
            </DropdownMenu.Group>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    {/if}
    {#if !!data.site.themeToggle && data.site.themeToggle === "YES"}
      <div>
        <Button on:click={toggleMode} variant="ghost" size="icon" class="flex">
          <Sun class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span class="sr-only">Toggle theme</span>
        </Button>
      </div>
    {/if}
  </div>
  {#if data.isLoggedIn}
    <div class="fixed bottom-2 left-2 z-50 md:bottom-8 md:left-8">
      <a href="{base}/manage/app/site" rel="external" class="button-77" role="button"> Manage </a>
    </div>
  {/if}
</main>

<style>
  /* Apply the global font family using the CSS variable */
  * {
    font-family: var(--font-family);
  }
</style>
