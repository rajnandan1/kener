<script>
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import { fade } from "svelte/transition";
  import { X } from "lucide-svelte";
  import { onMount } from "svelte";
  import { base } from "$app/paths";

  export let showUnsubscribe = true;
  export let unsubtoken;
  let loadingData = false;
  let subscriber = { email: "", id: "", incident_id: "" };
  let incident = { id: "", title: "General Updates" };
  let error = null;
  let invalidFormMessage = "";
  let validFormMessage = "";

  async function fetchData(action, data) {
    try {
      const response = await fetch(base + "/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action, data })
      });
      return await response.json();
    } catch (err) {
      console.error(`Error fetching ${action}:`, err);
      throw new Error(`Failed to fetch ${action}. Please try again later.`);
    }
  }

  async function loadData() {
    loadingData = true;
    error = null;

    try {
      subscriber = await fetchData("getSubscriberByToken", { token: unsubtoken });
      if (subscriber.incident_id != 0) {
        incident = await fetchData("getIncidentByID", { id: subscriber.incident_id });
      }
    } catch (err) {
      error = err.message;
    } finally {
      loadingData = false;
    }
  }

  onMount(() => {
    if (showUnsubscribe) {
      loadData();
    }
  });

  async function unsubscribeSubscriber() {
    loadingData = true; // Set loading state for unsubscribe action
    try {
      const response = await fetch(base + "/api/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "UnsubscribeBySubscriberToken",
          data: { token: unsubtoken }
        })
      });
      const result = await response.json();
      validFormMessage = "Email successfully unsubscribed";
    } catch (err) {
      invalidFormMessage = "Failed to unsubscribe. Please try again later.";
    } finally {
      loadingData = false; // Reset loading state
      setTimeout(() => {
        showUnsubscribe = false;
      }, 2000);
    }
  }
</script>

{#if showUnsubscribe}
  <div
    class="modal-container fixed left-0 top-0 z-30 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm"
    transition:fade={{ duration: 100 }}
    on:click={() => {
      showUnsubscribe = false;
    }}
  >
    <div
      class="absolute left-1/2 top-1/2 h-fit w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg"
      on:click|stopPropagation
    >
      <Button
        variant="ghost"
        on:click={() => {
          showUnsubscribe = false;
        }}
        class="absolute right-2 top-2 z-40 h-6 w-6 rounded-full border bg-background p-1"
      >
        <X class="h-4 w-4 text-muted-foreground" />
      </Button>
      <div class="content px-4 py-4">
        {#if loadingData}
          <p>Loading...</p>
        {:else if error}
          <p class="text-red-500">{error}</p>
        {:else}
          <h2 class="text-lg font-semibold">
            Unsubscribe {subscriber.email} from {incident.title}
          </h2>
          <p class="text-xs text-muted-foreground">
            Unsubscribe from {incident.title} You'll stop receiving email notifications when this incident is updated.
          </p>
          {#if invalidFormMessage != ""}
            <div class="col-span-5 pt-2.5">
              <p class="text-right text-xs font-medium text-red-500">
                {invalidFormMessage}
              </p>
            </div>
          {:else if validFormMessage != ""}
            <div class="col-span-5 pt-2.5">
              <p class="text-right text-xs font-medium text-green-500">
                {validFormMessage}
              </p>
            </div>
          {/if}
          <hr class="my-4" />
          <div class="flex w-full items-center justify-center">
            <Button class="my-2 h-8 justify-center" on:click={() => unsubscribeSubscriber()}>Unsubscribe</Button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
