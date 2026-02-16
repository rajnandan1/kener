<script lang="ts">
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import CodeMirror from "svelte-codemirror-editor";
  import { javascript } from "@codemirror/lang-javascript";
  import { githubLight, githubDark } from "@uiw/codemirror-theme-github";
  import { mode } from "mode-watcher";
  import EyeClosedIcon from "@lucide/svelte/icons/eye-closed";
  import EyeOpenIcon from "@lucide/svelte/icons/eye";

  let { data = $bindable() }: { data: any } = $props();

  // Initialize defaults if not set
  if (!data.dbType) data.dbType = "pg";
  if (!data.connectionString) data.connectionString = "";
  if (!data.query) data.query = "SELECT 1";
  if (!data.timeout) data.timeout = 5000;

  let showConnectionString = $state(false);

  const dbTypes = [
    { value: "pg", label: "PostgreSQL" },
    { value: "mysql2", label: "MySQL" },
    { value: "mssql", label: "SQL Server" },
    { value: "oracledb", label: "Oracle" },
    { value: "sqlite3", label: "SQLite" }
  ];

  const selectedDbType = $derived(dbTypes.find((db) => db.value === data.dbType)?.label || "PostgreSQL");

  const connectionStringPlaceholder = $derived.by(() => {
    switch (data.dbType) {
      case "pg":
        return "postgresql://user:password@localhost:5432/database";
      case "mysql2":
        return "mysql://user:password@localhost:3306/database";
      case "mssql":
        return "Server=localhost;Database=mydb;User Id=myuser;Password=mypassword;";
      case "oracledb":
        return "user/password@localhost:1521/orcl";
      case "sqlite3":
        return "/path/to/database.db";
      default:
        return "postgresql://user:password@localhost:5432/database";
    }
  });
</script>

<div class="space-y-4">
  <div class="grid grid-cols-2 gap-4">
    <div class="flex flex-col gap-2">
      <Label for="sql-dbtype">Database Type</Label>
      <Select.Root
        type="single"
        value={data.dbType}
        onValueChange={(v) => {
          if (v) data.dbType = v;
        }}
      >
        <Select.Trigger id="sql-dbtype" class="w-full">
          {selectedDbType}
        </Select.Trigger>
        <Select.Content>
          {#each dbTypes as db (db.value)}
            <Select.Item value={db.value}>{db.label}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
    <div class="flex flex-col gap-2">
      <Label for="sql-timeout">Timeout (ms)</Label>
      <Input id="sql-timeout" type="number" bind:value={data.timeout} placeholder="5000" />
    </div>
  </div>

  <div>
    <InputGroup.Root>
      <InputGroup.Addon>
        <InputGroup.Text class="border-r-2 pr-2">Connection String for {selectedDbType}</InputGroup.Text>
      </InputGroup.Addon>
      <InputGroup.Input
        id="sql-connection"
        bind:value={data.connectionString}
        placeholder={connectionStringPlaceholder}
        type={showConnectionString ? "text" : "password"}
      />
      <InputGroup.Addon align="inline-end">
        <InputGroup.Button
          type="button"
          aria-label={showConnectionString ? "Hide connection string" : "Show connection string"}
          title={showConnectionString ? "Hide connection string" : "Show connection string"}
          size="icon-xs"
          onclick={() => (showConnectionString = !showConnectionString)}
        >
          {#if showConnectionString}
            <EyeClosedIcon class="size-4" />
          {:else}
            <EyeOpenIcon class="size-4" />
          {/if}
        </InputGroup.Button>
      </InputGroup.Addon>
    </InputGroup.Root>
    <p class="text-muted-foreground mt-1 text-xs">Connection string will be stored securely</p>
  </div>

  <div class="flex flex-col gap-2">
    <Label for="sql-query">Query <span class="text-destructive">*</span></Label>
    <div class="rounded-md border">
      <CodeMirror
        bind:value={data.query}
        lang={javascript()}
        theme={mode.current === "dark" ? githubDark : githubLight}
        styles={{
          "&": {
            fontSize: "14px",
            height: "150px"
          }
        }}
      />
    </div>
    <p class="text-muted-foreground mt-1 text-xs">Query to execute. If successful, monitor is UP.</p>
  </div>
</div>
