<script>
  import AlertsInfo from "$lib/components/manage/alertsInfo.svelte";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import ExternalLink from "lucide-svelte/icons/external-link";

  export let data;
</script>

<div class="min-h-[70vh]">
  <div class="flex justify-end">
    <Button variant="outline" href="https://kener.ing/docs/alerts" class=" text-sm">
      Documentation <ExternalLink size="12" class="ml-1" />
    </Button>
  </div>
  <AlertsInfo {data} />
</div>
