<script>
    import * as Card from "$lib/components/ui/card";
    export let data;
    import { Separator } from "$lib/components/ui/separator";
    import moment from "moment";
    import { Badge } from "$lib/components/ui/badge";
    import { ArrowDown, ArrowUp, ChevronUp, BadgeCheck, ChevronDown } from "lucide-svelte";
    import * as Collapsible from "$lib/components/ui/collapsible";
</script>
<section class="mx-auto flex w-full max-w-4xl flex-1 flex-col items-start justify-center">
    <div class="mx-auto max-w-screen-xl px-4 pt-32 pb-16 lg:flex lg:items-center">
        <div class="mx-auto max-w-3xl text-center blurry-bg">
            <h1 class="bg-gradient-to-r from-green-300 via-blue-500 to-purple-600 bg-clip-text text-5xl font-extrabold text-transparent leading-snug">{data.monitor.name}</h1>

            <p class="mx-auto mt-4 max-w-xl sm:text-xl">{data.monitor.description}</p>
        </div>
    </div>
</section>
<section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full" id="active_incident">
    <div class="container">
        <h1 class="mb-4 text-2xl font-bold leading-none">
            <Badge variant="outline text-2xl bg-red-500"> Active Incidents </Badge>
        </h1>

        {#if data.activeIncidents.length > 0} {#each data.activeIncidents as incident}
        <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="col-span-3">
                <Card.Root>
                    <Card.Header>
                        <Card.Title class="relative">
                            {incident.title}
                            <span class="animate-ping absolute -left-[24px] -top-[24px] w-[8px] h-[8px] inline-flex rounded-full h-3 w-3 bg-red-500 opacity-75"></span>
                        </Card.Title>
                        <Card.Description> {moment(incident.created_at).format("MMMM Do YYYY, h:mm:ss a")} </Card.Description>
                    </Card.Header>
                    <Card.Content>
                        {@html incident.body} {#if incident.comments.length > 0}
                        <div class="ml-4 mt-8">
                            <ol class="relative border-s border-secondary">
                                {#each incident.comments as comment}
                                <li class="mb-10 ms-4">
                                    <div class="absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border border-secondary bg-secondary border-secondary"></div>
                                    <time class="mb-1 text-sm font-normal leading-none text-muted-foreground"> {moment(comment.created_at).format("MMMM Do YYYY, h:mm:ss a")} </time>
                                    <div class="mb-4 text-base font-normal wysiwyg">{@html comment.body}</div>
                                </li>
                                {/each}
                            </ol>
                        </div>
                        {/if}
                    </Card.Content>
                </Card.Root>
            </div>
        </div>

        {/each} {:else}
        <div class="flex items-center justify-left">
            <p class="text-xl">No active incidents</p>
            <picture>
                <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f91e_1f3fb/512.webp" type="image/webp" />
                <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f91e_1f3fb/512.gif" alt="🤞" width="32" height="32" />
            </picture>
        </div>
        {/if}
    </div>
</section>

<Separator class="container mb-4 w-[400px]" />
<section class="mx-auto flex-1 mt-8 flex-col mb-4 flex w-full" id="past_incident">
    <div class="container">
        <h1 class="mb-4 text-2xl font-bold leading-none">
            <Badge variant="outline text-2xl bg-red-500"> Past Incidents </Badge>
        </h1>

        {#if data.pastIncidents.length > 0} {#each data.pastIncidents as incident, i}
        <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="col-span-3">
                <Card.Root>
                    <Collapsible.Root>
                        <Collapsible.Trigger class="w-full text-left">
                            <Card.Header class="relative" on:click="{(e) => {data.pastIncidents[i].collapsed = !data.pastIncidents[i].collapsed}}">
                                <Card.Title class="relative"> {incident.title} </Card.Title>
                                <Card.Description> {moment(incident.created_at).format("MMMM Do YYYY, h:mm:ss a")} </Card.Description>
                                <ChevronDown class="absolute right-5" size="{32}" />
                            </Card.Header>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <Card.Content>
                                {@html incident.body} {#if incident.comments.length > 0}
                                <div class="ml-4 mt-8">
                                    <ol class="relative border-s border-secondary">
                                        {#each incident.comments as comment}
                                        <li class="mb-10 ms-4">
                                            <div class="absolute w-3 h-3 rounded-full mt-1.5 -start-1.5 border border-secondary bg-secondary border-secondary"></div>
                                            <time class="mb-1 text-sm font-normal leading-none text-muted-foreground"> {moment(comment.created_at).format("MMMM Do YYYY, h:mm:ss a")} </time>
                                            <div class="mb-4 wysiwyg text-base font-normal">{@html comment.body}</div>
                                        </li>
                                        {/each}
                                    </ol>
                                </div>
                                {/if}
                            </Card.Content>
                        </Collapsible.Content>
                    </Collapsible.Root>
                </Card.Root>
            </div>
        </div>

        {/each} {:else}
        <div class="flex items-center justify-left">
            <p class="  text-xl">No past incidents</p>
            <picture>
                <source srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/270c_1f3fb/512.webp" type="image/webp" />
                <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/270c_1f3fb/512.gif" alt="✌" width="32" height="32" />
            </picture>
        </div>
        {/if}
    </div>
</section>
