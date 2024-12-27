// @ts-nocheck
import { GetAllSiteData } from "$lib/server/controllers/controller.js";

async function StatusColor(status) {
	let site = await GetAllSiteData();
	return {
		UP: site.colors?.UP || "#00dfa2",
		DEGRADED: site.colors?.DEGRADED || "#e6ca61",
		DOWN: site.colors?.DOWN || "#ca3038",
		NO_DATA: "#f1f5f8"
	};
}

export default StatusColor;
