<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { DefaultPingEval } from "$lib/anywhere.js";
  import CodeMirror from "svelte-codemirror-editor";
  import { javascript } from "@codemirror/lang-javascript";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import { mode } from "mode-watcher";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data = $bindable() }: { data: any } = $props();

  // Initialize defaults if not set
  if (!data.hosts) data.hosts = [];
  if (!data.pingEval) data.pingEval = DefaultPingEval;

  function addHost() {
    data.hosts = [...data.hosts, { type: "cmd", host: "", timeout: 1000, count: 3 }];
  }

  function removeHost(index: number) {
    data.hosts = data.hosts.filter((_: unknown, i: number) => i !== index);
  }
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-2">
    <div class="mb-2 flex items-center justify-between">
      <Label>Hosts <span class="text-destructive">*</span></Label>
      <Button variant="outline" size="sm" onclick={addHost}>
        <Plus class="mr-1 size-4" />
        Add Host
      </Button>
    </div>
    {#if data.hosts.length > 0}
      <div class="space-y-3">
        {#each data.hosts as host, index}
          <div class="bg-muted/50 rounded-lg border p-3">
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm font-medium">Host {index + 1}</span>
              <Button variant="ghost" size="icon" onclick={() => removeHost(index)}>
                <X class="size-4" />
              </Button>
            </div>
            <div class="grid grid-cols-4 gap-2">
              <div class="col-span-2 flex flex-col gap-2">
                <Label for="ping-host-{index}">Host</Label>
                <Input id="ping-host-{index}" bind:value={host.host} placeholder="8.8.8.8 or example.com" />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="ping-timeout-{index}">Timeout (ms)</Label>
                <Input id="ping-timeout-{index}" type="number" bind:value={host.timeout} placeholder="1000" />
              </div>
              <div class="flex flex-col gap-2">
                <Label for="ping-count-{index}">Count</Label>
                <Input id="ping-count-{index}" type="number" bind:value={host.count} placeholder="3" />
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-muted-foreground text-sm">No hosts added. Click "Add Host" to add a ping target.</p>
    {/if}
  </div>

  <div class="flex flex-col gap-2">
    <Label for="ping-eval">Custom Eval Function</Label>
    <div class="rounded-md border">
      <CodeMirror
        bind:value={data.pingEval}
        lang={javascript()}
        theme={mode.current === "dark" ? githubDark : githubLight}
        styles={{
          "&": {
            fontSize: "14px",
            height: "300px"
          }
        }}
      />
    </div>
    <p class="text-muted-foreground mt-1 text-xs">
      Function receives (arrayOfPings) and should return {`{ status, latency }`}
    </p>
  </div>
</div>
