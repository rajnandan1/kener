<script>
  import SubscriberInfo from "$lib/components/manage/subscriberInfo.svelte";
  import { Button } from "$lib/components/ui/button";
  import { ExternalLink } from "lucide-svelte";
</script>

<div class="min-h-[70vh]">
  <div class="flex justify-end">
    <Button variant="outline" href="https://kener.ing/docs/home-page" class=" text-sm">
      Documentation <ExternalLink size="12" class="ml-1" />
    </Button>
  </div>
  <SubscriberInfo />
</div>
