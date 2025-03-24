<script>
  import HomePage from "$lib/components/manage/homePage.svelte";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import ExternalLink from "lucide-svelte/icons/external-link";

  export let data;
</script>

<div class="min-h-[70vh]">
  <div class="flex justify-end">
    <Button variant="outline" href="https://kener.ing/docs/home-page" class=" text-sm">
      Documentation <ExternalLink size="12" class="ml-1" />
    </Button>
  </div>
  <HomePage {data} />
</div>
