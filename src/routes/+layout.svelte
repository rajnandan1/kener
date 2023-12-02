<script>
    import "../app.postcss";
    import "../kener.css";
    import Nav from "$lib/components/nav.svelte";
    
	export let data;
</script>

<Nav {data} />
<svelte:head>
	<title>{data.site.title}</title>
	{#each Object.entries(data.site.metaTags) as [key, value]}
		<meta name={key} content={value} />
	{/each}
</svelte:head>
 
<slot  />
