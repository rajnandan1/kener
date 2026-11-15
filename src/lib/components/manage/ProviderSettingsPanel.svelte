<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import Loader from "@lucide/svelte/icons/loader";
  import ShieldCheck from "@lucide/svelte/icons/shield-check";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";
  import type { ProviderDefinition } from "$lib/client/types/provider-settings.js";

  interface Props {
    initialProviders: ProviderDefinition[];
    description: string;
    learnMoreUrl?: string;
    enforceSingleActive?: boolean;
  }

  let { initialProviders, description, learnMoreUrl, enforceSingleActive = false }: Props = $props();

  let loading = $state(true);
  let saving = $state(false);
  // svelte-ignore state_referenced_locally -- intentional one-time seed: both
  // call sites pass a static, page-local `const` array that never changes.
  let providers = $state<ProviderDefinition[]>(
    initialProviders.map((p) => ({ ...p, requirements: p.requirements.map((r) => ({ ...r })) }))
  );
  let selected = $state<ProviderDefinition | null>(null);
  // Whether `providers` currently reflects a real, successful load from the
  // server. Guards the single-active cross-provider save below: if the load
  // never succeeded, `providers` only holds seeded placeholder values, and
  // saving would overwrite other providers' real stored credentials with
  // those empty defaults.
  let loadSucceeded = $state(false);

  async function fetchData() {
    loading = true;
    try {
      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getAllSiteData" })
      });
      const result = await response.json();

      if (result.error) {
        toast.error($adminT(result.error));
      } else {
        providers = providers.map((provider) => {
          const dbData = result[provider.key];
          if (dbData) {
            provider.isEnabled = dbData.isEnabled || false;
            provider.activeInSite = dbData.isEnabled || false;
            if (dbData.requirements) {
              provider.requirements = provider.requirements.map((req) => ({
                ...req,
                value: dbData.requirements[req.label] || req.value
              }));
            }
          }
          return provider;
        });
        loadSucceeded = true;
      }
    } catch (e) {
      toast.error($adminT("Failed to load settings"));
    } finally {
      selected = providers[0] ?? null;
      loading = false;
    }
  }

  async function save() {
    if (!selected) return;

    if (enforceSingleActive && selected.isEnabled && !loadSucceeded) {
      toast.error(
        $adminT("Provider data hasn't finished loading. Reload the page and try again before enabling a provider.")
      );
      return;
    }

    saving = true;
    try {
      const requirementsData: Record<string, string> = {};
      selected.requirements.forEach((req) => {
        requirementsData[req.label] = req.value;
      });

      const dataToSave: Record<string, string> = {};
      dataToSave[selected.key] = JSON.stringify({
        requirements: requirementsData,
        isEnabled: selected.isEnabled
      });

      // Single-active providers (e.g. CAPTCHA): enabling one must explicitly
      // disable every other currently-enabled provider server-side too, or a
      // stale isEnabled:true from a previous save stays active alongside it.
      if (enforceSingleActive && selected.isEnabled) {
        for (const provider of providers) {
          if (provider.key === selected.key || !provider.isEnabled) continue;
          const otherRequirements: Record<string, string> = {};
          provider.requirements.forEach((req) => {
            otherRequirements[req.label] = req.value;
          });
          dataToSave[provider.key] = JSON.stringify({ requirements: otherRequirements, isEnabled: false });
        }
      }

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "storeSiteData", data: dataToSave })
      });

      const result = await response.json();
      if (result.error) {
        toast.error($adminT(result.error));
      } else {
        toast.success($adminT("{label} settings saved successfully", { label: $adminT(selected.label) }));
        if (enforceSingleActive && selected.isEnabled) {
          providers = providers.map((provider) =>
            provider.key === selected!.key ? provider : { ...provider, isEnabled: false, activeInSite: false }
          );
        }
        const index = providers.findIndex((p) => p.key === selected!.key);
        if (index !== -1) {
          providers[index].activeInSite = selected.isEnabled;
        }
      }
    } catch (e) {
      toast.error($adminT("Failed to save settings"));
    } finally {
      saving = false;
    }
  }

  onMount(() => {
    fetchData();
  });
</script>

<div class="flex w-full flex-col gap-4 px-4">
  <div>
    {$adminT(String(description ?? ""))}
    {#if learnMoreUrl}
      <a
        href={learnMoreUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="text-primary ml-1 underline underline-offset-2">{$adminT("Learn more")}</a
      >.
    {/if}
  </div>
  {#if loading}
    <div class="flex items-center justify-center py-8">
      <Spinner />
    </div>
  {:else}
    <div class="grid grid-cols-4 overflow-hidden rounded-md border">
      <div class="col-span-1 flex flex-col border-r">
        {#each providers as provider (provider.key)}
          <Button
            variant={selected?.key === provider.key ? "secondary" : "ghost"}
            class="flex items-center justify-between gap-x-2 rounded-none border-b text-sm last:border-none"
            onclick={() => (selected = provider)}
          >
            <div class="flex flex-row items-center gap-x-3">
              {#if provider.logo}
                <img
                  src={clientResolver(resolve, provider.logo)}
                  class="w-5"
                  alt={$adminT(String(provider.label ?? ""))}
                />
              {:else}
                <ShieldCheck class="text-muted-foreground h-5 w-5" />
              {/if}
              <span>{$adminT(String(provider.label ?? ""))}</span>
            </div>
            {#if provider.activeInSite && provider.isEnabled}
              <div class="rounded-sm">
                <span class="relative flex size-2">
                  <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
                  ></span>
                  <span class="relative inline-flex size-2 rounded-full bg-green-500"></span>
                </span>
              </div>
            {/if}
          </Button>
        {/each}
      </div>

      <form
        onsubmit={(e) => {
          e.preventDefault();
          save();
        }}
        class="col-span-3 flex flex-col justify-between p-4"
      >
        {#if selected}
          <div>
            <div class="text-muted-foreground mb-4 text-sm font-medium">
              {$adminT("Add details for your {label} account", { label: $adminT(selected.label) })}
            </div>

            <div class="grid grid-cols-2 gap-4">
              {#each selected.requirements as req (req.label)}
                {@const fieldId = `${selected.key}-${req.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                <div class="flex flex-col gap-y-2">
                  <Label for={fieldId}>{$adminT(String(req.label ?? ""))}</Label>
                  <Input
                    bind:value={req.value}
                    type={req.type}
                    id={fieldId}
                    placeholder={$adminT(String(req.placeholder ?? ""))}
                    required={req.required}
                  />
                </div>
              {/each}
              <div class="flex flex-col gap-2">
                <Label for="provider-enabled">{$adminT("Status")}</Label>
                <Select.Root
                  type="single"
                  value={selected.isEnabled ? "enabled" : "disabled"}
                  onValueChange={(value) => {
                    if (!value || !selected) return;
                    selected.isEnabled = value === "enabled";
                  }}
                >
                  <Select.Trigger id="provider-enabled" class="w-32">
                    {selected.isEnabled ? $adminT("Enabled") : $adminT("Disabled")}
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="enabled">{$adminT("Enabled")}</Select.Item>
                    <Select.Item value="disabled">{$adminT("Disabled")}</Select.Item>
                  </Select.Content>
                </Select.Root>
              </div>
            </div>

            <div class="mt-4 flex flex-row items-center justify-between">
              <Button type="submit" disabled={saving}>
                {$adminT("Save Changes for")}
                {$adminT(String(selected.label ?? ""))}
                {#if saving}
                  <Loader class="ml-2 inline size-4 animate-spin" />
                {/if}
              </Button>
            </div>
          </div>
        {/if}
      </form>
    </div>
  {/if}
</div>
