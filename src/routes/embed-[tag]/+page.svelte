<script>
    import Monitor from "$lib/components/monitor.svelte";
    import * as Card from "$lib/components/ui/card";
    import { Separator } from "$lib/components/ui/separator";
    import { Badge } from "$lib/components/ui/badge";
    import { page } from "$app/stores";
    import { onMount, afterUpdate, onDestroy } from "svelte";

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
				slug: $page.params.tag,
			},
			"*"
		);
	}

	onMount(() => {
		if (data.theme === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.add("dark:bg-background");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.remove("dark:bg-background");
		}
		
	});

    
	
     
</script>
{#if data.monitors.length > 0}
<section class="w-fit p-0" bind:this="{element}">
    <Card.Root class="w-[580px] border-0 shadow-none">
        <Card.Content class="p-0 monitors-card ">
            {#each data.monitors as monitor}
            <Monitor {monitor} localTz="{data.localTz}"  on:heightChange={handleHeightChange}/>
            {/each}
        </Card.Content>
    </Card.Root>
</section>
{:else}
<section class="mx-auto bg-transparent mb-4 flex w-full max-w-[890px] flex-1 flex-col items-start justify-center" id="">
    <Card.Root class="mx-auto">
        <Card.Content class="pt-4">
            <h1 class="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-2xl text-center">No Monitor Found.</h1>
            <p class="mt-3 text-center">
                Please read the documentation on how to add monitors
                <a href="https://kener.ing/docs#h1add-monitors" target="_blank" class="underline">here</a>.
            </p>
        </Card.Content>
    </Card.Root>
</section>
{/if}
