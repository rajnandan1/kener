<script lang="ts">
  import { getAdminI18n } from "$lib/admin-i18n/context";
  const { t: adminT } = getAdminI18n();

  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import type { NoneMonitorTypeData } from "$lib/server/types/monitor.js";

  let { data = $bindable() }: { data: NoneMonitorTypeData } = $props();

  if (data.overrideWithLastKnownStatus === undefined) {
    data.overrideWithLastKnownStatus = false;
  }
</script>

<div class="space-y-4">
  <div class="bg-muted/50 rounded-lg p-6 text-center">
    <p class="text-muted-foreground text-sm">
      {$adminT(
        "This monitor type does not have any automatic checks. Status updates must be made manually via the API or through incidents."
      )}
    </p>
  </div>

  <div class="flex items-start gap-3 rounded-lg border p-4">
    <Checkbox id="none-override-last-known-status" bind:checked={data.overrideWithLastKnownStatus} />
    <div class="grid gap-1.5 leading-none">
      <Label for="none-override-last-known-status" class="cursor-pointer"
        >{$adminT("Override with last known status")}</Label
      >
      <p class="text-muted-foreground text-sm">
        {$adminT(
          "On each scheduled run, reuse the last manual status (created using the API) so this monitor keeps that state in status history, uptime, and alert evaluation until you change it."
        )}
      </p>
    </div>
  </div>
</div>
