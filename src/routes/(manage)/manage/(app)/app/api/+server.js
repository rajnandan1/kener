// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import notification from "$lib/server/notification/notif.js";
import Service from "$lib/server/services/service.js";
import {
  CreateUpdateMonitor,
  InsertKeyValue,
  GetMonitors,
  CreateUpdateTrigger,
  GetAllTriggers,
  UpdateTriggerData,
  GetAllAlertsPaginated,
  GetIncidentByIDDashboard,
  GetMonitorsParsed,
  GetAllAPIKeys,
  GetAllSiteData,
  CreateNewAPIKey,
  UpdateApiKeyStatus,
  VerifyToken,
  GetIncidentsDashboard,
  CreateIncident,
  AddIncidentMonitor,
  RemoveIncidentMonitor,
  GetIncidentActiveComments,
  UpdateCommentStatusByID,
  AddIncidentComment,
  UpdateCommentByID,
  UpdateIncident,
  GetTriggerByID,
	GetSubscribers,
	SubscribeToIncidentID,
	GetSubscriberByIncidentID,
	SendEmailByIncidentID,
} from "$lib/server/controllers/controller.js";

export async function POST({ request, cookies }) {
  const payload = await request.json();
  let action = payload.action;
  let data = payload.data || {};
  let resp = {};

  let tokenData = cookies.get("kener-user");

  if (!!!tokenData) {
    return json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  let tokenUser = await VerifyToken(tokenData);
  if (!!!tokenUser) {
    //redirect to signin page if user is not authenticated
    return json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  try {
    if (action === "storeSiteData") {
      resp = await storeSiteData(data);
    } else if (action == "storeMonitorData") {
      resp = await CreateUpdateMonitor(data);
    } else if (action == "getMonitors") {
      resp = await GetMonitors(data);
    } else if (action == "createUpdateTrigger") {
      resp = await CreateUpdateTrigger(data);
    } else if (action == "getTriggers") {
      resp = await GetAllTriggers(data);
    } else if (action == "updateMonitorTriggers") {
      resp = await UpdateTriggerData(data);
    } else if (action == "getAllAlertsPaginated") {
      resp = await GetAllAlertsPaginated(data);
    } else if (action == "getAPIKeys") {
      resp = await GetAllAPIKeys();
    } else if (action == "createNewApiKey") {
      resp = await CreateNewAPIKey(data);
    } else if (action == "updateApiKeyStatus") {
      resp = await UpdateApiKeyStatus(data);
    } else if (action == "getIncidents") {
      resp = await GetIncidentsDashboard(data);
    } else if (action == "getIncident") {
      resp = await GetIncidentByIDDashboard(data);
      if (!!!resp) {
        throw new Error("Incident not found");
      }
    } else if (action == "createIncident") {
      resp = await CreateIncident(data);
    } else if (action == "updateIncident") {
      resp = await UpdateIncident(data.id, data);
    } else if (action == "addMonitor") {
      resp = await AddIncidentMonitor(data.incident_id, data.monitor_tag, data.monitor_impact);
    } else if (action == "removeMonitor") {
      resp = await RemoveIncidentMonitor(data.incident_id, data.monitor_tag);
    } else if (action == "getComments") {
      resp = await GetIncidentActiveComments(data.incident_id);
    } else if (action == "addComment") {
      resp = await AddIncidentComment(data.incident_id, data.comment, data.state, data.commented_at, data.notifySubscribers);
    } else if (action == "deleteComment") {
      resp = await UpdateCommentStatusByID(data.incident_id, data.comment_id, "INACTIVE");
    } else if (action == "updateComment") {
      resp = await UpdateCommentByID(data.incident_id, data.comment_id, data.comment, data.state, data.commented_at);
    } else if (action == "testTrigger") {
      let trigger = await GetTriggerByID(data.trigger_id);
      let siteData = await GetAllSiteData();
      const notificationClient = new notification(trigger, siteData, {});
      const testObj = {
        id: "test",
        alert_name: "Test Alert " + (Math.floor(Math.random() * 100) % 2) == 0 ? "DOWN" : "DEGRADED",
        severity: Math.floor(Math.random() * 100) % 2 == 0 ? "critical" : "warning",
        status: Math.floor(Math.random() * 100) % 2 == 0 ? "TRIGGERED" : "RESOLVED",
        source: "Kener",
        timestamp: new Date().toISOString(),
        description: "Monitor has failed",
        details: {
          metric: "Test",
          current_value: Math.floor(Math.random() * 100),
          threshold: Math.floor(Math.random() * 100),
        },
        actions: [
          {
            text: "View Monitor",
            url: siteData.siteURL + "/monitor-test",
          },
        ],
      };
      resp = await notificationClient.send(testObj);
    } else if (action == "testMonitor") {
      let monitorID = data.monitor_id;
      let monitors = await GetMonitorsParsed({ id: monitorID });
      let monitor = monitors[0];
      if (monitor.monitor_type === "NONE") {
        throw new Error("Tests can't be run on monitor type NONE");
      }
      const serviceClient = new Service(monitor);
      resp = await serviceClient.execute();
		} else if (action == "subscribeToIncidentID") {
			resp = await SubscribeToIncidentID(data);
		} else if (action == "getSubscribers") {
			resp = await GetSubscribers();
		} else if (action == "getSubscriberByIncidentID") {
			resp = await GetSubscriberByIncidentID(data);
		} else if (action == "sendEmailByIncidentID") {
			resp = await SendEmailByIncidentID(data);
		}
  } catch (error) {
    resp = { error: error.message };
    return json(resp, { status: 500 });
  }
  return json(resp, { status: 200 });
}
async function storeSiteData(data) {
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const element = data[key];
      await InsertKeyValue(key, element);
    }
  }
  return { success: true };
}
