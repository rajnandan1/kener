<script>
    import { marked } from 'marked';
    import { onMount } from "svelte";
    import * as Card from "$lib/components/ui/card";
	import * as Accordion from "$lib/components/ui/accordion";
    export let data;
	
    let html = marked.parse(data.md);
    let sideBar = [];
    function locationHashChanged() {
        const allSideAs = document.querySelectorAll(".sidebar-a");
		allSideAs.forEach((sideA) => {
			sideA.classList.remove("active");
		});
		document.querySelector(`[href="${window.location.hash}"]`).classList.add("active");
    }
    onMount(async () => {
        const headings = document.querySelectorAll("#markdown h1");
        headings.forEach((heading) => {
            const id = "h1" + heading.textContent.replace(/[^a-z0-9]/gi, "-").toLowerCase();
            heading.id = id;
            heading.setAttribute("sider", "sidemenu");
            heading.setAttribute("sider-t", "h1");
        });

        const headings2 = document.querySelectorAll("#markdown h2");
        headings2.forEach((heading) => {
            const id = "h2" + heading.textContent.replace(/[^a-z0-9]/gi, "-").toLowerCase();
            heading.id = id;
            heading.setAttribute("sider", "sidemenu");
            heading.setAttribute("sider-t", "h2");
        });

        const sidemenuHeadings = document.querySelectorAll("#markdown [sider='sidemenu']");
        //iterate over all headings and create nexted sidebar, if h2 the add to last h1
		let lastH1 = null;
		let lastH2 = null;
		sidemenuHeadings.forEach((heading) => {
			if (heading.getAttribute("sider-t") == "h1") {
				lastH1 = {
					id: heading.id,
					text: heading.textContent,
					type: heading.getAttribute("sider-t"),
					children: [],
				};
				sideBar = [...sideBar, lastH1];
			} else if (heading.getAttribute("sider-t") == "h2") {
				lastH2 = {
					id: heading.id,
					text: heading.textContent,
					type: heading.getAttribute("sider-t"),
				};
				lastH1.children = [...lastH1.children, lastH2];
			}
		});

        window.onhashchange = locationHashChanged;
		
		
    });
</script>
<svelte:head>
	<title>
		Kener Documentation
	</title>
</svelte:head>
<section class="mx-auto md:container rounded-3xl scroll-smooth mt-8">
    <Card.Root>
        <Card.Content class="px-1">
            <div class="grid grid-cols-5 gap-4">
                <div class="col-span-5 md:col-span-1 pt-2 hidden md:block pr-1 border-r-2 border-secondary sticky top-0 overflow-y-auto max-h-screen">
					{#each sideBar as item}
					<Accordion.Root>
						<Accordion.Item value="{item.id}">
							<Accordion.Trigger class="text-sm font-semibold pl-2 pr-3">
								<a href="#{item.id}" class="sidebar-a">{item.text}</a>
							</Accordion.Trigger>
							<Accordion.Content>
							<!-- <ul class="w-full text-sm font-medium sticky top-0 overflow-y-auto max-h-screen"> -->
							<ul class=" text-sm font-medium pl-6">
									{#each item.children as child}
									<li class="w-full py-2">
										<a href="#{child.id}" class="sidebar-a">{child.text}</a>
									</li>
									{/each}
								</ul>
							</Accordion.Content>
						</Accordion.Item>
					</Accordion.Root>
					{/each}
                    
                </div>
                <div class="col-span-5 md:col-span-4">
                    <div class="pt-6 p-0 md:p-10 ">
                        <article
                            id="markdown"
                            class="prose prose-stone max-w-none dark:prose-invert dark:prose-pre:bg-neutral-900  prose-code:py-[0.2rem] prose-code:font-normal prose-code:font-mono prose-code:text-sm prose-code:rounded"
                        >
                            {@html html}
                        </article>
                    </div>
                </div>
            </div>
        </Card.Content>
    </Card.Root>
</section>
<style>
	.h1.inactive ~ .h2 {
		display: none;
	}
	#markdown code:not([class^="language-"]) {
		background-color: #faf6b2;
		border-radius: 4px;
		padding: 2px 4px;
		font-size: 0.833em;
		color: #000;
	}
	.sidebar-a.active{
		text-decoration: underline;
	}

</style>