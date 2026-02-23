<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import Plus from "@lucide/svelte/icons/plus";
  import X from "@lucide/svelte/icons/x";
  import { DefaultAPIEval } from "$lib/anywhere.js";
  import CodeMirror from "svelte-codemirror-editor";
  import { javascript } from "@codemirror/lang-javascript";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import { mode } from "mode-watcher";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data = $bindable() }: { data: any } = $props();

  // Initialize defaults if not set
  if (!data.url) data.url = "";
  if (!data.method) data.method = "GET";
  if (!data.headers) data.headers = [];
  if (!data.body) data.body = "";
  if (!data.timeout) data.timeout = 10000;
  if (!data.eval) data.eval = DefaultAPIEval;
  if (data.allowSelfSignedCert === undefined) data.allowSelfSignedCert = false;

  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

  function addHeader() {
    data.headers = [...(data.headers || []), { key: "", value: "" }];
  }

  function removeHeader(index: number) {
    data.headers = data.headers?.filter((_: unknown, i: number) => i !== index);
  }
</script>

<div class="space-y-4">
  <div class="grid grid-cols-4 gap-4">
    <div class="col-span-3 flex flex-col gap-2">
      <Label for="api-url">URL <span class="text-destructive">*</span></Label>
      <Input id="api-url" bind:value={data.url} placeholder="https://api.example.com/health" />
    </div>
    <div class="col-span-1 flex flex-col gap-2">
      <Label for="api-method">Method</Label>
      <Select.Root
        type="single"
        value={data.method}
        onValueChange={(v) => {
          if (v) data.method = v;
        }}
      >
        <Select.Trigger id="api-method" class="w-full">
          {data.method}
        </Select.Trigger>
        <Select.Content>
          {#each methods as method}
            <Select.Item value={method}>{method}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <Label for="api-timeout">Timeout (ms)</Label>
    <Input id="api-timeout" type="number" bind:value={data.timeout} placeholder="10000" />
  </div>

  <div>
    <div class="mb-2 flex items-center justify-between">
      <Label>Headers</Label>
      <Button variant="outline" size="sm" onclick={addHeader}>
        <Plus class="mr-1 size-4" />
        Add Header
      </Button>
    </div>
    {#if data.headers && data.headers.length > 0}
      <div class="space-y-2">
        {#each data.headers as header, index}
          <div class="flex items-center gap-2">
            <Input bind:value={header.key} placeholder="Header Key" class="flex-1" />
            <Input bind:value={header.value} placeholder="Header Value" class="flex-1" />
            <Button variant="ghost" size="icon" onclick={() => removeHeader(index)}>
              <X class="size-4" />
            </Button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  {#if data.method !== "GET" && data.method !== "HEAD"}
    <div class="flex flex-col gap-2">
      <Label for="api-body">Request Body</Label>
      <Textarea id="api-body" bind:value={data.body} placeholder={'{"key": "value"}'} rows={4} />
    </div>
  {/if}

  <div class="flex items-center space-x-2">
    <Switch id="api-self-signed" bind:checked={data.allowSelfSignedCert} />
    <Label for="api-self-signed">Allow Self-Signed Certificates</Label>
  </div>

  <div class="flex flex-col gap-2">
    <Label for="api-eval">Custom Eval Function</Label>
    <div class="rounded-md border">
      <CodeMirror
        bind:value={data.eval}
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
      Function receives (statusCode, responseTime, responseRaw, modules) and should return {`{ status, latency }`}
    </p>
  </div>
</div>
