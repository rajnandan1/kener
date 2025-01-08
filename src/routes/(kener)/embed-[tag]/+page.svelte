<script>
	import Monitor from "$lib/components/monitor.svelte";
	import * as Card from "$lib/components/ui/card";
	import { Separator } from "$lib/components/ui/separator";
	import { Badge } from "$lib/components/ui/badge";
	import { page } from "$app/stores";
	import { onMount, afterUpdate, onDestroy } from "svelte";
	import { l } from "$lib/i18n/client";

	let element;
	let previousHeight = 0;
	let previousWidth = 0;
	export let data;

	function handleHeightChange(event) {
		//use window.postMessage to send the height to the parent

		window.parent.postMessage(
			{
				height: element.offsetHeight,
				width: element.offsetWidth,
				slug: $page.params.tag
			},
			"*"
		);
	}

	onMount(() => {
		if (data.theme === "dark") {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	});
</script>

{#if data.monitors.length > 0}
	<section class="w-fit p-0" bind:this={element}>
		<Card.Root class="w-[575px] rounded-none border-0 bg-transparent pt-0 shadow-none">
			<Card.Content class="monitors-card embed p-0 pt-0">
				{#each data.monitors as monitor}
					<Monitor
						{monitor}
						localTz={data.localTz}
						lang={data.lang}
						on:heightChange={handleHeightChange}
					/>
				{/each}
			</Card.Content>
		</Card.Root>
	</section>
{:else}
	<section
		class="mx-auto mb-4 flex w-full max-w-[655px] flex-1 flex-col items-start justify-center bg-transparent"
		id=""
	>
		<Card.Root class="mx-auto bg-transparent">
			<Card.Content class="bg-transparent pt-4">
				<h1
					class="scroll-m-20 text-center text-2xl font-extrabold tracking-tight lg:text-2xl"
				>
					No Monitor Found.
				</h1>
				<p class="mt-3 text-center">
					{l(data.lang, "root.read_doc_monitor")}
					<a
						href="https://kener.ing/docs#h1add-monitors"
						target="_blank"
						class="underline"
					>
						{l(data.lang, "root.here")}
					</a>
				</p>
			</Card.Content>
		</Card.Root>
	</section>
{/if}
