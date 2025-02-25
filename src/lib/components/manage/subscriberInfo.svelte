<script>
	import { Button } from "$lib/components/ui/button";
	import { base } from "$app/paths";
	import { Loader } from "lucide-svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { onMount } from "svelte";

	let formState = "idle";
	let invalidFormMessage = "";
	let subscribers = [];
	let loadingData = false;

	let newSubscriber = {
		id: 0,
		email: "",
		incident_id: 0
	};

	async function addNewSubscriber() {
		invalidFormMessage = "";
		formState = "loading";

		if (newSubscriber.email == "") {
			invalidFormMessage = "Email is required";
			formState = "idle";
			return;
		}
		if (newSubscriber.email.trim() === "") {
			invalidFormMessage = "Email is required";
			formState = "idle";
			return;
		}
		// Email validation using regex
		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailPattern.test(newSubscriber.email)) {
			invalidFormMessage = "Invalid email format";
			formState = "idle";
			return;
		}
		try {
			let data = await fetch(base + "/manage/app/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ action: "subscribeToIncidentID", data: newSubscriber })
			});
			let resp = await data.json();
			if (resp.error) {
				invalidFormMessage = resp.message;
			}
		} catch (error) {
			invalidFormMessage = "Error while inserting email";
		} finally {
			formState = "idle";
		}
	}

	async function loadData() {
		//fetch data
		loadingData = true;
		try {
			let resp = await fetch(base + "/manage/app/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ action: "getSubscribers" })
			});
			subscribers = await resp.json();
		} catch (error) {
			alert("Error: " + error);
		} finally {
			loadingData = false;
		}
	}

	onMount(() => {
		loadData();
	});
</script>

<div>
	<div class="mt-2 w-full">
		<Label class="text-sm">
			Add Email Address
			<span class="text-red-500">*</span>
		</Label>
		<Input class="mt-2" bind:value={newSubscriber.email} placeholder="john@example.com" />
	</div>
	<div class="py-2.5">
		<div class="col-span-5 pt-2.5">
			<p class="text-right text-xs font-medium text-red-500">{invalidFormMessage}</p>
		</div>
		<Button class="h-8" on:click={addNewSubscriber}>
			Submit
			{#if formState === "loading"}
				<Loader class="ml-2 inline h-4 w-4 animate-spin" />
			{/if}
		</Button>
	</div>
	<div>
		<div class="overflow-hidden rounded-lg border dark:border-neutral-700">
			{#if loadingData}
				<div class="flex items-center justify-center">
					<Loader class="ml-2 inline h-4 w-4 animate-spin" />
				</div>
			{/if}
			<table class="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
				<thead>
					<tr>
						<th
							scope="col"
							class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
							>id</th
						>
						<th
							scope="col"
							class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
							>email</th
						>
						<th
							scope="col"
							class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
							>incident_id</th
						>
						<th
							scope="col"
							class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
							>status</th
						>
						<th
							scope="col"
							class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
							>token</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 dark:divide-neutral-700">
					{#each subscribers as subscriber, i}
						<tr>
							<td class="whitespace-nowrap px-6 py-4 text-sm font-medium"
								>{subscriber.id}</td
							>
							<td class=" px-6 py-4 text-xs font-semibold">{subscriber.email}</td>
							<td class="whitespace-nowrap px-6 py-4 text-xs font-semibold leading-5"
								>{subscriber.incident_id}</td
							>
							<td class="whitespace-nowrap px-6 py-4 text-xs font-semibold leading-5"
								>{subscriber.status}</td
							>
							<td class="whitespace-nowrap px-6 py-4 text-xs font-semibold leading-5"
								>{subscriber.token}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
