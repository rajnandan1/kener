<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Copy from "@lucide/svelte/icons/copy";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import clientResolve from "$lib/client/resolver.js";
  import { resolve } from "$app/paths";
  import type { HeartbeatMonitorTypeData } from "$lib/server/types/monitor";
  import randomName from "@scaleway/random-name";
  import CopyButton from "$lib/components/CopyButton.svelte";
  import { Badge } from "$lib/components/ui/badge";

  let { data = $bindable(), tag = "" }: { data: HeartbeatMonitorTypeData; tag?: string } = $props();

  // Initialize defaults if not set
  if (!data.degradedRemainingMinutes) data.degradedRemainingMinutes = 5;
  if (!data.downRemainingMinutes) data.downRemainingMinutes = 10;

  $effect(() => {
    if (!data.secretString) data.secretString = randomName() + "-" + randomName();
  });

  // Generate heartbeat URL
  let heartbeatUrl = $derived(
    tag
      ? window.location.origin + clientResolve(resolve, `/ext/heartbeat/${tag}:${data.secretString}`)
      : "Save the monitor first to get the heartbeat URL"
  );

  //refresh secret string and thus heartbeat URL
  function refreshSecret() {
    data.secretString = randomName() + "-" + randomName();
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col">
      <InputGroup.Root>
        <InputGroup.Addon>
          <InputGroup.Text>
            <span class="text-degraded">DEGRADED</span>
            if no heartbeat received for
          </InputGroup.Text>
        </InputGroup.Addon>
        <InputGroup.Input
          class="text-right"
          id="hb-degraded"
          bind:value={data.degradedRemainingMinutes}
          placeholder="5"
        />
        <InputGroup.Addon align="inline-end">
          <InputGroup.Text>minutes</InputGroup.Text>
        </InputGroup.Addon>
      </InputGroup.Root>
      <p class="text-muted-foreground mt-1 text-xs">Mark as DEGRADED if no heartbeat received for this many minutes</p>
    </div>
    <div class="flex flex-col">
      <InputGroup.Root>
        <InputGroup.Addon>
          <InputGroup.Text>
            <span class="text-down">DOWN</span> if no heartbeat received for
          </InputGroup.Text>
        </InputGroup.Addon>
        <InputGroup.Input class="text-right" id="hb-down" bind:value={data.downRemainingMinutes} placeholder="10" />
        <InputGroup.Addon align="inline-end">
          <InputGroup.Text>minutes</InputGroup.Text>
        </InputGroup.Addon>
      </InputGroup.Root>
      <p class="text-muted-foreground mt-1 text-xs">Mark as DOWN if no heartbeat received for this many minutes</p>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <Label>Heartbeat URL</Label>
    <div>
      <div class="flex items-center gap-2">
        <InputGroup.Root>
          <InputGroup.Addon>
            <InputGroup.Text>
              <Badge>GET | POST</Badge>
            </InputGroup.Text>
          </InputGroup.Addon>
          <InputGroup.Input class="text-muted-foreground" id="hb-secret" bind:value={heartbeatUrl} readonly />
          <InputGroup.Addon align="inline-end">
            <InputGroup.Button variant="secondary" onclick={refreshSecret}>New URL</InputGroup.Button>

            <CopyButton variant="ghost" size="icon-sm" text={heartbeatUrl}>
              <Copy class="size-4" />
            </CopyButton>
          </InputGroup.Addon>
        </InputGroup.Root>
      </div>
      <p class="text-muted-foreground mt-1 text-xs">Send a GET or POST request to this URL to record a heartbeat</p>
    </div>
  </div>
</div>
