<script>
	import { onMount } from "svelte";
	import { base } from "$app/paths";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Button } from "$lib/components/ui/button";
	import moment from "moment";
	import { DateInput } from "date-picker-svelte";
	import { Tooltip } from "bits-ui";
	import {
		Plus,
		X,
		Settings,
		Bell,
		Loader,
		ChevronLeft,
		ChevronRight,
		Info,
		Hammer,
		CalendarCheck,
		ArrowRight,
		Siren,
		PenLine,
		MessageSquarePlus,
		Trash
	} from "lucide-svelte";
	import * as Select from "$lib/components/ui/select";
	export let data;
	let status = "OPEN";
	let loadingData = false;
	let editMonitorsModal = false;
	let pageNo = 1;
	let limit = 10;
	let incidents = [];
	let totalPages = 0;
	let showModal = false;
	let invalidFormMessage = "";
	let monitors = data.monitors;
	let formStateCreate = "idle";

	async function fetchData() {
		loadingData = true;
		try {
			let apiResp = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					action: "getIncidents",
					data: {
						page: pageNo,
						limit,
						filter: {
							status: status
						}
					}
				})
			});
			let resp = await apiResp.json();
			incidents = resp.incidents.map((incident) => {
				let i = { ...incident };
				if (!!!i.end_date_time) {
					i.duration = moment
						.duration(
							parseInt(new Date().getTime() / 1000) - parseInt(i.start_date_time),
							"seconds"
						)
						.humanize();
				} else {
					i.duration = moment
						.duration(
							parseInt(i.end_date_time) - parseInt(i.start_date_time),
							"seconds"
						)
						.humanize();
				}
				return i;
			});

			totalPages = Math.ceil(resp.total.count / limit);
		} catch (error) {
			alert("Error: " + error);
		} finally {
			loadingData = false;
		}
	}

	let nowDate = new Date();
	let currentIncident = null;
	let newIncident = {};

	function newIncidentSet() {
		newIncident = {
			title: "",
			id: 0,
			end_date_time: null,
			endDatetime: null,
			startDatetime: null,
			start_date_time: null,
			status: "OPEN",
			state: "INVESTIGATING"
		};
	}

	onMount(() => {
		fetchData();
	});

	async function createIncident() {
		invalidFormMessage = "";
		let toPost = {
			title: newIncident.title,
			start_date_time: newIncident.startDatetime,
			end_date_time: newIncident.endDatetime,
			status: newIncident.status,
			state: newIncident.state,
			id: newIncident.id
		};
		//convert data.start_date_time to timestamp
		if (!!!toPost.start_date_time) {
			invalidFormMessage = "Start Date Time is required";
			return;
		}
		toPost.start_date_time = parseInt(new Date(toPost.start_date_time).getTime() / 1000);
		if (!!!toPost.end_date_time) {
			delete toPost.end_date_time;
		} else {
			toPost.end_date_time = parseInt(new Date(toPost.end_date_time).getTime() / 1000);
		}

		formStateCreate = "loading";
		try {
			let data = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					action: !!toPost.id ? "updateIncident" : "createIncident",
					data: toPost
				})
			});
			let resp = await data.json();
			if (resp.error) {
				invalidFormMessage = resp.error;
			} else {
				showModal = false;
				fetchData();
			}
		} catch (error) {
			invalidFormMessage = "Error while saving data";
		} finally {
			formStateCreate = "idle";
		}
	}
	let newIncidentMonitors = [];
	function showEditModal(i) {
		addingMonitorToIncident = false;
		currentIncident = i;
		editMonitorsModal = true;

		newIncidentMonitors = monitors.map((monitor) => {
			let m = { ...monitor };
			m.monitor_impact = "DOWN";
			let xm = currentIncident.monitors.find((n) => n.monitor_tag === m.tag);
			if (xm) {
				m.selected = true;
				m.monitor_impact = xm.monitor_impact;
			}
			return m;
		});
	}
	let addingMonitorToIncident = false;
	async function addMonitorToIncident(m) {
		let action = "addMonitor";
		if (!m.selected) {
			action = "removeMonitor";
		}
		if (!!!m.monitor_impact) {
			return;
		}
		let toPost = {
			action,
			data: {
				incident_id: currentIncident.id,
				monitor_tag: m.tag,
				monitor_impact: m.monitor_impact
			}
		};

		try {
			let data = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify(toPost)
			});
			let resp = await data.json();
			if (resp.error) {
				alert(resp.error);
			} else {
				fetchData();
			}
		} catch (error) {
			alert("Error: " + error);
		}
	}

	let showCommentModal = false;
	let comments = [];
	let loadingComments = false;
	let newComment = {
		comment: "",
		id: 0,
		state: "INVESTIGATING",
		commented_at: new Date()
	};
	let addCommentError = "";

	async function fetchComments() {
		loadingComments = true;
		try {
			let data = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					action: "getComments",
					data: {
						incident_id: currentIncident.id
					}
				})
			});
			let resp = await data.json();
			if (resp.error) {
				addCommentError = resp.error;
			}

			comments = resp;
		} catch (error) {
			addCommentError = "Error while fetching comments";
		} finally {
			loadingComments = false;
		}
	}

	function showComments(i) {
		currentIncident = i;
		showCommentModal = true;
		comments = [];
		newComment.state = i.state;
		newComment.id = 0;
		newComment.comment = "";
		newComment.commented_at = null;
		fetchComments();
	}

	async function addNewComment() {
		addCommentError = "";
		if (newComment.comment.trim().length == 0 || loadingComments) {
			return;
		}

		//if newComment.commented_at is null, error
		if (!!!newComment.commented_at) {
			addCommentError = "Time stamp is required";
			return;
		}

		loadingComments = true;
		try {
			let data = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					action: newComment.id == 0 ? "addComment" : "updateComment",
					data: {
						incident_id: currentIncident.id,
						comment: newComment.comment,
						comment_id: newComment.id,
						state: newComment.state,
						commented_at: parseInt(new Date(newComment.commented_at).getTime() / 1000)
					}
				})
			});
			let resp = await data.json();
			if (resp.error) {
				addCommentError = resp.error;
			} else {
				await fetchComments();
				newComment.comment = "";
				newComment.id = 0;
				newComment.commented_at = null;
				await fetchData();
			}
		} catch (error) {
			addCommentError = "Error while adding comment";
		} finally {
			loadingComments = false;
		}
	}

	async function deleteComment(c) {
		loadingComments = true;
		addCommentError = "";

		try {
			let data = await fetch(base + "/manage/api/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					action: "deleteComment",
					data: {
						incident_id: currentIncident.id,
						comment_id: c.id
					}
				})
			});
			await fetchComments();
		} catch (error) {
			addCommentError = "Error while deleting comment";
		} finally {
			loadingComments = false;
		}
	}

	function openIncidentSettings(i) {
		newIncident = { ...i };
		newIncident.startDatetime = new Date(Number(i.start_date_time) * 1000);
		if (!!i.end_date_time) {
			newIncident.endDatetime = new Date(Number(i.end_date_time) * 1000);
		}
		showModal = true;
	}
	function setCommentState(s) {
		newComment.state = s;
		currentIncident.state = s;
	}

	function setCommentEdit(c) {
		newComment = { ...c };
		newComment.commented_at = new Date(Number(c.commented_at) * 1000);
	}
</script>

<div class="min-h-[70vh]">
	<div class="mt-4 flex justify-between">
		<div class="flex w-40">
			<Select.Root
				portal={null}
				onSelectedChange={(e) => {
					status = e.value;
					fetchData();
				}}
			>
				<Select.Trigger id="statusmonitor">
					<Select.Value bind:value={status} placeholder={status} />
				</Select.Trigger>
				<Select.Content>
					<Select.Group>
						<Select.Label>Status</Select.Label>
						<Select.Item value="ALL" label="ALL" class="text-sm font-medium">
							ALL
						</Select.Item>
						<Select.Item value="OPEN" label="OPEN" class="text-sm font-medium">
							OPEN
						</Select.Item>
						<Select.Item value="CLOSED" label="CLOSED" class="text-sm font-medium">
							CLOSED
						</Select.Item>
					</Select.Group>
				</Select.Content>
			</Select.Root>
			{#if loadingData}
				<Loader class="ml-2 mt-2 inline h-6 w-6 animate-spin" />
			{/if}
		</div>
		<Button
			on:click={(e) => {
				newIncidentSet();
				showModal = true;
			}}
		>
			<Plus class="mr-2 inline h-6 w-6" />
			New Incident
		</Button>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class=" mt-4 flex justify-end">
			<nav class="flex max-w-2xl items-center gap-x-1" aria-label="Pagination">
				<button
					disabled={pageNo === 1}
					type="button"
					class="inline-flex min-h-[38px] min-w-[38px] items-center justify-center gap-x-2 rounded-lg border border-transparent px-2.5 py-2 text-sm text-gray-800 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-transparent dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
					aria-label="Previous"
					on:click={() => {
						pageNo--;
						fetchData();
					}}
				>
					<ChevronLeft class="size-3.5 shrink-0" />
					<span class="sr-only">Previous</span>
				</button>
				<div class="flex max-w-[380px] items-center gap-x-1 overflow-x-auto">
					{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
						<Button
							variant={page == pageNo ? "secondary" : "ghost"}
							on:click={() => {
								pageNo = page;
								fetchData();
							}}
						>
							{page}
						</Button>
					{/each}
				</div>
				<button
					type="button"
					disabled={pageNo === totalPages}
					class="inline-flex min-h-[38px] min-w-[38px] items-center justify-center gap-x-2 rounded-lg border border-transparent px-2.5 py-2 text-sm text-gray-800 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50 dark:border-transparent dark:text-white dark:hover:bg-white/10 dark:focus:bg-white/10"
					aria-label="Next"
					on:click={() => {
						pageNo++;
						fetchData();
					}}
				>
					<span class="sr-only">Next</span>
					<ChevronRight class="size-3.5 shrink-0" />
				</button>
			</nav>
		</div>
	{/if}
	<!-- End Pagination -->
	<div class="mt-4 flex flex-col">
		<div class="-m-1.5 overflow-x-auto">
			<div class="inline-block min-w-full p-1.5 align-middle">
				<div class="overflow-hidden rounded-lg border dark:border-neutral-700">
					<table class="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
						<thead>
							<tr>
								<th
									scope="col"
									class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
									>ID</th
								>
								<th
									scope="col"
									class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
								>
									Title
								</th>
								<th
									scope="col"
									class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
									>Duration</th
								>

								<th
									scope="col"
									class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
									>State</th
								>
								<th
									scope="col"
									class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
									>Affects</th
								>
								<th
									scope="col"
									class="px-6 py-3 text-start text-xs font-semibold uppercase text-gray-500 dark:text-neutral-500"
								></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 dark:divide-neutral-700">
							{#each incidents as incident}
								<tr>
									<td class="whitespace-nowrap px-6 py-4 text-sm font-medium">
										{incident.id}
									</td>
									<td class=" px-6 py-4 text-xs font-semibold">
										<Tooltip.Root openDelay={100}>
											<Tooltip.Trigger
												class="max-w-[12rem] overflow-hidden text-ellipsis whitespace-nowrap"
											>
												{incident.title}
											</Tooltip.Trigger>
											<Tooltip.Content>
												<div
													class=" max-w-[24rem] items-center justify-center rounded border bg-card p-1.5 text-sm font-medium shadow-popover outline-none"
												>
													{incident.title}
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</td>

									<td
										class="whitespace-nowrap px-6 py-4 text-xs font-semibold leading-5"
									>
										<Tooltip.Root openDelay={100}>
											<Tooltip.Trigger class="">
												{incident.duration}
											</Tooltip.Trigger>
											<Tooltip.Content>
												<div
													class=" flex items-center justify-center rounded border bg-card p-1.5 text-xs font-medium shadow-popover outline-none"
												>
													<span
														class="mr-1 inline-block text-muted-foreground"
														>From</span
													>
													{moment(
														Number(incident.start_date_time) * 1000
													).format("YYYY-MM-DD HH:mm:ss")}
													<span
														class="mx-1 inline-block text-muted-foreground"
														>To</span
													>
													{#if incident.end_date_time}
														{moment(
															Number(incident.end_date_time) * 1000
														).format("YYYY-MM-DD HH:mm:ss")}
													{:else}
														Now
													{/if}
												</div>
											</Tooltip.Content>
										</Tooltip.Root>
									</td>

									<td class="whitespace-nowrap px-6 py-4 text-xs font-semibold">
										<span class="badge-{incident.state} rounded px-1.5 py-1"
											>{incident.state}</span
										>
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-xs font-semibold">
										<div class="flex gap-x-1.5">
											{#if incident.monitors.length > 0}
												<Tooltip.Root openDelay={100}>
													<Tooltip.Trigger class="">
														{incident.monitors.length} Monitors
													</Tooltip.Trigger>
													<Tooltip.Content>
														<div
															class=" flex items-center justify-center rounded border bg-card p-1.5 text-xs font-medium shadow-popover outline-none"
														>
															{#each incident.monitors as monitor}
																<span
																	class="text-api-{monitor.monitor_impact.toLowerCase()} mr-1"
																>
																	[{monitor.monitor_tag}]
																</span>
															{/each}
														</div>
													</Tooltip.Content>
												</Tooltip.Root>
											{/if}
											<Button
												variant="ghost"
												class="h-5 w-5 p-1"
												size="icon"
												on:click={(e) => {
													showEditModal(incident);
												}}
											>
												<PenLine class="inline h-4 w-4" />
											</Button>
										</div>
									</td>
									<td class="whitespace-nowrap px-6 py-4 text-xs font-semibold">
										<div class="flex gap-x-1.5">
											<Button
												variant="ghost"
												size="icon"
												class="h-6 w-6 p-1"
												on:click={(e) => {
													openIncidentSettings(incident);
												}}
											>
												<Settings class="inline h-5 w-5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-6 w-6 p-1"
												on:click={(e) => {
													showComments(incident);
												}}
											>
												<MessageSquarePlus class="inline h-5 w-5" />
											</Button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
{#if showModal}
	<div class="fixed left-0 top-0 z-50 h-screen w-screen bg-card bg-opacity-20 backdrop-blur-sm">
		<div class="absolute right-0 top-0 h-screen w-[800px] bg-background shadow-xl">
			<div class="absolute top-0 flex h-12 w-full justify-between gap-2 border-b p-3">
				{#if newIncident.id}
					<h2 class="text-lg font-medium">Edit Incident</h2>
				{:else}
					<h2 class="text-lg font-medium">Add Incident</h2>
				{/if}
			</div>
			<div class="mt-12 w-full overflow-y-auto p-3" style="height: calc(100vh - 7rem);">
				<div class="flex flex-row gap-4">
					<div class="w-full">
						<Label class="text-sm">
							Incident Title
							<span class="text-red-500">*</span>
						</Label>
						<Input
							class="mt-2"
							bind:value={newIncident.title}
							placeholder="Outage in all servers"
						/>
					</div>
				</div>

				<div class="mt-4 flex gap-4">
					<div class="col-span-1">
						<Label class="mb-2 text-sm" for="start_date_time">
							Incident Start Date Time
							<span class="text-red-500">*</span>
						</Label>
						<DateInput
							bind:value={newIncident.startDatetime}
							id="start_date_time"
							timePrecision="minute"
							class=" mt-2 text-sm"
						/>
					</div>
				</div>
				<div class="mt-4 flex gap-4">
					<p class="font-medium">
						<label>
							<input
								on:change={(e) => {
									newIncident.status =
										e.target.checked === true ? "CLOSED" : "OPEN";
								}}
								type="checkbox"
								checked={newIncident.status === "CLOSED"}
							/>
							Close/Delete this incident
						</label>
					</p>
				</div>
			</div>
			<div class="absolute bottom-0 grid h-16 w-full grid-cols-6 gap-2 border-t p-3">
				<div class="col-span-1">
					<Button
						variant="ghost"
						class="col-span-1 w-full"
						on:click={(e) => {
							showModal = false;
						}}>Cancel</Button
					>
				</div>
				<div class="col-span-4 py-2.5">
					<p class="text-right text-xs font-medium text-red-500">
						{invalidFormMessage}
					</p>
				</div>
				<div class="col-span-1">
					<Button
						class="col-span-1 w-full"
						on:click={createIncident}
						disabled={formStateCreate === "loading"}
					>
						Save
						{#if formStateCreate === "loading"}
							<Loader class="ml-2 inline h-4 w-4 animate-spin" />
						{/if}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if showCommentModal}
	<div
		class="moldal-container fixed left-0 top-0 z-50 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm"
	>
		<div
			class="absolute left-1/2 top-1/2 h-fit w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg"
		>
			<Button
				variant="ghost"
				on:click={() => {
					showCommentModal = false;
				}}
				class="absolute right-2 top-2 z-40 h-6 w-6   rounded-full border bg-background p-1"
			>
				<X class="h-4 w-4   text-muted-foreground" />
			</Button>
			<div class="content px-4 py-4">
				<h2 class="text-lg font-semibold">
					Add Updates for <span class="underline">{currentIncident.title}</span>
				</h2>
				<form class="mt-4" on:submit|preventDefault={addNewComment}>
					<div
						class="bg-hover state-{newComment.state} mt-2 grid grid-cols-4 overflow-hidden rounded-md border text-xs font-medium"
					>
						<div
							class="col-span-1 cursor-pointer px-2 py-2 text-center hover:underline"
							on:click={() => {
								setCommentState("INVESTIGATING");
							}}
						>
							INVESTIGATING
						</div>
						<div
							class="col-span-1 cursor-pointer px-2 py-2 text-center hover:underline"
							on:click={() => {
								setCommentState("IDENTIFIED");
							}}
						>
							IDENTIFIED
						</div>
						<div
							class="col-span-1 cursor-pointer px-2 py-2 text-center hover:underline"
							on:click={() => {
								setCommentState("MONITORING");
							}}
						>
							MONITORING
						</div>
						<div
							class="col-span-1 cursor-pointer px-2 py-2 text-center hover:underline"
							on:click={() => {
								setCommentState("RESOLVED");
							}}
						>
							RESOLVED
						</div>
					</div>
					<div class="mt-4 flex w-full gap-4">
						<div class="text-sm font-medium leading-7">Time Stamp</div>
						<DateInput
							bind:value={newComment.commented_at}
							id="newcomment_commented_at"
							timePrecision="minute"
							min={new Date(currentIncident.start_date_time * 1000)}
							class="w-[200px] text-sm"
						/>
					</div>
					<div class="mt-4">
						<textarea
							bind:value={newComment.comment}
							class="h-24 w-full rounded-sm border p-2 text-sm"
							placeholder="There is an outage in all server. Our best minds are on it. We will update you soon."
						></textarea>
					</div>

					<div class="flex justify-between">
						<div>
							{#if loadingComments}
								<Loader class="mt-2 inline h-6 w-6 animate-spin" />
							{/if}
						</div>
						<div>
							{#if addCommentError}
								<p class="mt-4 text-xs text-red-500">{addCommentError}</p>
							{/if}
						</div>
						<div class="flex gap-x-2">
							{#if !!newComment.id}
								<Button
									type="reset"
									variant="ghost"
									on:click={() =>
										(newComment = {
											comment: "",
											id: 0,
											state: currentIncident.state
										})}
									class="mt-2 h-8 p-1 px-2 text-xs"
								>
									Cancel
								</Button>
							{/if}

							<Button
								type="submit"
								disabled={newComment.comment.trim().length == 0 || loadingComments}
								class="mt-2 h-8 p-1 px-2.5 text-xs"
							>
								{#if !!newComment.id}
									Update Comment
								{:else}
									Add Comment
								{/if}
							</Button>
						</div>
					</div>
				</form>
				<div class="mt-4 max-h-[400px] overflow-y-auto border-t">
					{#each comments as comment}
						<div class="flex items-center justify-between gap-2 border-b py-2">
							<div
								class="w-full rounded px-2 py-2 {newComment.id == comment.id
									? 'bg-input'
									: ''}"
							>
								<p class="mb-2 text-xs font-medium">{comment.comment}</p>
								<div class="flex w-full justify-between gap-x-2">
									<div class="text-xs font-semibold text-muted-foreground">
										<span class="badge-{comment.state}">
											{comment.state}
										</span>
										{moment(comment.commented_at * 1000).format(
											"YYYY-MM-DD HH:mm:ss"
										)}
									</div>
									<div class="flex gap-x-2 pr-2">
										<Button
											variant="ghost"
											size="icon"
											class="h-5 w-5 p-1"
											on:click={() => {
												setCommentEdit(comment);
											}}
										>
											<PenLine class="inline h-4 w-4 text-muted-foreground" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="h-5 w-5 p-1"
											on:click={() => deleteComment(comment)}
										>
											<Trash class="inline h-4 w-4 text-muted-foreground" />
										</Button>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

{#if editMonitorsModal}
	<div
		class="moldal-container fixed left-0 top-0 z-50 h-screen w-full bg-card bg-opacity-30 backdrop-blur-sm"
	>
		<div
			class="absolute left-1/2 top-1/2 h-fit w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border bg-background shadow-lg backdrop-blur-lg"
		>
			<Button
				variant="ghost"
				on:click={() => {
					editMonitorsModal = false;
				}}
				class="absolute right-2 top-2 z-40 h-6 w-6   rounded-full border bg-background p-1"
			>
				<X class="h-4 w-4   text-muted-foreground" />
			</Button>
			<div class="content px-4 py-4">
				<h2 class="text-lg font-semibold">
					Edit monitors affected by <span class="underline">{currentIncident.title}</span>
				</h2>
				<div class="mt-4 max-h-[400px] overflow-y-auto border-t">
					{#each newIncidentMonitors as monitor}
						<div class="flex items-center justify-between gap-2 border-b py-2">
							<div>
								<input
									id="monitor-{monitor.tag}"
									type="checkbox"
									checked={monitor.selected}
									on:change={(e) => {
										monitor.selected = e.target.checked;
										addMonitorToIncident(monitor);
									}}
								/>
								<Label class="text-sm" for="monitor-{monitor.tag}">
									{monitor.name}
								</Label>
							</div>
							<div class="w-[155px]">
								<Select.Root
									portal={null}
									onSelectedChange={(e) => {
										monitor.monitor_impact = e.value;
										addMonitorToIncident(monitor);
									}}
								>
									<Select.Trigger id="impact-{monitor.tag}">
										<Select.Value
											bind:value={monitor.monitor_impact}
											placeholder={monitor.monitor_impact}
										/>
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											<Select.Label>Impact</Select.Label>
											<Select.Item
												value="DOWN"
												label="DOWN"
												class="text-api-down text-sm font-medium"
											>
												DOWN
											</Select.Item>
											<Select.Item
												value="DEGRADED"
												label="DEGRADED"
												class="text-api-degraded text-sm font-medium"
											>
												DEGRADED
											</Select.Item>
										</Select.Group>
									</Select.Content>
								</Select.Root>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}
