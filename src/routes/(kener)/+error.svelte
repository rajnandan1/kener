<script lang="ts">
  import { page } from "$app/stores";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import Home from "@lucide/svelte/icons/home";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import AlertCircle from "@lucide/svelte/icons/alert-circle";
</script>

<div class="flex min-h-[60vh] items-center justify-center p-4">
  <Card.Root class="w-full max-w-md rounded-3xl border bg-transparent shadow-none">
    <Card.Content class="flex flex-col items-center gap-6 pt-10 pb-8 text-center">
      <div class="bg-muted flex size-16 items-center justify-center rounded-full">
        <AlertCircle class="text-muted-foreground size-8" />
      </div>

      <div class="space-y-2">
        <h1 class="text-4xl font-bold">{$page.status}</h1>
        <p class="text-muted-foreground text-lg">
          {#if $page.status === 404}
            The page you're looking for doesn't exist or has been moved.
          {:else if $page.status === 500}
            Something went wrong on our end. Please try again later.
          {:else}
            {$page.error?.message || "An unexpected error occurred."}
          {/if}
        </p>
      </div>

      <div class="flex gap-3">
        <Button variant="outline" onclick={() => history.back()} class="rounded-full">
          <ArrowLeft class="mr-2 size-4" />
          Go Back
        </Button>
        <Button href="/" class="rounded-full">
          <Home class="mr-2 size-4" />
          Home
        </Button>
      </div>
    </Card.Content>
  </Card.Root>
</div>
