<script>
    import md from "$lib/docs/docs.md?raw";
    import Markdoc from "@markdoc/markdoc";
    import { onMount } from "svelte";
    const ast = Markdoc.parse(md);
    const content = Markdoc.transform(ast);
    let html = Markdoc.renderers.html(content);
    let sideBar = [];
    onMount(() => {



        const headings = document.querySelectorAll("#markdown h1");
		headings.forEach((heading) => {
			const id  =  "h1" + heading.textContent.replace(/[^a-z0-9]/gi, '-').toLowerCase();
			heading.id = id;
			heading.setAttribute("sider", "sidemenu");
			heading.setAttribute("sider-t", "h1");
		})

		const headings2 = document.querySelectorAll("#markdown h2");
		headings2.forEach((heading) => {
			const id  =  "h2" + heading.textContent.replace(/[^a-z0-9]/gi, '-').toLowerCase();
			heading.id = id;
			heading.setAttribute("sider", "sidemenu");
			heading.setAttribute("sider-t", "h2");
		})

		const sidemenuHeadings = document.querySelectorAll("#markdown [sider='sidemenu']");
		sidemenuHeadings.forEach((heading) => {

			    sideBar = [...sideBar, {
				id: heading.id,
				text: heading.textContent,
				type: heading.getAttribute("sider-t")
			}];
		})

    });
</script>
<section class="mx-auto container rounded-3xl bg-white mt-32">
    <div class="grid grid-cols-5 gap-4">
        <div class="col-span-1">
            <ul class="w-full mt-1 sticky top-0 text-sm font-medium text-gray-900 bg-white mt-8  rounded-lg  ">
                {#each sideBar as item}
                <li class="w-full px-4 py-2    ">
                    <a href="#{item.id}" class="{item.type == 'h2'?'pl-5':''}">{item.text}</a>
                </li>
                {/each}
                <li class="w-full px-4 py-2 rounded-b-lg">Download</li>
            </ul>
           
        </div>
        <div class="col-span-4">
            <div class="bg-white    p-10 md">
                <article id="markdown" class="prose prose-stone max-w-none prose-code:bg-gray-200
				
				prose-code:px-[0.3rem] prose-code:py-[0.2rem] prose-code:font-mono prose-code:text-sm prose-code:rounded prose-code:font-mono  
				">{@html html}</article>
            </div>
        </div>
    </div>
</section>
