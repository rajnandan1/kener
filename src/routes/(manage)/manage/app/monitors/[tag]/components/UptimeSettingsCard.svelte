<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as InputGroup from "$lib/components/ui/input-group/index.js";
  import SaveIcon from "@lucide/svelte/icons/save";
  import Loader from "@lucide/svelte/icons/loader";
  import type { MonitorRecord } from "$lib/server/types/db.js";
  import { toast } from "svelte-sonner";
  import { resolve } from "$app/paths";
  import clientResolver from "$lib/client/resolver.js";

  interface Props {
    monitor: MonitorRecord;
    typeData: Record<string, unknown>;
    uptimeSettings: {
      uptime_formula_numerator: string;
      uptime_formula_denominator: string;
    };
  }

  let { monitor, typeData, uptimeSettings = $bindable() }: Props = $props();

  let savingUptimeSettings = $state(false);

  // Validate uptime formula
  function isValidUptimeFormula(formula: string): boolean {
    if (!formula || typeof formula !== "string") return false;

    const normalized = formula.toLowerCase().replace(/\s+/g, "");
    if (normalized.length === 0) return false;

    const validVars = ["up", "down", "degraded", "maintenance"];
    const validOperators = ["+", "-", "*", "/"];

    const tokens: string[] = [];
    let currentToken = "";

    for (const char of normalized) {
      if (validOperators.includes(char)) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = "";
        }
        tokens.push(char);
      } else {
        currentToken += char;
      }
    }
    if (currentToken) {
      tokens.push(currentToken);
    }

    if (tokens.length === 0) return false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (i % 2 === 0) {
        if (!validVars.includes(token)) return false;
      } else {
        if (!validOperators.includes(token)) return false;
      }
    }

    if (tokens.length % 2 === 0) return false;

    return true;
  }

  const isUptimeSettingsValid = $derived(
    isValidUptimeFormula(uptimeSettings.uptime_formula_numerator) &&
      isValidUptimeFormula(uptimeSettings.uptime_formula_denominator)
  );

  async function saveUptimeSettings() {
    if (!isUptimeSettingsValid) {
      toast.error("Invalid uptime formula. Use: up, down, degraded, maintenance with +, -, *, /");
      return;
    }

    savingUptimeSettings = true;
    try {
      const payload = {
        ...monitor,
        type_data: JSON.stringify(typeData),
        monitor_settings_json: JSON.stringify(uptimeSettings)
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
        toast.success("Uptime settings saved successfully");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save uptime settings";
      toast.error(message);
    } finally {
      savingUptimeSettings = false;
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Uptime Calculation</Card.Title>
    <Card.Description>Customize how uptime percentage is calculated for this monitor</Card.Description>
  </Card.Header>
  <Card.Content class="space-y-4">
    <div class="flex gap-2">
      <InputGroup.Root>
        <InputGroup.Addon>a =</InputGroup.Addon>
        <InputGroup.Input
          placeholder="up + maintenance"
          bind:value={uptimeSettings.uptime_formula_numerator}
          class={!isValidUptimeFormula(uptimeSettings.uptime_formula_numerator) ? "border-destructive" : ""}
        />
      </InputGroup.Root>
      <InputGroup.Root>
        <InputGroup.Addon>b =</InputGroup.Addon>
        <InputGroup.Input
          placeholder="up + maintenance + down + degraded"
          bind:value={uptimeSettings.uptime_formula_denominator}
          class={!isValidUptimeFormula(uptimeSettings.uptime_formula_denominator) ? "border-destructive" : ""}
        />
      </InputGroup.Root>
    </div>
    <div class="text-muted-foreground text-sm">
      <p><strong>Uptime % = (a / b) × 100</strong></p>
      <p class="mt-2 text-xs">
        Valid variables: <code class="bg-muted rounded px-1">up</code>,
        <code class="bg-muted rounded px-1">down</code>,
        <code class="bg-muted rounded px-1">degraded</code>,
        <code class="bg-muted rounded px-1">maintenance</code>
      </p>
      <p class="text-xs">
        Valid operators: <code class="bg-muted rounded px-1">+</code>,
        <code class="bg-muted rounded px-1">-</code>,
        <code class="bg-muted rounded px-1">*</code>,
        <code class="bg-muted rounded px-1">/</code>
      </p>
    </div>
  </Card.Content>
  <Card.Footer class="flex justify-end">
    <Button onclick={saveUptimeSettings} disabled={savingUptimeSettings || !isUptimeSettingsValid}>
      {#if savingUptimeSettings}
        <Loader class="size-4 animate-spin" />
      {:else}
        <SaveIcon class="size-4" />
      {/if}
      Save Uptime Settings
    </Button>
  </Card.Footer>
</Card.Root>
