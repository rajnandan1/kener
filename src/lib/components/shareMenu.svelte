<script>
  import Share2 from "lucide-svelte/icons/share-2";
  import Link from "lucide-svelte/icons/link";
  import CopyCheck from "lucide-svelte/icons/copy-check";
  import Code from "lucide-svelte/icons/code";
  import TrendingUp from "lucide-svelte/icons/trending-up";
  import Percent from "lucide-svelte/icons/percent";
  import Loader from "lucide-svelte/icons/loader";
  import ExternalLink from "lucide-svelte/icons/external-link";
  import { Button } from "$lib/components/ui/button";
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import { analyticsEvent } from "$lib/boringOne";
  import { l, summaryTime } from "$lib/i18n/client";
  import * as RadioGroup from "$lib/components/ui/radio-group";
  import { Label } from "$lib/components/ui/label";
  import GMI from "$lib/components/gmi.svelte";

  export let monitor;
  export let lang;
  export let selectedLang = "en";
  let theme = "light";
  let copiedLink = false;
  let embedType = "js";
  let copiedEmbed = false;
  let copiedBadgeStatus = false;
  let copiedBadgeUptime = false;
  let copiedBadgeDotStandard = false;
  let copiedBadgeDotPing = false;

  let protocol;
  let domain;

  let pathMonitorLink;
  function copyLinkToClipboard() {
    analyticsEvent("monitor_link_copied", {
      tag: monitor.tag
    });
    navigator.clipboard.writeText(pathMonitorLink);
    copiedLink = true;
    setTimeout(function () {
      copiedLink = false;
    }, 1500);
  }

  let pathMonitorBadgeUptime;
  function copyUptimeBadge() {
    analyticsEvent("monitor_uptime_badge_copied", {
      tag: monitor.tag
    });
    navigator.clipboard.writeText(pathMonitorBadgeUptime);
    copiedBadgeUptime = true;
    setTimeout(function () {
      copiedBadgeUptime = false;
    }, 1500);
  }

  let pathMonitorBadgeStatus;
  function copyStatusBadge() {
    analyticsEvent("monitor_status_badge_copied", {
      tag: monitor.tag
    });
    navigator.clipboard.writeText(pathMonitorBadgeStatus);
    copiedBadgeStatus = true;
    setTimeout(function () {
      copiedBadgeStatus = false;
    }, 1500);
  }

  let pathMonitorBadgeDot;
  function copyDotStandard() {
    analyticsEvent("monitor_svg_standard_copied", {
      tag: monitor.tag
    });

    navigator.clipboard.writeText(pathMonitorBadgeDot);
    copiedBadgeDotStandard = true;
    setTimeout(function () {
      copiedBadgeDotStandard = false;
    }, 1500);
  }

  let pathMonitorBadgeDotPing;
  function copyDotPing() {
    analyticsEvent("monitor_svg_pinging_copied", {
      tag: monitor.tag
    });
    navigator.clipboard.writeText(pathMonitorBadgeDotPing);
    copiedBadgeDotPing = true;
    setTimeout(function () {
      copiedBadgeDotPing = false;
    }, 1500);
  }

  function copyScriptTagToClipboard() {
    //get domain with port number

    analyticsEvent("monitor_embed_copied", {
      tag: monitor.tag,
      type: embedType
    });

    let path = `${base}/embed/monitor-${monitor.tag}`;
    let scriptTag =
      `<script async src="${protocol + "//" + domain + path}/js?theme=${theme}&monitor=${protocol + "//" + domain + path}"><` +
      "/script>";

    if (embedType == "iframe") {
      scriptTag = `<iframe src="${protocol + "//" + domain + path}?theme=${theme}" width="100%" height="200" allowfullscreen="allowfullscreen" allowpaymentrequest frameborder="0"></iframe>`;
    }
    navigator.clipboard.writeText(scriptTag);
    copiedEmbed = true;
    setTimeout(function () {
      copiedEmbed = false;
    }, 1500);
  }

  onMount(async () => {
    protocol = window.location.protocol;
    domain = window.location.host;
    pathMonitorLink = `${protocol}//${domain}${base}/?monitor=${monitor.tag}`;
    pathMonitorBadgeUptime = `${protocol}//${domain}${base}/badge/${monitor.tag}/uptime`;
    pathMonitorBadgeStatus = `${protocol}//${domain}${base}/badge/${monitor.tag}/status`;
    pathMonitorBadgeDot = `${protocol}//${domain}${base}/badge/${monitor.tag}/dot`;
    pathMonitorBadgeDotPing = `${protocol}//${domain}${base}/badge/${monitor.tag}/dot?animate=ping`;
    analyticsEvent("monitor_share_menu_open", {
      tag: monitor.tag
    });
  });
</script>

<div class="relative mb-2 scroll-m-20 px-4 pt-4 {!!monitor.image ? 'pl-10' : ''} text-xl font-medium tracking-tight">
  {#if !!monitor.image}
    <GMI src={monitor.image} classList="absolute left-4 top-5 inline h-5 w-5" alt={monitor.name} srcset="" />
  {/if}
  <p class="overflow-hidden text-ellipsis whitespace-nowrap">
    {monitor.name}
  </p>
</div>
<div class="px-4">
  <h2 class="mb-1 text-sm font-semibold">
    {l(lang, "Share")}
  </h2>
  <p class="mb-2 text-xs text-muted-foreground">
    {l(lang, "Share this monitor using a link with others")}
  </p>
  <Button class="h-8 px-2 pr-4 text-xs font-semibold" variant="secondary" on:click={copyLinkToClipboard}>
    {#if !copiedLink}
      <Link class="mr-2 inline" size={12} />
      <span class="font-semibold">
        {l(lang, "Copy Link")}
      </span>
    {:else}
      <CopyCheck class="mr-2 inline" size={12} />
      <span class="font-semibold">
        {l(lang, "Link Copied")}
      </span>
    {/if}
  </Button>
  <Button
    href={pathMonitorLink}
    target="_blank"
    variant="link"
    class="h-8 px-3  text-xs font-semibold text-muted-foreground"
  >
    <ExternalLink class="inline" size={12} />
  </Button>
</div>
<hr class="my-4" />
<div class="px-4">
  <h2 class="mb-1 text-sm font-semibold">
    {l(lang, "Embed")}
  </h2>
  <p class="mb-1 text-xs text-muted-foreground">
    {l(lang, "Embed this monitor using &#x3C;script&#x3E; or &#x3C;iframe&#x3E; in your app.")}
  </p>
  <div class="mb-4 grid grid-cols-2 gap-2">
    <div class="col-span-1">
      <h3 class="mb-2 text-xs">
        {l(lang, "Theme")}
      </h3>
      <RadioGroup.Root bind:value={theme} class=" flex">
        <div class="flex items-center space-x-2">
          <RadioGroup.Item value="light" id="light-theme" />
          <Label class="text-xs" for="light-theme">{l(lang, "Light")}</Label>
        </div>
        <div class="flex items-center space-x-2">
          <RadioGroup.Item value="dark" id="dark-theme" />
          <Label class="text-xs" for="dark-theme">{l(lang, "Dark")}</Label>
        </div>
        <RadioGroup.Input name="theme" />
      </RadioGroup.Root>
    </div>
    <div class="col-span-1 pl-2">
      <h3 class="mb-2 text-xs">
        {l(lang, "Mode")}
      </h3>
      <RadioGroup.Root bind:value={embedType} class="flex">
        <div class="flex items-center space-x-2">
          <RadioGroup.Item value="js" id="js-embed" />
          <Label class="text-xs" for="js-embed">&#x3C;script&#x3E;</Label>
        </div>
        <div class="flex items-center space-x-2">
          <RadioGroup.Item value="iframe" id="iframe-embed" />
          <Label class="text-xs" for="iframe-embed">&#x3C;iframe&#x3E;</Label>
        </div>
        <RadioGroup.Input name="embed" />
      </RadioGroup.Root>
    </div>
  </div>
  <Button class="h-8  px-2 pr-4 text-xs" variant="secondary" on:click={copyScriptTagToClipboard}>
    {#if !copiedEmbed}
      <Code class="mr-2 inline" size={12} />
      <span class=" font-semibold">
        {l(lang, "Copy Code")}
      </span>
    {:else}
      <CopyCheck class="mr-2 inline" size={12} />
      <span class="font-semibold">
        {l(lang, "Code Copied")}
      </span>
    {/if}
  </Button>
</div>
<hr class="my-4" />
<div class="px-4">
  <h2 class="mb-1 text-sm font-semibold">
    {l(lang, "Badge")}
  </h2>
  <p class="mb-2 text-xs text-muted-foreground">
    {l(lang, "Get SVG badge for this monitor")}
  </p>
  <Button class="h-8  px-2 pr-4 text-xs" variant="secondary" on:click={copyStatusBadge}>
    {#if !copiedBadgeStatus}
      <TrendingUp class="mr-2 inline" size={12} />
      <span class="font-semibold">
        {l(lang, "Status")}
        {l(lang, "Badge")}
      </span>
    {:else}
      <CopyCheck class="mr-2 inline" size={12} />
      <span class="font-semibold">
        {l(lang, "Badge Copied")}
      </span>
    {/if}
  </Button>
  <Button class="h-8  px-2 pr-4 text-xs" variant="secondary" on:click={copyUptimeBadge}>
    {#if !copiedBadgeUptime}
      <Percent class="mr-2 inline" size={12} />
      <span class="font-semibold">
        {l(lang, "Uptime")}
        {l(lang, "Badge")}
      </span>
    {:else}
      <CopyCheck class="mr-2 inline" size={12} />
      <span class="font-semibold">
        {l(lang, "Badge Copied")}
      </span>
    {/if}
  </Button>
</div>
<hr class="my-4" />
<div class="mb-4 px-4">
  <h2 class="mb-1 text-sm font-semibold">
    {l(lang, "LIVE Status")}
  </h2>
  <p class="mb-2 text-xs text-muted-foreground">
    {l(lang, "Get a LIVE Status for this monitor")}
  </p>
  <Button class="h-8  px-2 pr-4 text-xs" variant="secondary" on:click={copyDotStandard}>
    {#if !copiedBadgeDotStandard}
      <img src={pathMonitorBadgeDot} class="mr-1 inline h-5" alt="status" />
      <span class="font-semibold">
        {l(lang, "Standard")}
      </span>
    {:else}
      <CopyCheck class="mr-2 inline h-5 w-5" />
      <span class="font-semibold">
        {l(lang, "Standard")}
      </span>
    {/if}
  </Button>
  <Button class="h-8  px-2 pr-4 text-xs" variant="secondary" on:click={copyDotPing}>
    {#if !copiedBadgeDotPing}
      <img src={pathMonitorBadgeDotPing} class="mr-1 inline h-5" alt="status" />
      <span class="font-semibold">
        {l(lang, "Pinging")}
      </span>
    {:else}
      <CopyCheck class="mr-2 inline h-5 w-5" />
      <span class="font-semibold">
        {l(lang, "Pinging")}
      </span>
    {/if}
  </Button>
</div>
