<script>
  import "../../app.postcss";
  import "../../kener.css";
  import Nav from "$lib/components/nav.svelte";
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import { Button } from "$lib/components/ui/button";
  import Sun from "lucide-svelte/icons/sun";
  import Moon from "lucide-svelte/icons/moon";
  import Languages from "lucide-svelte/icons/languages";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
  import { setMode, mode, ModeWatcher } from "mode-watcher";
  export let data;

  let defaultLocaleKey = data.selectedLang;
  let defaultTheme = data.site.theme;
  const allLocales = data.site.i18n?.locales.filter((locale) => locale.selected === true);

  function toggleMode() {
    if ($mode === "light") {
      setMode("dark");
    } else {
      setMode("light");
    }
  }
  let defaultLocaleValue;
  if (!allLocales) {
    defaultLocaleValue = "English";
  } else {
    defaultLocaleValue = allLocales.find((locale) => locale.code === defaultLocaleKey).name;
  }
  /**
   * @param {string} locale
   */
  function setLanguage(locale) {
    document.cookie = `localLang=${locale};max-age=${60 * 60 * 24 * 365 * 30}`;
    if (locale === defaultLocaleKey) return;
    defaultLocaleValue = allLocales[locale];
  }

  let Analytics;
  onMount(async () => {
    let localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (localTz != data.localTz) {
      if (data.isBot === false) {
        document.cookie = "localTz=" + localTz + ";max-age=" + 60 * 60 * 24 * 365 * 30;
        location.reload();
      }
    }
    if (defaultTheme != "none") {
      setMode(defaultTheme);
    }
    //
  });
</script>

<svelte:head>
  <title>{data.site.title}</title>
  {#if data.site.favicon && data.site.favicon[0] == "/"}
    <link rel="icon" id="kener-app-favicon" href="{base}{data.site.favicon}" />
  {:else if data.site.favicon}
    <link rel="icon" id="kener-app-favicon" href={data.site.favicon} />
  {/if}
  <link href={data.site.font.cssSrc} rel="stylesheet" />
  {#each Object.entries(data.site.metaTags) as [key, value]}
    <meta name={key} content={value} />
  {/each}
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
>
  <div class="">
    <slot />
  </div>
</main>

<style>
  /* Apply the global font family using the CSS variable */
  * {
    font-family: var(--font-family);
  }
  main {
    background-color: var(--bg-custom);
  }
</style>
