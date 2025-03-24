<script>
  import SeoInfo from "$lib/components/manage/seoInfo.svelte";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import ExternalLink from "lucide-svelte/icons/external-link";

  export let data;
</script>

<div class="min-h-[70vh]">
  <div class="flex justify-end">
    <Button variant="outline" href="https://kener.ing/docs/seo" class=" text-sm">
      Documentation <ExternalLink size="12" class="ml-1" />
    </Button>
  </div>
  <SeoInfo {data} />
</div>
