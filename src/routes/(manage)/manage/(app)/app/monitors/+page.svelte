<script>
  import MonitorsAdd from "$lib/components/manage/monitorsAdd.svelte";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import ExternalLink from "lucide-svelte/icons/external-link";

  export let data;
</script>

<div class="min-h-[70vh]">
  <div class="flex justify-end">
    <Button variant="outline" href="https://kener.ing/docs/monitors" class=" text-sm">
      Documentation <ExternalLink size="12" class="ml-1" />
    </Button>
  </div>
  <MonitorsAdd
    monitorSort={data.siteData?.monitorSort}
    categories={data.categories}
    colorDown={data.siteData?.colors?.DOWN || "#ca3038"}
    colorDegraded={data.siteData?.colors?.DEGRADED || "#e6ca61"}
  />
</div>
