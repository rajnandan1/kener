<script lang="ts">
  import type { NoneMonitorTypeData } from "$lib/server/types/monitor.js";

  let { data = $bindable() }: { data: NoneMonitorTypeData } = $props();
</script>

<div class="bg-muted/50 rounded-lg p-6 text-center">
  <p class="text-muted-foreground text-sm">
    This monitor type does not have any automatic checks. Status updates must be made manually via the API or through
    incidents.
  </p>
</div>
