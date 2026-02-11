<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import GC from "$lib/global-constants.js";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { t } from "$lib/stores/i18n";
  import trackEvent from "$lib/beacon";

  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Percent from "@lucide/svelte/icons/percent";
  import Timer from "@lucide/svelte/icons/timer";
  import Copy from "@lucide/svelte/icons/copy";

  interface Props {
    open: boolean;
    monitorTag: string;
    protocol: string;
    domain: string;
  }

  let { open = $bindable(false), monitorTag, protocol, domain }: Props = $props();

  function handleBadgeCopy(
    type: "status" | "uptime" | "latency_avg" | "latency_max" | "latency_min" | "dot" | "dot_ping"
  ) {
    trackEvent("badge_copied", { type, monitorTag });
  }

  // Badge URLs
  const badgeStatusUrl = $derived(
    protocol && domain ? `${protocol}//${domain}` + clientResolver(resolve, `/badge/${monitorTag}/status`) : ""
  );
  const badgeUptimeUrl = $derived(
    protocol && domain ? `${protocol}//${domain}` + clientResolver(resolve, `/badge/${monitorTag}/uptime`) : ""
  );
  const badgeLatencyAvgUrl = $derived(
    protocol && domain ? `${protocol}//${domain}` + clientResolver(resolve, `/badge/${monitorTag}/latency`) : ""
  );
  const badgeLatencyMaxUrl = $derived(
    protocol && domain
      ? `${protocol}//${domain}` + clientResolver(resolve, `/badge/${monitorTag}/latency?metric=maximum`)
      : ""
  );
  const badgeLatencyMinUrl = $derived(
    protocol && domain
      ? `${protocol}//${domain}` + clientResolver(resolve, `/badge/${monitorTag}/latency?metric=minimum`)
      : ""
  );
  const badgeDotUrl = $derived(
    protocol && domain ? `${protocol}//${domain}` + clientResolver(resolve, `/badge/${monitorTag}/dot`) : ""
  );
  const badgeDotPingUrl = $derived(
    protocol && domain
      ? `${protocol}//${domain}` + clientResolver(resolve, `/badge/${monitorTag}/dot?animate=ping`)
      : ""
  );
</script>

<Dialog.Root bind:open>
  <Dialog.Overlay class="backdrop-blur-[2px]" />
  <Dialog.Content class="max-w-md rounded-3xl">
    <Dialog.Header>
      <Dialog.Title>{$t("Badges")}</Dialog.Title>
      <Dialog.Description>{$t("Get badges for this monitor")}</Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-6">
      <!-- Badges Section -->
      <div>
        <h3 class="mb-2 text-sm font-semibold">
          {$t("Badges")}
        </h3>
        <div class="flex flex-col gap-2">
          {#if badgeStatusUrl}
            <div class="flex items-center justify-between gap-2 rounded-3xl border px-2 py-1">
              <div class="flex items-center gap-2">
                <TrendingUp class="h-3 w-3" />
                <span class="text-xs font-medium">{$t("Status Badge")}</span>
              </div>
              <img src={badgeStatusUrl} alt="Status Badge" class="h-5" />

              <CopyButton
                variant="ghost"
                size="icon-sm"
                text={badgeStatusUrl}
                class="rounded-btn"
                onclick={() => handleBadgeCopy("status")}
              >
                <Copy />
              </CopyButton>
            </div>
          {/if}

          {#if badgeUptimeUrl}
            <div class="flex items-center justify-between gap-2 rounded-3xl border px-2 py-1">
              <div class="flex items-center gap-2">
                <Percent class="h-3 w-3" />
                <span class="text-xs font-medium">{$t("Uptime Badge")}</span>
              </div>
              <img src={badgeUptimeUrl} alt="Uptime Badge" class="h-5" />
              <CopyButton
                variant="ghost"
                size="icon-sm"
                text={badgeUptimeUrl}
                class="rounded-btn hover:bg-transparent"
                onclick={() => handleBadgeCopy("uptime")}
              >
                <Copy />
              </CopyButton>
            </div>
          {/if}

          {#if badgeLatencyAvgUrl}
            <div class="flex items-center justify-between gap-2 rounded-3xl border px-2 py-1">
              <div class="flex items-center gap-2">
                <Timer class="h-3 w-3" />
                <span class="text-xs font-medium">{$t("Avg Latency")}</span>
              </div>
              <img src={badgeLatencyAvgUrl} alt="Avg Latency Badge" class="h-5" />
              <CopyButton
                variant="ghost"
                size="icon-sm"
                text={badgeLatencyAvgUrl}
                class="rounded-btn"
                onclick={() => handleBadgeCopy("latency_avg")}
              >
                <Copy />
              </CopyButton>
            </div>
          {/if}

          {#if badgeLatencyMaxUrl}
            <div class="flex items-center justify-between gap-2 rounded-3xl border px-2 py-1">
              <div class="flex items-center gap-2">
                <Timer class="h-3 w-3" />
                <span class="text-xs font-medium">{$t("Max Latency")}</span>
              </div>
              <img src={badgeLatencyMaxUrl} alt="Max Latency Badge" class="h-5" />
              <CopyButton
                variant="ghost"
                size="icon-sm"
                text={badgeLatencyMaxUrl}
                class="rounded-btn"
                onclick={() => handleBadgeCopy("latency_max")}
              >
                <Copy />
              </CopyButton>
            </div>
          {/if}

          {#if badgeLatencyMinUrl}
            <div class="flex items-center justify-between gap-2 rounded-3xl border px-2 py-1">
              <div class="flex items-center gap-2">
                <Timer class="h-3 w-3" />
                <span class="text-xs font-medium">{$t("Min Latency")}</span>
              </div>
              <img src={badgeLatencyMinUrl} alt="Min Latency Badge" class="h-5" />
              <CopyButton
                variant="ghost"
                size="icon-sm"
                text={badgeLatencyMinUrl}
                class="rounded-btn"
                onclick={() => handleBadgeCopy("latency_min")}
              >
                <Copy />
              </CopyButton>
            </div>
          {/if}
        </div>
      </div>

      <!-- Live Status Section -->
      <div>
        <h3 class="mb-2 text-sm font-semibold">{$t("Live Status")}</h3>

        <div class="flex flex-row gap-2">
          {#if badgeDotUrl}
            <div class="flex items-center gap-2 rounded-3xl border px-2 py-1">
              <img src={badgeDotUrl} alt="Status Dot" class="h-4" />
              <span class="text-xs font-medium">{$t("Standard")}</span>
              <CopyButton
                variant="ghost"
                size="icon-sm"
                text={badgeDotUrl}
                class="rounded-btn"
                onclick={() => handleBadgeCopy("dot")}
              >
                <Copy />
              </CopyButton>
            </div>
          {/if}
          {#if badgeDotPingUrl}
            <div class="flex items-center gap-2 rounded-3xl border px-2 py-1">
              <img src={badgeDotPingUrl} alt="Status Dot Ping" class="h-4" />
              <span class="text-xs font-medium">{$t("Pinging")}</span>
              <CopyButton
                variant="ghost"
                size="icon-sm"
                text={badgeDotPingUrl}
                class="rounded-btn"
                onclick={() => handleBadgeCopy("dot_ping")}
              >
                <Copy />
              </CopyButton>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
