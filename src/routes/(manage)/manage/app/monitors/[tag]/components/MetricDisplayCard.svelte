<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import type { MonitorRecord, MonitorValueDisplay } from "$lib/server/types/db.js";
  import { toast } from "svelte-sonner";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface Props {
    monitor: MonitorRecord;
    typeData: Record<string, unknown>;
    valueDisplayForm: {
      name: string;
      unit: string;
      decimals: number | undefined;
    };
    onSaved?: (valueDisplay: MonitorValueDisplay | undefined) => void;
  }

  let { monitor = $bindable(), typeData, valueDisplayForm = $bindable(), onSaved }: Props = $props();

  let saving = $state(false);

  const isDecimalsValid = $derived(
    valueDisplayForm.decimals === undefined ||
      (typeof valueDisplayForm.decimals === "number" &&
        Number.isInteger(valueDisplayForm.decimals) &&
        valueDisplayForm.decimals >= 0 &&
        valueDisplayForm.decimals <= 4)
  );

  function buildValueDisplay(): MonitorValueDisplay | undefined {
    const valueDisplay: MonitorValueDisplay = {};
    const name = valueDisplayForm.name.trim();
    if (name) {
      valueDisplay.name = name;
    }
    const unitInput = valueDisplayForm.unit.trim();
    if (unitInput) {
      // The literal text "none" means "no unit suffix" (bare number).
      valueDisplay.unit = unitInput.toLowerCase() === "none" ? "" : unitInput;
    }
    if (typeof valueDisplayForm.decimals === "number" && isDecimalsValid) {
      valueDisplay.decimals = valueDisplayForm.decimals;
    }
    return Object.keys(valueDisplay).length > 0 ? valueDisplay : undefined;
  }

  async function save() {
    if (!isDecimalsValid) {
      toast.error("Decimals must be a whole number between 0 and 4");
      return;
    }

    saving = true;
    try {
      // Merge with existing monitor_settings_json to avoid overwriting other settings
      let existingSettings: Record<string, unknown> = {};
      if (monitor.monitor_settings_json) {
        try {
          existingSettings = JSON.parse(monitor.monitor_settings_json);
        } catch {
          existingSettings = {};
        }
      }

      const mergedSettings: Record<string, unknown> = { ...existingSettings };
      const valueDisplay = buildValueDisplay();
      if (valueDisplay) {
        mergedSettings.value_display = valueDisplay;
      } else {
        delete mergedSettings.value_display;
      }

      const payload = {
        ...monitor,
        type_data: JSON.stringify(typeData),
        monitor_settings_json: JSON.stringify(mergedSettings)
      };

      const response = await fetch(clientResolver(resolve, "/manage/api"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "storeMonitorData", data: payload })
      });

      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
      } else {
        // Update the monitor's settings_json so subsequent saves from other cards stay in sync
        monitor.monitor_settings_json = JSON.stringify(mergedSettings);
        onSaved?.(valueDisplay);
        toast.success("Metric display settings saved successfully");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save metric display settings";
      toast.error(message);
    } finally {
      saving = false;
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Metric Display</Card.Title>
    <Card.Description>
      Configure how this monitor's numeric value is displayed. Leave everything empty for the default latency display
      in milliseconds.
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    <div class="grid grid-cols-3 gap-4">
      <div class="space-y-2">
        <Label for="metric-display-name">Display name</Label>
        <Input id="metric-display-name" type="text" maxlength={64} placeholder="Latency" bind:value={valueDisplayForm.name} />
        <p class="text-muted-foreground text-xs">Replaces "Latency" in charts and labels</p>
      </div>
      <div class="space-y-2">
        <Label for="metric-display-unit">Unit</Label>
        <Input id="metric-display-unit" type="text" maxlength={32} placeholder="ms" bind:value={valueDisplayForm.unit} />
        <p class="text-muted-foreground text-xs">e.g. items, %, req/s — enter "none" for a bare number</p>
      </div>
      <div class="space-y-2">
        <Label for="metric-display-decimals">Decimals</Label>
        <Input
          id="metric-display-decimals"
          type="number"
          step="1"
          min="0"
          max="4"
          placeholder="Auto"
          bind:value={valueDisplayForm.decimals}
          class={isDecimalsValid ? "" : "border-destructive"}
        />
        <p class="text-muted-foreground text-xs">Empty = auto (up to 2)</p>
      </div>
    </div>
    <p class="text-muted-foreground text-xs">
      With the default "ms" unit, values keep the automatic ms/s/m/h scaling and readings of 0 are treated as no data.
      Any other unit shows plain numbers where 0 is a valid reading. Note: raw readings are stored with 2 decimal
      places on MySQL.
    </p>
  </Card.Content>
  <Card.Footer class="flex justify-end">
    <Button onclick={save} disabled={saving || !isDecimalsValid}>
      {#if saving}
        <Loader class="size-4 animate-spin" />
      {:else}
        <SaveIcon class="size-4" />
      {/if}
      Save Metric Display Settings
    </Button>
  </Card.Footer>
</Card.Root>
