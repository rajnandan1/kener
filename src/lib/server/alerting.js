// @ts-nocheck
import notification from "./notification/notif.js";

import moment from "moment";
import {
  GetAllSiteData,
  GetAllTriggers,
  CreateIncident,
  AddIncidentComment,
  AddIncidentMonitor,
  InsertNewAlert,
} from "./controllers/controller.js";

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
    threshold: config.failureThreshold,
  };
  let actions = [
    {
      text: "View Monitor",
      url: siteURL + "?monitor=" + monitor.tag,
    },
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
    actions,
  };
}

async function createNewIncident(monitor, alert, commonData) {
  let startDateTime = moment(alert.created_at).unix();
  let payload = {
    start_date_time: startDateTime,
    title: commonData.alert_name,
  };

  let update = commonData.description;
  update =
    update +
    `<div style="line-height: 1.5;">
	<p><strong>Monitor Name:</strong> ${monitor.name}</p>
	<p><strong>Incident Status:</strong> ${commonData.status}</p>
	<p><strong>Severity:</strong> ${commonData.severity}</p>
	<p><strong>Monitor Status:</strong> ${alert.monitor_status}</p>
	<p><strong>Monitor Health Checks:</strong> ${alert.health_checks}</p>
	<p><strong>Monitor Failure Threshold:</strong> ${commonData.details.threshold}</p>
	<p><strong>Visit:</strong> <a href="${commonData.actions[0].url}">${commonData.actions[0].url}</a></p>
</div>`;

  let newIncident = await CreateIncident(payload);

  //add update to incident
  await AddIncidentComment(newIncident.incident_id, update, "INVESTIGATING", startDateTime);

  //add monitor to incident
  await AddIncidentMonitor(newIncident.incident_id, monitor.tag, alert.monitor_status);

  return newIncident;
}

async function closeIncident(alert, comment) {
  let incident_id = alert.incident_number;
  return await AddIncidentComment(incident_id, comment, "RESOLVED", moment(alert.updated_at).unix());
}

function createClosureComment(alert, commonJSON) {
  let comment = "The incident has been auto resolved";
  let downtimeDuration = moment(alert.updated_at).diff(moment(alert.created_at), "minutes");
  comment = comment + `, Total downtime: ` + downtimeDuration + ` minutes`;
  return comment;
}

async function alerting(m) {
  let monitor = await db.getMonitorByTag(m.tag);
  let siteData = await GetAllSiteData();
  const triggers = await GetAllTriggers({
    status: "ACTIVE",
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
      const createIncident = alertConfig.createIncident === "YES";
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
            console.error(`Triggers ${triggerID} not found in server triggers for monitor ${monitor_tag}`);
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

      let isAffected = await db.consecutivelyStatusFor(monitor_tag, monitor_status, failureThreshold);
      let alertExists = await db.alertExists(monitor_tag, monitor_status, TRIGGERED);
      let activeAlert = null;
      if (alertExists) {
        activeAlert = await db.getActiveAlert(monitor_tag, monitor_status, TRIGGERED);
      }
      if (isAffected && !alertExists) {
        activeAlert = await InsertNewAlert({
          monitor_tag: monitor_tag,
          monitor_status: monitor_status,
          alert_status: TRIGGERED,
          health_checks: failureThreshold,
        });
        let commonJSON = await createJSONCommonAlert(monitor, alertConfig, activeAlert, severity);

        if (allMonitorClients.length > 0) {
          for (let i = 0; i < allMonitorClients.length; i++) {
            const client = allMonitorClients[i];
            client.send(commonJSON);
          }
        }
        if (createIncident) {
          let incident = await createNewIncident(monitor, activeAlert, commonJSON);

          if (!!incident) {
            //send incident to incident channel
            await db.addIncidentNumberToAlert(activeAlert.id, incident.incident_id);
          }
        }
      } else if (isAffected && alertExists) {
        await db.incrementAlertHealthChecks(activeAlert.id);
      } else if (!isAffected && alertExists) {
        let isUp = await db.consecutivelyStatusFor(monitor_tag, "UP", successThreshold);
        if (isUp) {
          await db.updateAlertStatus(activeAlert.id, RESOLVED);
          activeAlert.alert_status = RESOLVED;
          let commonJSON = await createJSONCommonAlert(monitor, alertConfig, activeAlert, severity);
          if (allMonitorClients.length > 0) {
            for (let i = 0; i < allMonitorClients.length; i++) {
              const client = allMonitorClients[i];
              client.send(commonJSON);
            }
          }
          if (!!activeAlert.incident_number) {
            let comment = createClosureComment(activeAlert, commonJSON);

            try {
              await closeIncident(activeAlert, comment);
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
