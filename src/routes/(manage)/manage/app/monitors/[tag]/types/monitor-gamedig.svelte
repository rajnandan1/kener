<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Switch } from "$lib/components/ui/switch/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { DefaultGamedigEval, GAMEDIG_TIMEOUT } from "$lib/anywhere.js";
  import AllGamesListRaw from "$lib/all-games-list.json?raw";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import CodeMirror from "svelte-codemirror-editor";
  import { javascript } from "@codemirror/lang-javascript";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import { mode } from "mode-watcher";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let { data = $bindable() }: { data: any } = $props();

  const allGamesList: Array<{ id: string; name: string }> = JSON.parse(AllGamesListRaw);

  // Initialize defaults if not set
  if (!data.gameId) data.gameId = allGamesList[0]?.id || "";
  if (!data.host) data.host = "";
  if (!data.port) data.port = 27015;
  if (!data.timeout) data.timeout = GAMEDIG_TIMEOUT;
  if (!data.eval) data.eval = DefaultGamedigEval;
  if (data.guessPort === undefined) data.guessPort = false;
  if (data.requestRules === undefined) data.requestRules = false;

  let searchQuery = $state("");
  let filteredGames = $derived(
    searchQuery
      ? allGamesList.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : allGamesList.slice(0, 50) // Show first 50 by default
  );

  let selectedGameName = $derived(allGamesList.find((g) => g.id === data.gameId)?.name || data.gameId);
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-2">
    <Label for="gamedig-game">Game <span class="text-destructive">*</span></Label>
    <Select.Root
      type="single"
      value={data.gameId}
      onValueChange={(v) => {
        if (v) data.gameId = v;
      }}
    >
      <Select.Trigger id="gamedig-game" class="w-full">
        {selectedGameName}
      </Select.Trigger>
      <Select.Content class="max-h-75">
        <div class="p-2">
          <Input bind:value={searchQuery} placeholder="Search games..." class="mb-2" />
        </div>
        {#each filteredGames as game}
          <Select.Item value={game.id}>{game.name}</Select.Item>
        {/each}
        {#if filteredGames.length === 0}
          <p class="text-muted-foreground p-2 text-sm">No games found</p>
        {/if}
      </Select.Content>
    </Select.Root>
  </div>

  <div class="grid grid-cols-3 gap-4">
    <div class="flex flex-col gap-2">
      <Label for="gamedig-host">Host <span class="text-destructive">*</span></Label>
      <Input id="gamedig-host" bind:value={data.host} placeholder="game.example.com" />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="gamedig-port">Port</Label>
      <Input id="gamedig-port" type="number" bind:value={data.port} placeholder="27015" />
    </div>
    <div class="flex flex-col gap-2">
      <Label for="gamedig-timeout">Timeout (ms)</Label>
      <Input id="gamedig-timeout" type="number" bind:value={data.timeout} placeholder="10000" />
    </div>
  </div>

  <div class="flex gap-6">
    <div class="flex items-center space-x-2">
      <Tooltip.Root>
        <Tooltip.Trigger class="flex items-center space-x-2">
          <Switch id="gamedig-guessport" bind:checked={data.guessPort} />
          <Label for="gamedig-guessport">Guess Port</Label>
        </Tooltip.Trigger>
        <Tooltip.Content class="max-w-xs">
          <p class="text-wrap">
            Used port can be different from client port, depending on queried game. Try this if you have unsuccessful
            responses
          </p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
    <div class="flex items-center space-x-2">
      <Tooltip.Root>
        <Tooltip.Trigger class="flex items-center space-x-2">
          <Switch id="gamedig-rules" bind:checked={data.requestRules} />
          <Label for="gamedig-rules">Request Rules</Label>
        </Tooltip.Trigger>
        <Tooltip.Content class="max-w-xs">
          <p class="text-wrap">
            Valve games can provide additional 'rules' to Gamedig monitors. If checked, they will be available in
            `reponseRaw.raw`, beware that it may increase query time.
          </p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  </div>

  <div class="flex flex-col gap-2">
    <Label for="gamedig-eval">Custom Eval Function</Label>
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
      Function receives (responseTime, responseRaw) and should return {`{ status, latency }`}
    </p>
  </div>
</div>
