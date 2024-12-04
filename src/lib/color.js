// @ts-nocheck
import { siteStore } from "./server/stores/site.js";
import { get } from "svelte/store";
const site = get(siteStore);

const StatusColor = {
	UP: site.colors?.UP || "#00dfa2",
	DEGRADED: site.colors?.DEGRADED || "#e6ca61",
	DOWN: site.colors?.DOWN || "#ca3038",
	NO_DATA: "#f1f5f8"
};

export default StatusColor;
