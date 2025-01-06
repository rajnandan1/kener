// @ts-nocheck
import notification from "./notification/notif.js";
import { ParseIncidentPayload, GHIssueToKenerIncident } from "./webhook.js";
import {
	CreateIssue,
	GetIncidentByNumber,
	UpdateIssueLabels,
	AddComment,
	CloseIssue
} from "./github.js";
import moment from "moment";
import { GetAllSiteData, GetGithubData, GetAllTriggers } from "./controllers/controller.js";

import db from "./db/db.js";

const TRIGGERED = "TRIGGERED";
const RESOLVED = "RESOLVED";

async function createJSONCommonAlert(monitor, config, alert, severity) {
	let siteData = await GetAllSiteData();
	let siteURL = siteData.siteURL;
	let id = monitor.tag + "-" + alert.id;
	let alert_name = monitor.name + " " + alert.monitor_status;
	let source = "Kener";
	let timestamp = new Date().toISOString();
	let description = config.description || "Monitor has failed";
	let status = alert.alert_status;
	let details = {
		metric: monitor.name,
		current_value: alert.health_checks,
		threshold: config.failureThreshold
	};
	let actions = [
		{
			text: "View Monitor",
			url: siteURL + "/monitor-" + monitor.tag
		}
	];
	return {
		id,
		alert_name,
		severity,
		status,
		source,
		timestamp,
		description,
		details,
		actions
	};
}

async function createGHIncident(monitor, alert, commonData) {
	let payload = {
		startDatetime: moment(alert.createAt).unix(),
		title: commonData.alert_name,
		tags: [monitor.tag],
		impact: alert.monitor_status,
		body: commonData.description,
		isIdentified: true
	};

	let description = commonData.description;
	description =
		description +
		`\n\n ### Monitor Details \n\n - Monitor Name: ${monitor.name} \n- Incident Status: ${commonData.status} \n- Severity: ${commonData.severity} \n - Monitor Status: ${alert.monitor_status} \n - Monitor Health Checks: ${alert.health_checks} \n - Monitor Failure Threshold: ${commonData.details.threshold} \n\n ### Actions \n\n - [${commonData.actions[0].text}](${commonData.actions[0].url}) \n\n`;

	payload.body = description;

	let { title, body, githubLabels, error } = await ParseIncidentPayload(payload);
	if (error) {
		return;
	}

	githubLabels.push("auto");
	let resp = await CreateIssue(title, body, githubLabels);

	return await GHIssueToKenerIncident(resp);
}

async function closeGHIncident(alert) {
	let incident_number = alert.incident_number;
	let issue = await GetIncidentByNumber(incident_number);
	if (issue === null) {
		return;
	}
	let labels = issue.labels.map((label) => {
		return label.name;
	});
	labels = labels.filter((label) => label !== "resolved");
	labels.push("resolved");

	let endDatetime = moment(alert.updated_at).unix();
	let body = issue.body;
	body = body.replace(/\[end_datetime:(\d+)\]/g, "");
	body = body.trim();
	body = body + " " + `[end_datetime:${endDatetime}]`;

	let resp = await UpdateIssueLabels(incident_number, labels, body);
	if (resp === null) {
		return;
	}
	await CloseIssue(incident_number);
	return await GHIssueToKenerIncident(resp);
}

//add comment to incident
async function addCommentToIncident(alert, comment) {
	let resp = await AddComment(alert.incident_number, comment);
	return resp;
}

function createClosureComment(alert, commonJSON) {
	let comment = "The incident has been auto resolved";
	let downtimeDuration = moment(alert.updated_at).diff(moment(alert.created_at), "minutes");
	comment = comment + `\n\nTotal downtime: ` + downtimeDuration + ` minutes`;
	return comment;
}

async function alerting(m) {
	let monitor = await db.getMonitorByTag(m.tag);
	let siteData = await GetAllSiteData();
	const githubData = await GetGithubData();
	const triggers = await GetAllTriggers({
		status: "ACTIVE"
	});
	const triggerObj = {};
	if (!!monitor.down_trigger) {
		triggerObj.down_trigger = JSON.parse(monitor.down_trigger);
	}
	if (!!monitor.degraded_trigger) {
		triggerObj.degraded_trigger = JSON.parse(monitor.degraded_trigger);
	}

	for (const key in triggerObj) {
		if (Object.prototype.hasOwnProperty.call(triggerObj, key)) {
			const alertConfig = triggerObj[key];
			const monitor_status = alertConfig.trigger_type;

			const failureThreshold = alertConfig.failureThreshold;
			const successThreshold = alertConfig.successThreshold;
			const monitor_tag = monitor.tag;
			const alertingChannels = alertConfig.triggers; //array of numbers of trigger ids
			const createIncident = alertConfig.createIncident === "YES" && !!githubData;
			const allMonitorClients = [];
			const sendTrigger = alertConfig.active;
			const severity = alertConfig.severity;
			if (!sendTrigger) {
				continue;
			}
			if (alertingChannels.length > 0) {
				for (let i = 0; i < alertingChannels.length; i++) {
					const triggerID = alertingChannels[i];
					const trigger = triggers.find((c) => c.id === triggerID);
					if (!trigger) {
						console.error(
							`Triggers ${triggerID} not found in server triggers for monitor ${monitor_tag}`
						);
						continue;
					}
					if (trigger.trigger_status !== "ACTIVE") {
						console.error(`Triggers ${triggerID} is not active`);
						continue;
					}
					const notificationClient = new notification(trigger, siteData, monitor);
					allMonitorClients.push(notificationClient);
				}
			}

			let isAffected = await db.consecutivelyStatusFor(
				monitor_tag,
				monitor_status,
				failureThreshold
			);
			let alertExists = await db.alertExists(monitor_tag, monitor_status, TRIGGERED);
			let activeAlert = null;
			if (alertExists) {
				activeAlert = await db.getActiveAlert(monitor_tag, monitor_status, TRIGGERED);
			}
			if (isAffected && !alertExists) {
				activeAlert = await db.insertAlert({
					monitor_tag: monitor_tag,
					monitor_status: monitor_status,
					alert_status: TRIGGERED,
					health_checks: failureThreshold
				});
				let commonJSON = await createJSONCommonAlert(
					monitor,
					alertConfig,
					activeAlert,
					severity
				);

				if (allMonitorClients.length > 0) {
					for (let i = 0; i < allMonitorClients.length; i++) {
						const client = allMonitorClients[i];
						client.send(commonJSON);
					}
				}
				if (createIncident) {
					let incident = await createGHIncident(monitor, activeAlert, commonJSON);

					if (!!incident) {
						//send incident to incident channel
						await db.addIncidentNumberToAlert(activeAlert.id, incident.incident_number);
					}
				}
			} else if (isAffected && alertExists) {
				await db.incrementAlertHealthChecks(activeAlert.id);
			} else if (!isAffected && alertExists) {
				let isUp = await db.consecutivelyStatusFor(monitor_tag, "UP", successThreshold);
				if (isUp) {
					await db.updateAlertStatus(activeAlert.id, RESOLVED);
					activeAlert.alert_status = RESOLVED;
					let commonJSON = await createJSONCommonAlert(
						monitor,
						alertConfig,
						activeAlert,
						severity
					);
					if (allMonitorClients.length > 0) {
						for (let i = 0; i < allMonitorClients.length; i++) {
							const client = allMonitorClients[i];
							client.send(commonJSON);
						}
					}
					if (!!activeAlert.incident_number) {
						let comment = createClosureComment(activeAlert, commonJSON);

						try {
							await addCommentToIncident(activeAlert, comment);
							await closeGHIncident(activeAlert);
						} catch (error) {
							console.log(error);
						}
					}
				}
			}
		}
	}
}

export default alerting;
