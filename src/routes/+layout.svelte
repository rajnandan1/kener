<script>
    import "../app.postcss";
    import "../kener.css";
    import Nav from "$lib/components/nav.svelte";
	export let data;
	
	var dt = new Date();
let tz = dt.getTimezoneOffset(); // -480
console.log(tz);
	if(tz != data.tzOffset){
		//set cookie and reload
		document.cookie = "tzOffset="+tz;
		//location.reload();

	}
</script>
<input type="hidden" value="{data.tzOffset}">
<Nav {data} />
<svelte:head>
	<title>{data.site.title}</title>
	{#each Object.entries(data.site.metaTags) as [key, value]}
		<meta name={key} content={value} />
	{/each}
</svelte:head>
 
<slot  />
