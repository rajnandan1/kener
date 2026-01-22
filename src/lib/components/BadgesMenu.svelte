<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import GC from "$lib/global-constants.js";
  import { resolve } from "$app/paths";

  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import Percent from "@lucide/svelte/icons/percent";
  import Copy from "@lucide/svelte/icons/copy";

  interface Props {
    open: boolean;
    monitorTag: string;
    protocol: string;
    domain: string;
  }

  let { open = $bindable(false), monitorTag, protocol, domain }: Props = $props();

  // Badge URLs
  const badgeStatusUrl = $derived(
    protocol && domain ? `${protocol}//${domain}${resolve("/")}badge/${monitorTag}/status` : ""
  );
  const badgeUptimeUrl = $derived(
    protocol && domain ? `${protocol}//${domain}${resolve("/")}badge/${monitorTag}/uptime` : ""
  );
  const badgeDotUrl = $derived(
    protocol && domain ? `${protocol}//${domain}${resolve("/")}badge/${monitorTag}/dot` : ""
  );
  const badgeDotPingUrl = $derived(
    protocol && domain ? `${protocol}//${domain}${resolve("/")}badge/${monitorTag}/dot?animate=ping` : ""
  );
</script>

<Dialog.Root bind:open>
  <Dialog.Overlay class="backdrop-blur-[2px]" />
  <Dialog.Content class="max-w-md rounded-3xl">
    <Dialog.Header>
      <Dialog.Title>Badges</Dialog.Title>
      <Dialog.Description>Get badges for this monitor</Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-6">
      <!-- Badges Section -->
      <div>
        <h3 class="mb-2 text-sm font-semibold">SVG Badges</h3>
        <div class="flex flex-col gap-2">
          {#if badgeStatusUrl}
            <div class="flex items-center justify-between gap-2 rounded-3xl border px-2 py-1">
              <div class="flex items-center gap-2">
                <TrendingUp class="h-3 w-3" />
                <span class="text-xs font-medium">Status Badge</span>
              </div>
              <img src={badgeStatusUrl} alt="Status Badge" class="h-5" />

              <CopyButton variant="ghost" size="icon-sm" text={badgeStatusUrl} class="rounded-btn">
                <Copy />
              </CopyButton>
            </div>
          {/if}

          {#if badgeUptimeUrl}
            <div class="flex items-center justify-between gap-2 rounded-3xl border px-2 py-1">
              <div class="flex items-center gap-2">
                <Percent class="h-3 w-3" />
                <span class="text-xs font-medium">Uptime Badge</span>
              </div>
              <img src={badgeUptimeUrl} alt="Uptime Badge" class="h-5" />
              <CopyButton variant="ghost" size="icon-sm" text={badgeUptimeUrl} class="rounded-btn hover:bg-transparent">
                <Copy />
              </CopyButton>
            </div>
          {/if}
        </div>
      </div>

      <!-- Live Status Section -->
      <div>
        <h3 class="mb-2 text-sm font-semibold">Live Status</h3>

        <div class="flex flex-row gap-2">
          {#if badgeDotUrl}
            <div class="flex items-center gap-2 rounded-3xl border px-2 py-1">
              <img src={badgeDotUrl} alt="Status Dot" class="h-4" />
              <span class="text-xs font-medium">Standard</span>
              <CopyButton variant="ghost" size="icon-sm" text={badgeDotUrl} class="rounded-btn">
                <Copy />
              </CopyButton>
            </div>
          {/if}
          {#if badgeDotPingUrl}
            <div class="flex items-center gap-2 rounded-3xl border px-2 py-1">
              <img src={badgeDotPingUrl} alt="Status Dot Ping" class="h-4" />
              <span class="text-xs font-medium">Pinging</span>
              <CopyButton variant="ghost" size="icon-sm" text={badgeDotPingUrl} class="rounded-btn">
                <Copy />
              </CopyButton>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>
