<script>
    import "../app.postcss";
    import "../kener.css";
    import Nav from "$lib/components/nav.svelte";
	import { onMount } from "svelte";
	export let data;
	onMount(() => {
        var dt = new Date();
        let tzOffset = dt.getTimezoneOffset(); // -480
        
        if (tzOffset != data.tzOffset) {
            //set cookie with expiry 30 years and reload
            document.cookie = "tzOffset=" + tz + ";max-age=" + 60 * 60 * 24 * 365 * 30;
            location.reload();
        }
    });
</script>

<Nav {data} />
<svelte:head>
	<title>{data.site.title}</title>
	{#each Object.entries(data.site.metaTags) as [key, value]}
		<meta name={key} content={value} />
	{/each}
</svelte:head>
 
<slot  />
