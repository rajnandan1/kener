<script>
	import { Button } from "$lib/components/ui/button";
	import { Plus, X, Settings, Bell, Loader } from "lucide-svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { base } from "$app/paths";
	import MonitorsSheet from "$lib/components/manage/monitorSheet.svelte";
	import { onMount } from "svelte";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";

	export let categories = [];
	let monitors = [];
	let status = "ACTIVE";
	let showAddMonitor = false;
	let formState = "idle";
	let loadingData = false;
	let triggers = [];

	function showAddMonitorSheet() {
		resetNewMonitor();
		showAddMonitor = true;
	}
	let newMonitor;
	function resetNewMonitor() {
		newMonitor = {
			id: 0,
			tag: "",
			name: "",
			description: "",
			image: "",
			cron: "* * * * *",
			defaultStatus: "NONE",
			status: "ACTIVE",
			categoryName: "Home",
			monitorType: "NONE",
			typeData: "",
			dayDegradedMinimumCount: 0,
			dayDownMinimumCount: 0,
			includeDegradedInDowntime: "NO",
			apiConfig: {
				url: "",
				method: "GET",
				headers: [],
				body: "",
				timeout: 10000,
				eval: "",
				hideURLForGet: "NO"
			},
			pingConfig: {
				hostsV4: [],
				hostsV6: []
			},
			dnsConfig: {
				host: "",
				lookupRecord: "",
				nameServer: "",
				matchType: "",
				values: []
			}
		};
	}

	function showUpdateMonitorSheet(m) {
		resetNewMonitor();
		newMonitor = { ...newMonitor, ...m };

		if (newMonitor.monitorType == "API") {
			newMonitor.apiConfig = JSON.parse(newMonitor.typeData);
		} else if (newMonitor.monitorType == "PING") {
			newMonitor.pingConfig = JSON.parse(newMonitor.typeData);
		} else if (newMonitor.monitorType == "DNS") {
			newMonitor.dnsConfig = JSON.parse(newMonitor.typeData);
		}
		showAddMonitor = true;
	}

	async function loadData() {
		loadingData = true;
		try {
			let apiResp = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ action: "getMonitors", data: { status: status } })
			});
			let resp = await apiResp.json();
			monitors = resp.map((m) => {
				m.downTrigger = JSON.parse(m.downTrigger);
				m.degradedTrigger = JSON.parse(m.degradedTrigger);
				return m;
			});
		} catch (error) {
			alert("Error: " + error);
		} finally {
			loadingData = false;
		}
	}

	async function loadTriggersData() {
		try {
			let apiResp = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ action: "getTriggers", data: { status: "ACTIVE" } })
			});
			triggers = await apiResp.json();
		} catch (error) {
			alert("Error: " + error);
		}
	}
	onMount(async () => {
		loadData();
		loadTriggersData();
	});
	let shareMenusToggle = false;

	let monitorTriggers = {
		downTrigger: {
			failureThreshold: 1,
			triggerType: "DOWN",
			successThreshold: 1,
			description: "The monitor is down",
			createIncident: "NO",
			active: false,
			triggers: []
		},
		degradedTrigger: {
			failureThreshold: 1,
			triggerType: "DEGRADED",
			successThreshold: 1,
			active: true,
			description: "The monitor is degraded",
			createIncident: "NO",
			triggers: []
		}
	};

	async function saveTriggers() {
		let data = {
			id: currentAlertMonitor.id,
			downTrigger: JSON.stringify(monitorTriggers.downTrigger),
			degradedTrigger: JSON.stringify(monitorTriggers.degradedTrigger)
		};
		formState = "loading";
		//updateMonitorTriggers
		try {
			let apiResp = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({ action: "updateMonitorTriggers", data })
			});
		} catch (error) {
			alert("Error: " + error);
		} finally {
			formState = "idle";
			loadData();
			shareMenusToggle = false;
		}
	}
	let currentAlertMonitor;
	function openAlertMenu(m) {
		currentAlertMonitor = m;
		if (m.downTrigger) {
			monitorTriggers.downTrigger = m.downTrigger;
		}
		if (m.degradedTrigger) {
			monitorTriggers.degradedTrigger = m.degradedTrigger;
		}
		shareMenusToggle = true;
	}
</script>

{#if showAddMonitor}
	<MonitorsSheet
		{categories}
		{newMonitor}
		on:closeModal={(e) => {
			showAddMonitor = false;
			loadData();
		}}
	/>
{/if}

<div class="mt-4 flex justify-between">
	<div class="flex w-40">
		<Select.Root
			portal={null}
			onSelectedChange={(e) => {
				status = e.value;
				loadData();
			}}
		>
			<Select.Trigger id="statusmonitor">
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
	<Button on:click={showAddMonitorSheet}>
		<Plus class="mr-2 inline h-6 w-6" />
		Add Monitor
	</Button>
</div>

<div class="mt-4">
	{#each monitors as monitor}
		<Card.Root class="mb-4">
			<Card.Header class="relative">
				<Card.Title>
					{#if !!monitor.image}
						<img
							src={monitor.image}
							alt={monitor.name}
							class="mr-2 inline-block h-8 w-8"
						/>
					{/if}
					{monitor.name}
				</Card.Title>
				{#if !!monitor.description}
					<Card.Description>{monitor.description}</Card.Description>
				{/if}
				<div class="absolute right-2 top-0.5">
					<Button
						variant="secondary"
						class="h-8 w-8 p-2"
						on:click={() => openAlertMenu(monitor)}
					>
						<Bell class="inline h-4 w-4" />
					</Button>
					<Button
						variant="secondary"
						class="h-8 w-8 p-2"
						on:click={() => showUpdateMonitorSheet(monitor)}
					>
						<Settings class="inline h-4 w-4" />
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex justify-between gap-4">
					<div class="">
						<Label class="text-xs">Tag</Label>
						<p class="text-sm font-semibold">
							{monitor.tag}
						</p>
					</div>
					<div class="">
						<Label class="text-xs">Monitor Type</Label>
						<p class="text-sm font-semibold">
							{monitor.monitorType}
						</p>
					</div>
					<div class="">
						<Label class="text-xs">Cron</Label>
						<p class="text-sm font-semibold">
							{monitor.cron}
						</p>
					</div>
					<div class="">
						<Label class="text-xs">Category</Label>
						<p class="text-sm font-semibold">
							{!!monitor.categoryName ? monitor.categoryName : "-"}
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>

{#if shareMenusToggle}
	<div
		class="moldal-container fixed left-0 top-0 z-30 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm"
	>
		<div
			class="absolute left-1/2 top-1/2 h-fit w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg"
		>
			<Button
				variant="ghost"
				on:click={() => {
					shareMenusToggle = false;
				}}
				class="absolute right-2 top-2 z-40 h-6 w-6   rounded-full border bg-background p-1"
			>
				<X class="h-4 w-4   text-muted-foreground" />
			</Button>
			<div class="content px-4 py-4">
				<h2 class="text-lg font-semibold">
					Add Alert Triggers for {currentAlertMonitor.name}
				</h2>
				<p class="text-xs text-muted-foreground">
					Alert triggers are used to notify you when your monitor is down or degraded.
				</p>
				<hr class="my-4" />
				{#each Object.entries(monitorTriggers) as [key, data]}
					<div class="flex justify-between">
						<h3 class="font-semibold">
							{data.triggerType}
						</h3>
						<div>
							<label class="inline-flex cursor-pointer items-center">
								<input
									type="checkbox"
									value=""
									class="peer sr-only"
									checked={data.active}
									on:change={() => {
										data.active = !data.active;
									}}
								/>
								<div
									class="peer relative h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rtl:peer-checked:after:-translate-x-full dark:border-gray-600 dark:bg-gray-700 dark:peer-focus:ring-blue-800"
								></div>
							</label>
						</div>
					</div>

					<div class="grid grid-cols-4 gap-2">
						<div class="col-span-1">
							<Label for="{key}failureThreshold">
								Failure Threshold
								<span class="text-red-500">*</span>
							</Label>
							<Input
								bind:value={data.failureThreshold}
								min="1"
								id="{key}failureThreshold"
								type="number"
							/>
						</div>
						<div class="col-span-1">
							<div class="col-span-1">
								<Label for="{key}successThreshold">
									Failure Threshold
									<span class="text-red-500">*</span>
								</Label>
								<Input
									bind:value={data.successThreshold}
									min="1"
									id="{key}successThreshold"
									type="number"
								/>
							</div>
						</div>
						<div class="col-span-1">
							<Label for="{key}createIncident">Create Incident</Label>
							<Select.Root
								portal={null}
								onSelectedChange={(e) => (data.createIncident = e.value)}
								selected={{
									value: data.createIncident,
									label: data.createIncident
								}}
							>
								<Select.Trigger id="{key}createIncident">
									<Select.Value
										bind:value={data.createIncident}
										placeholder={data.createIncident}
									/>
								</Select.Trigger>
								<Select.Content>
									<Select.Group>
										<Select.Item
											value="YES"
											label="YES"
											class="text-sm font-medium"
										>
											YES
										</Select.Item>
										<Select.Item
											value="NO"
											label="NO"
											class="text-sm font-medium"
										>
											NO
										</Select.Item>
									</Select.Group>
								</Select.Content>
							</Select.Root>
						</div>
						<div class="col-span-4">
							<Label for="{key}description">
								Add Custom Alert Message
								<span class="text-red-500">*</span>
							</Label>
							<Input
								id="{key}description"
								bind:value={data.description}
								type="text"
							/>
						</div>
						{#each triggers as trigger}
							<div class="col-span-1 mt-2">
								<label class="cursor-pointer">
									<input
										type="checkbox"
										class=""
										checked={data.triggers.indexOf(trigger.id) > -1}
										on:change={() => {
											data.triggers = data.triggers.includes(trigger.id)
												? data.triggers.filter((t) => t != trigger.id)
												: [...data.triggers, trigger.id];
										}}
									/>
									{#if trigger.triggerType == "webhook"}
										<img
											src={base + "/webhooks.svg"}
											alt={trigger.triggerType}
											class="ml-2 inline-block h-4 w-4"
										/>
									{:else if trigger.triggerType == "slack"}
										<img
											src={base + "/slack.svg"}
											alt={trigger.triggerType}
											class="ml-2 inline-block h-4 w-4"
										/>
									{:else if trigger.triggerType == "discord"}
										<img
											src={base + "/discord.svg"}
											alt={trigger.triggerType}
											class="ml-2 inline-block h-4 w-4"
										/>
									{/if}
									{trigger.name}
								</label>
							</div>
						{/each}
					</div>
					<hr class="my-4" />
				{/each}

				<div class="flex justify-end">
					<Button
						variant="secondary"
						on:click={saveTriggers}
						disabled={formState === "loading"}
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
