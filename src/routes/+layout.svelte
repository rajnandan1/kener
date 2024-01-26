<script>
    import "../app.postcss";
    import "../kener.css";
    import Nav from "$lib/components/nav.svelte";
    import { onMount } from "svelte";
    export let data;
    onMount(() => {
        let localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (localTz != data.localTz) {
            
			if(data.isBot === false) {
				document.cookie = "localTz=" + localTz + ";max-age=" + 60 * 60 * 24 * 365 * 30;
				location.reload();
			}
            
        }
    });
</script>
{#if data.showNav}
<Nav {data} />
{/if}
<svelte:head>
    <title>{data.site.title}</title>
    {#each Object.entries(data.site.metaTags) as [key, value]}
    <meta name="{key}" content="{value}" />
    {/each}
</svelte:head>

<slot />
{#if data.showNav && !!data.site.footerHTML}
<footer class="py-6 z-10 md:px-8 md:py-0">
    <div class="container  relative flex flex-col pl-0 items-center justify-center max-w-[890px] gap-4 md:h-24 md:flex-row">
        <div class="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p class="text-center text-sm leading-loose text-muted-foreground md:text-left">
                {@html data.site.footerHTML}
            </p>
        </div>
    </div>
</footer>
{/if}
