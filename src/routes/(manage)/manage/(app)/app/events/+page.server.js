import { GetMonitors } from "$lib/server/controllers/controller.js";

export async function load({ parent }) {
	let monitors = await GetMonitors({ status: "ACTIVE" });
	return {
		monitors: monitors
	};
}
