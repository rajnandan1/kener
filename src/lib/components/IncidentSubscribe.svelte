<script>
  import { Button } from "$lib/components/ui/button";
  import { base } from "$app/paths";
  import { Loader } from "lucide-svelte";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  export let id;
  export let showSubscribe = true;
  let formState = "idle";
  let validFormMessage = "";
  let invalidFormMessage = "";
  let newSubscriber = {
    id: 0,
    email: "",
    incident_id: 0
  };

  async function addNewSubscriber() {
    invalidFormMessage = "";
    validFormMessage = "";
    formState = "loading";

    if (newSubscriber.email.trim() === "") {
      invalidFormMessage = "Email is required";
      formState = "idle";
      return;
    }

    // Email validation using regex
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(newSubscriber.email)) {
      invalidFormMessage = "Invalid email format";
      formState = "idle";
      return;
    }

    newSubscriber.incident_id = id;

    try {
      let response = await fetch(base + "/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ action: "subscribeToIncidentID", data: newSubscriber })
      });

      let resp = await response.json();
      if (resp.error) {
        invalidFormMessage = resp.message;
      }
      validFormMessage = "Email successfully subscribed";
    } catch (error) {
      // Set the invalid form message based on the error thrown
      invalidFormMessage = "Failed inserting email";
    } finally {
      formState = "idle";
      setTimeout(() => {
        showSubscribe = false;
      }, 2000);
    }
  }
</script>

<div>
  <div class="mt-2 w-full">
    <Label class="text-sm">
      Add Email Address
      <span class="text-red-500">*</span>
    </Label>
    <Input class="mt-2" bind:value={newSubscriber.email} placeholder="john@example.com" />
  </div>
  <div class="py-2.5">
    {#if invalidFormMessage != ""}
      <div class="col-span-5 pt-2.5">
        <p class="text-right text-xs font-medium text-red-500">{invalidFormMessage}</p>
      </div>
    {:else if validFormMessage != ""}
      <div class="col-span-5 pt-2.5">
        <p class="text-right text-xs font-medium text-green-500">{validFormMessage}</p>
      </div>
    {/if}
    <Button class="h-8" on:click={addNewSubscriber}>
      Submit
      {#if formState === "loading"}
        <Loader class="ml-2 inline h-4 w-4 animate-spin" />
      {/if}
    </Button>
  </div>
</div>
