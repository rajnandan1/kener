<script>
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { fade } from "svelte/transition";
	import IncidentSubscribe from "$lib/components/IncidentSubscribe.svelte";
	import { X } from "lucide-svelte";
	export let showSubscribe = true;
	export let selectedIncident;
</script>

<div
	class="moldal-container fixed left-0 top-0 z-30 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm"
	transition:fade={{ duration: 100 }}
	on:click={() => {
		showSubscribe = false;
	}}
>
	<div
		class="absolute left-1/2 top-1/2 h-fit w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg"
		on:click|stopPropagation
	>
		<Button
			variant="ghost"
			on:click={() => {
				showSubscribe = false;
			}}
			class="absolute right-2 top-2 z-40 h-6 w-6 rounded-full border bg-background p-1"
		>
			<X class="h-4 w-4 text-muted-foreground" />
		</Button>
		<div class="content px-4 py-4">
			<h2 class="text-lg font-semibold">Subscribe to {selectedIncident.title}</h2>
			<p class="text-xs text-muted-foreground">
				Subscribe to updates for {selectedIncident.title} via email. You'll receive email notifications
				when incidents are updated.
			</p>
			<hr class="my-4" />
			<IncidentSubscribe bind:showSubscribe id={selectedIncident.id} />
		</div>
	</div>
</div>
