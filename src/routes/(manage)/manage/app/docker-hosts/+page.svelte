<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import PlugZapIcon from "@lucide/svelte/icons/plug-zap";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import { DOCKER_CONNECTION_TYPES, DOCKER_DEFAULT_SOCKET_PATH } from "$lib/anywhere.js";

  interface DockerHost {
    id: number;
    name: string;
    connection_type: string;
    daemon: string;
    tls_ca: string | null;
    has_tls_cert: boolean;
    has_tls_key: boolean;
  }

  interface TestResult {
    success: boolean;
    latency: number;
    version?: string;
    apiVersion?: string;
    platform?: string;
    containerCount?: number;
    error?: string;
  }

  const CONNECTION_TYPE_LABELS: Record<string, string> = {
    socket: "Unix socket / named pipe",
    tcp: "TCP (unencrypted)",
    tls: "TCP + TLS client certificate"
  };

  const DAEMON_PLACEHOLDERS: Record<string, string> = {
    socket: DOCKER_DEFAULT_SOCKET_PATH,
    tcp: "10.0.0.5:2375",
    tls: "docker.example.com:2376"
  };

  let loading = $state(true);
  let hosts = $state<DockerHost[]>([]);

  let dialogOpen = $state(false);
  let saving = $state(false);
  let testing = $state(false);
  let testResult = $state<TestResult | null>(null);
  let deleteTarget = $state<DockerHost | null>(null);
  let deleting = $state(false);

  let form = $state({
    id: 0,
    name: "",
    connection_type: "socket",
    daemon: DOCKER_DEFAULT_SOCKET_PATH,
    tls_ca: "",
    tls_cert: "",
    tls_key: ""
  });
  // On edit the stored certificate is never sent to the browser; blank fields mean "keep".
  let editingExistingTls = $state(false);

  const isFormValid = $derived.by(() => {
    if (!form.name.trim()) return false;
    if (!form.daemon.trim()) return false;
    if (form.connection_type === "tls" && !editingExistingTls && (!form.tls_cert.trim() || !form.tls_key.trim()))
      return false;
    return true;
  });

  async function callApi(action: string, payload: Record<string, unknown> = {}) {
    const response = await fetch(clientResolver(resolve, "/manage/api"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data: payload })
    });
    const result = await response.json();
    if (result?.error) throw new Error(result.error);
    return result;
  }

  async function fetchData() {
    loading = true;
    try {
      hosts = await callApi("getDockerHosts");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load Docker hosts");
    } finally {
      loading = false;
    }
  }

  function openCreate() {
    form = {
      id: 0,
      name: "",
      connection_type: "socket",
      daemon: DOCKER_DEFAULT_SOCKET_PATH,
      tls_ca: "",
      tls_cert: "",
      tls_key: ""
    };
    editingExistingTls = false;
    testResult = null;
    dialogOpen = true;
  }

  function openEdit(host: DockerHost) {
    form = {
      id: host.id,
      name: host.name,
      connection_type: host.connection_type,
      daemon: host.daemon,
      tls_ca: host.tls_ca ?? "",
      tls_cert: "",
      tls_key: ""
    };
    editingExistingTls = host.has_tls_cert && host.has_tls_key;
    testResult = null;
    dialogOpen = true;
  }

  function changeConnectionType(value: string | undefined) {
    if (!value) return;
    form.connection_type = value;
    // Only replace the address when it is still the placeholder for the previous type.
    if (!form.daemon.trim() || Object.values(DAEMON_PLACEHOLDERS).includes(form.daemon)) {
      form.daemon = DAEMON_PLACEHOLDERS[value];
    }
    testResult = null;
  }

  function payloadFromForm() {
    return {
      id: form.id || undefined,
      name: form.name.trim(),
      connection_type: form.connection_type,
      daemon: form.daemon.trim(),
      tls_ca: form.tls_ca.trim() || null,
      tls_cert: form.tls_cert.trim() || null,
      tls_key: form.tls_key.trim() || null
    };
  }

  async function testConnection() {
    testing = true;
    testResult = null;
    try {
      testResult = await callApi("testDockerHost", payloadFromForm());
    } catch (e) {
      testResult = { success: false, latency: 0, error: e instanceof Error ? e.message : "Test failed" };
    } finally {
      testing = false;
    }
  }

  async function save() {
    saving = true;
    try {
      await callApi("createUpdateDockerHost", payloadFromForm());
      toast.success(form.id ? "Docker host updated" : "Docker host created");
      dialogOpen = false;
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save Docker host");
    } finally {
      saving = false;
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    deleting = true;
    try {
      await callApi("deleteDockerHost", { id: deleteTarget.id });
      toast.success("Docker host deleted");
      deleteTarget = null;
      await fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete Docker host");
    } finally {
      deleting = false;
    }
  }

  onMount(fetchData);
</script>

<div class="container mx-auto space-y-6 py-6">
  <div class="flex items-start justify-between gap-4">
    <p class="text-muted-foreground max-w-2xl text-sm">
      Docker hosts are reusable connections to a Docker Engine. Point any number of
      <strong>Docker Container</strong> monitors at the same host instead of repeating the connection details on each monitor.
    </p>
    <div class="flex items-center gap-3">
      {#if loading}
        <Spinner class="size-5" />
      {/if}
      <Button onclick={openCreate}>
        <PlusIcon class="size-4" />
        New Docker Host
      </Button>
    </div>
  </div>

  {#if hosts.length === 0 && !loading}
    <div class="text-muted-foreground py-8 text-center">No Docker hosts configured</div>
  {:else}
    <div class="ktable rounded-xl border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head class="w-[240px]">Name</Table.Head>
            <Table.Head class="w-[200px]">Connection</Table.Head>
            <Table.Head>Address</Table.Head>
            <Table.Head class="w-[160px] text-right"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each hosts as host (host.id)}
            <Table.Row>
              <Table.Cell class="font-medium">{host.name}</Table.Cell>
              <Table.Cell>
                <Badge variant="outline">{host.connection_type}</Badge>
              </Table.Cell>
              <Table.Cell class="font-mono text-xs">{host.daemon}</Table.Cell>
              <Table.Cell class="text-right">
                <Button variant="outline" size="sm" onclick={() => openEdit(host)}>
                  <PencilIcon class="size-4" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${host.name}`}
                  onclick={() => (deleteTarget = host)}
                >
                  <Trash2Icon class="text-destructive size-4" />
                </Button>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}
</div>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="kener-manage max-h-[90vh] overflow-y-auto sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>{form.id ? "Edit Docker Host" : "New Docker Host"}</Dialog.Title>
      <Dialog.Description>
        Kener reaches the Docker Engine API from the machine it runs on. Mount the socket or expose the daemon so the
        Kener process can see it.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div class="flex flex-col gap-2">
        <Label for="docker-host-name">Name <span class="text-destructive">*</span></Label>
        <Input id="docker-host-name" bind:value={form.name} placeholder="Production swarm node 1" />
      </div>

      <div class="flex flex-col gap-2">
        <Label for="docker-host-connection">Connection Type</Label>
        <Select.Root type="single" value={form.connection_type} onValueChange={changeConnectionType}>
          <Select.Trigger id="docker-host-connection" class="w-full">
            {CONNECTION_TYPE_LABELS[form.connection_type]}
          </Select.Trigger>
          <Select.Content>
            {#each DOCKER_CONNECTION_TYPES as type (type)}
              <Select.Item value={type}>{CONNECTION_TYPE_LABELS[type]}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <div class="flex flex-col gap-2">
        <Label for="docker-host-daemon">
          {form.connection_type === "socket" ? "Socket Path" : "Daemon Address"}
          <span class="text-destructive">*</span>
        </Label>
        <Input
          id="docker-host-daemon"
          bind:value={form.daemon}
          placeholder={DAEMON_PLACEHOLDERS[form.connection_type]}
        />
        {#if form.connection_type === "socket"}
          <p class="text-muted-foreground text-xs">
            When Kener itself runs in Docker, mount the socket read-only:
            <code>-v /var/run/docker.sock:/var/run/docker.sock:ro</code>
          </p>
        {:else if form.connection_type === "tcp"}
          <p class="text-muted-foreground text-xs">
            Unencrypted TCP grants full control of the daemon to anyone who can reach the port. Use it only on a trusted
            network, or put a read-only socket proxy in front of it.
          </p>
        {/if}
      </div>

      {#if form.connection_type === "tls"}
        <div class="flex flex-col gap-2">
          <Label for="docker-host-ca">CA Certificate (PEM)</Label>
          <Textarea id="docker-host-ca" bind:value={form.tls_ca} rows={3} placeholder="-----BEGIN CERTIFICATE-----" />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="docker-host-cert">
            Client Certificate (PEM) {#if !editingExistingTls}<span class="text-destructive">*</span>{/if}
          </Label>
          <Textarea
            id="docker-host-cert"
            bind:value={form.tls_cert}
            rows={3}
            placeholder="-----BEGIN CERTIFICATE-----"
          />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="docker-host-key">
            Client Key (PEM) {#if !editingExistingTls}<span class="text-destructive">*</span>{/if}
          </Label>
          <Textarea id="docker-host-key" bind:value={form.tls_key} rows={3} placeholder="-----BEGIN PRIVATE KEY-----" />
        </div>
        {#if editingExistingTls}
          <p class="text-muted-foreground text-xs">
            The stored client certificate and key are never shown. Leave those blank to keep them unchanged. The CA
            field is shown in full — clearing it falls back to system CA trust.
          </p>
        {/if}
      {/if}

      {#if testResult}
        {#if testResult.success}
          <div class="rounded-md border p-3 text-sm">
            <div class="font-medium">Connected in {testResult.latency}ms</div>
            <div class="text-muted-foreground mt-1">
              Docker {testResult.version} · API {testResult.apiVersion} · {testResult.platform}
              {#if testResult.containerCount !== undefined}
                · {testResult.containerCount} container(s)
              {/if}
            </div>
          </div>
        {:else}
          <div class="bg-destructive/10 text-destructive rounded-md p-3 text-sm font-medium">
            {testResult.error}
          </div>
        {/if}
      {/if}
    </div>

    <Dialog.Footer class="gap-2">
      <Button variant="secondary" onclick={testConnection} disabled={testing || !isFormValid}>
        {#if testing}
          <Spinner class="size-4" />
        {:else}
          <PlugZapIcon class="size-4" />
        {/if}
        Test Connection
      </Button>
      <Button onclick={save} disabled={saving || !isFormValid}>
        {#if saving}
          <Spinner class="size-4" />
        {/if}
        Save
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<AlertDialog.Root open={!!deleteTarget} onOpenChange={(open) => !open && (deleteTarget = null)}>
  <AlertDialog.Content class="kener-manage">
    <AlertDialog.Header>
      <AlertDialog.Title>Delete "{deleteTarget?.name}"?</AlertDialog.Title>
      <AlertDialog.Description>
        Monitors still pointing at this host will stop working. Deletion is refused while any monitor uses it.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={deleting}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={confirmDelete} disabled={deleting}>
        {#if deleting}
          <Spinner class="size-4" />
        {/if}
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
