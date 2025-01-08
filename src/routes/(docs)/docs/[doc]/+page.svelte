<script>
	import { onMount } from "svelte";
	import { afterNavigate } from "$app/navigation";
	export let data;
	let subHeadings = [];
	let previousH2 = null;
	function fillSubHeadings() {
		subHeadings = [];
		const headings = document.querySelectorAll("#markdown h2, #markdown h3");
		headings.forEach((heading) => {
			let id = heading.textContent.replace(/[^a-z0-9]/gi, "-").toLowerCase();
			if (heading.tagName === "H2") {
				previousH2 = id;
			} else {
				id = `${previousH2}-${id}`;
			}
			heading.id = id;
			subHeadings.push({
				id,
				text: heading.textContent,
				level: heading.tagName === "H2" ? 2 : 3
			});
		});
	}

	afterNavigate(() => {
		document.dispatchEvent(
			new CustomEvent("pagechange", {
				bubbles: true,
				detail: {
					docFilePath: data.docFilePath
				}
			})
		);
		fillSubHeadings();
		document.dispatchEvent(
			new CustomEvent("rightbar", {
				bubbles: true,
				detail: {
					rightbar: subHeadings
				}
			})
		);
	});
	onMount(async () => {});
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="description" content={data.description} />
</svelte:head>

<div id="markdown">
	{@html data.md}
</div>

<style>
	#markdown {
		scroll-behavior: smooth;
	}
</style>
