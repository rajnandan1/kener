<script>
	import { Button } from "$lib/components/ui/button";
	import { Plus, X, Loader, Settings, Check } from "lucide-svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { base } from "$app/paths";
	import * as Select from "$lib/components/ui/select";
	import { createEventDispatcher } from "svelte";
	import { onMount } from "svelte";
	import { IsValidURL } from "$lib/clientTools.js";
	import * as Card from "$lib/components/ui/card";
	let status = "ACTIVE";
	let formState = "idle";
	let showAddTrigger = false;
	let triggers = [];
	let loadingData = false;
	export let data;

	let newTrigger = {
		id: 0,
		name: "some name",
		trigger_type: "webhook",
		trigger_desc: "",
		trigger_status: "ACTIVE",
		trigger_meta: {
			url: "",
			headers: [],
			to: "",
			from: data.RESEND_SENDER_EMAIL || ""
		}
	};
	let invalidFormMessage = "";
	function resetTrigger() {
		newTrigger = {
			id: 0,
			name: "",
			trigger_type: "webhook",
			trigger_desc: "",
			trigger_status: "ACTIVE",
			trigger_meta: {
				url: "",
				headers: [],
				to: "",
				from: data.RESEND_SENDER_EMAIL || ""
			}
		};
	}
	function selectChange(e) {
		status = e.value;
		loadData();
	}
	function addHeader() {
		newTrigger.trigger_meta.headers = [
			...newTrigger.trigger_meta.headers,
			{ key: "", value: "" }
		];
	}

	//validate this pattern Alerts <alert@example.com>
	function validateNameEmailPattern(input) {
		const pattern = /^([\w\s]+)\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>$/;
		const match = input.match(pattern);
		if (match) {
			return {
				isValid: true,
				name: match[1].trim(),
				email: match[2]
			};
		}
		return {
			isValid: false,
			name: null,
			email: null
		};
	}

	async function addNewTrigger() {
		invalidFormMessage = "";
		formState = "loading";
		//newTrigger.trigger_type present not empty
		if (newTrigger.trigger_type == "") {
			invalidFormMessage = "Trigger Type is required";
			formState = "idle";
			return;
		}

		if (newTrigger.trigger_type == "email") {
			newTrigger.trigger_meta.url = "";

			let emValid = validateNameEmailPattern(newTrigger.trigger_meta.from);
			if (!emValid.isValid) {
				invalidFormMessage = "Invalid Name and Email Address for Sender";
				formState = "idle";
				return;
			}
		}
		//newTrigger.name present not empty
		if (newTrigger.name == "") {
			invalidFormMessage = "Trigger Name is required";
			formState = "idle";
			return;
		}
		//newTrigger.trigger_meta.url present not empty
		if (newTrigger.trigger_type != "email" && newTrigger.trigger_meta.url == "") {
			invalidFormMessage = "Trigger URL is required";
			formState = "idle";
			return;
		}

		if (newTrigger.trigger_meta.url != "" && !IsValidURL(newTrigger.trigger_meta.url)) {
			invalidFormMessage = "Invalid URL";
			formState = "idle";
			return;
		}

		let toPost = {
			id: newTrigger.id,
			name: newTrigger.name,
			trigger_type: newTrigger.trigger_type,
			trigger_status: newTrigger.trigger_status,
			trigger_desc: newTrigger.trigger_desc,
			trigger_meta: JSON.stringify(newTrigger.trigger_meta)
		};

		try {
			let data = await fetch(base + "/manage/app/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ action: "createUpdateTrigger", data: toPost })
			});
			let resp = await data.json();
			if (resp.error) {
				invalidFormMessage = resp.error;
			} else {
				showAddTrigger = false;
				loadData();
			}
		} catch (error) {
			invalidFormMessage = "Error while saving data";
		} finally {
			formState = "idle";
		}
	}

	function addNewTriggerFn() {
		resetTrigger();
		showAddTrigger = true;
	}

	function showUpdateSheet(m) {
		newTrigger = { ...newTrigger, ...m };
		newTrigger.trigger_meta = JSON.parse(newTrigger.trigger_meta);
		showAddTrigger = true;
	}

	async function testTrigger(i, trigger_id, status) {
		triggers[i].testLoaders = "loading";
		try {
			let data = await fetch(base + "/manage/app/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ action: "testTrigger", data: { trigger_id, status } })
			});
			let resp = await data.json();
		} catch (error) {
			alert("Error: " + error);
		} finally {
			triggers[i].testLoaders = "success";
			setTimeout(() => {
				triggers[i].testLoaders = "idle";
			}, 3000);
		}
	}

	async function loadData() {
		//fetch data
		loadingData = true;
		try {
			let apiResp = await fetch(base + "/manage/app/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ action: "getTriggers", data: { status: status } })
			});
			triggers = await apiResp.json();
			triggers = triggers.map((t) => {
				t.testLoaders = "idle";
				return t;
			});
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

<div class="mt-4 flex justify-between">
	<div class="flex w-40">
		<Select.Root portal={null} onSelectedChange={selectChange}>
			<Select.Trigger id="statusmonitor2">
				<Select.Value placeholder={status} />
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Label>Status</Select.Label>
					<Select.Item value="ACTIVE" label="ACTIVE" class="text-sm font-medium">
						ACTIVE
					</Select.Item>
					<Select.Item value="INACTIVE" label="INACTIVE" class="text-sm font-medium">
						INACTIVE
					</Select.Item>
				</Select.Group>
			</Select.Content>
		</Select.Root>
		{#if loadingData}
			<Loader class="ml-2 mt-2 inline h-6 w-6 animate-spin" />
		{/if}
	</div>
	<Button on:click={addNewTriggerFn}>
		<Plus class="mr-2 inline h-6 w-6" />
		New Trigger
	</Button>
</div>

<div class="mt-4">
	{#each triggers as trigger, i}
		<Card.Root class="mb-4">
			<Card.Header class="relative">
				<Card.Title>
					{#if trigger.trigger_type == "webhook"}
						<img
							src={base + "/webhooks.svg"}
							alt={trigger.trigger_type}
							class="mr-2 inline-block h-6 w-6"
						/>
					{:else if trigger.trigger_type == "slack"}
						<img
							src={base + "/slack.svg"}
							alt={trigger.trigger_type}
							class="mr-2 inline-block h-6 w-6"
						/>
					{:else if trigger.trigger_type == "discord"}
						<img
							src={base + "/discord.svg"}
							alt={trigger.trigger_type}
							class="mr-2 inline-block h-6 w-6"
						/>
					{:else if trigger.trigger_type == "email"}
						<img
							src={base + "/email.png"}
							alt={trigger.trigger_type}
							class="mr-2 inline-block h-6 w-6"
						/>
					{/if}
					{trigger.name}
				</Card.Title>

				<div class="absolute right-3 top-3 flex gap-x-2">
					<Button
						variant="secondary"
						class="h-8   p-2 "
						disabled={trigger.testLoaders == "loading"}
						on:click={() => testTrigger(i, trigger.id, "TRIGGERED")}
					>
						{#if trigger.testLoaders == "loading"}
							<Loader class="mr-1 inline h-3 w-3 animate-spin" />
						{/if}
						{#if trigger.testLoaders == "success"}
							<Check class="mr-1 inline h-3 w-3 text-green-500 " />
						{/if}
						<span class="h-4 text-xs font-medium"> TEST </span>
					</Button>

					<Button
						variant="secondary"
						class=" h-8 w-8 p-2"
						on:click={() => showUpdateSheet(trigger)}
					>
						<Settings class="inline h-4 w-4" />
					</Button>
				</div>
			</Card.Header>
		</Card.Root>
	{/each}
</div>
{#if showAddTrigger}
	<div class="fixed left-0 top-0 z-50 h-screen w-screen bg-card bg-opacity-20 backdrop-blur-sm">
		<div class="absolute right-0 top-0 h-screen w-[800px] bg-background shadow-xl">
			<div class="absolute top-0 flex h-12 w-full justify-between gap-2 border-b p-3">
				{#if newTrigger.id}
					<h2 class="text-lg font-medium">Edit Trigger</h2>
				{:else}
					<h2 class="text-lg font-medium">Add Trigger</h2>
				{/if}
				<div>
					<label class="inline-flex cursor-pointer items-center">
						<input
							type="checkbox"
							value=""
							class="peer sr-only"
							checked={newTrigger.trigger_status == "ACTIVE"}
							on:change={() => {
								newTrigger.trigger_status =
									newTrigger.trigger_status == "ACTIVE" ? "INACTIVE" : "ACTIVE";
							}}
						/>
						<div
							class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rtl:peer-checked:after:-translate-x-full dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"
						></div>
					</label>
				</div>
			</div>
			<div class="mt-12 w-full overflow-y-auto p-3" style="height: calc(100vh - 7rem);">
				<p class="mb-4">
					Select the type of Trigger you want to add. You can add multiple Triggers of
					different types.
				</p>
				<div class="flex justify-stretch gap-4">
					<Button
						variant={newTrigger.trigger_type != "webhook" ? "outline" : "secondary"}
						class="border"
						on:click={() => {
							newTrigger.trigger_type = "webhook";
						}}
					>
						<img src="{base}/webhooks.svg" title="webhook" class="mr-4 w-6" />
						Webhooks
					</Button>
					<Button
						variant={newTrigger.trigger_type != "discord" ? "outline" : "secondary"}
						class="border"
						on:click={() => {
							newTrigger.trigger_type = "discord";
						}}
					>
						<img src="{base}/discord.svg" title="discord" class="mr-4 w-6" />
						Discord
					</Button>
					<Button
						variant={newTrigger.trigger_type != "slack" ? "outline" : "secondary"}
						class="border"
						on:click={() => {
							newTrigger.trigger_type = "slack";
						}}
					>
						<img src="{base}/slack.svg" title="slack" class="mr-4 w-6" />
						Slack
					</Button>

					<Button
						variant={newTrigger.trigger_type != "email" ? "outline" : "secondary"}
						class="border"
						on:click={() => {
							newTrigger.trigger_type = "email";
						}}
					>
						<img src="{base}/email.png" title="email" class="mr-4 w-6" />
						Email
					</Button>
				</div>

				<div class="mt-4">
					<div class="flex flex-row gap-4">
						<div class="w-[300px]">
							<Label class="text-sm">
								Add a name for your <span class="underline"
									>{newTrigger.trigger_type}</span
								>
								Trigger
								<span class="text-red-500">*</span>
							</Label>
							<Input
								class="mt-2"
								bind:value={newTrigger.name}
								placeholder="My Trigger"
							/>
						</div>
					</div>

					<div class="mt-4 w-full">
						<Label class="text-sm">
							Add description for your <span class="underline">
								{newTrigger.trigger_type}
							</span>
							Trigger
						</Label>
						<Input
							class="mt-2"
							bind:value={newTrigger.trigger_desc}
							placeholder="Example: This is a trigger."
						/>
					</div>
					{#if newTrigger.trigger_type != "email"}
						<div class="mt-4 w-full">
							<Label class="text-sm">
								Add URL for your <span class="underline"
									>{newTrigger.trigger_type}</span
								>
								Trigger
								<span class="text-red-500">*</span>
							</Label>
							<Input
								class="mt-2"
								bind:value={newTrigger.trigger_meta.url}
								placeholder="https://example.com/url"
							/>
						</div>
					{/if}
					{#if newTrigger.trigger_type == "webhook"}
						<div class="mt-4 w-full">
							<Label for="url">Add Optional Headers for Webhooks</Label>
							<div class="grid grid-cols-6 gap-2">
								{#each newTrigger.trigger_meta.headers as header, index}
									<div class="col-span-2">
										<Input
											bind:value={header.key}
											id="header"
											placeholder="Content-Type"
										/>
									</div>
									<div class="col-span-3">
										<Input
											bind:value={header.value}
											id="header"
											placeholder="application/json"
										/>
									</div>
									<div class="col-span-1 pt-2">
										<Button
											class=" h-6 w-6 p-1"
											variant="secondary"
											on:click={() => {
												newTrigger.trigger_meta.headers =
													newTrigger.trigger_meta.headers.filter(
														(_, i) => i !== index
													);
											}}
										>
											<X class="h-5 w-5" />
										</Button>
									</div>
								{/each}
							</div>
							<div class="relative pb-8 pt-2">
								<hr
									class="border-1 border-border-input relative top-4 h-px border-dashed"
								/>

								<Button
									on:click={addHeader}
									variant="secondary"
									class="absolute left-1/2 h-8  -translate-x-1/2   p-2 text-xs  "
								>
									<Plus class="mr-1 h-4 w-4" /> Add Headers
								</Button>
							</div>
						</div>
					{:else if newTrigger.trigger_type == "email"}
						<div class="mt-4 w-full">
							{#if !!!data.RESEND_API_KEY}
								<div class="rounded-md border bg-card p-2 text-xs">
									<p class="text-sm font-semibold">Email Trigger</p>
									<p class="text-xs">
										Kener uses <a
											href="https://resend.com/"
											class="text-blue-500"
											target="_blank">resend</a
										>
										to send emails. Please make sure you have created an account
										with resend. Also add the resend api key as environment variable
										<span class="font-mono">RESEND_API_KEY</span>.
										<span class="text-red-500"
											>The RESEND_API_KEY is not set in your environment
											variable. Please set it and restart the server</span
										>.
									</p>
								</div>
							{/if}
						</div>
						<div class="mt-4 w-full">
							<Label class="text-sm">
								Add To Email Addresses, (comma separated)
								<span class="text-red-500">*</span>
							</Label>
							<Input
								class="mt-2"
								bind:value={newTrigger.trigger_meta.to}
								placeholder="john@example.com, jane@example.com"
							/>
						</div>
						<div class="mt-4 w-full">
							<Label class="text-sm">
								Add Name and Sender Email Address
								<span class="text-red-500">*</span>
							</Label>
							<Input
								class="mt-2"
								bind:value={newTrigger.trigger_meta.from}
								placeholder="Alerts <alert@example.com>"
							/>
						</div>
					{/if}
				</div>
			</div>
			<div class="absolute bottom-0 grid h-16 w-full grid-cols-6 gap-2 border-t p-3">
				<div class="col-span-1">
					<Button
						variant="ghost"
						class="col-span-1 w-full"
						on:click={(e) => {
							showAddTrigger = false;
						}}>Cancel</Button
					>
				</div>
				<div class="col-span-4 py-2.5">
					<p class="text-right text-xs font-medium text-red-500">{invalidFormMessage}</p>
				</div>
				<div class="col-span-1">
					<Button
						class="col-span-1 w-full"
						disabled={formState === "loading"}
						on:click={addNewTrigger}
					>
						Save
						{#if formState === "loading"}
							<Loader class="ml-2 inline h-4 w-4 animate-spin" />
						{/if}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
