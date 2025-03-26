// @ts-nocheck
// @ts-ignore
import { json } from "@sveltejs/kit";
import notification from "$lib/server/notification/notif.js";
import Service from "$lib/server/services/service.js";
import verifyEmailTemplate from "$lib/server/templates/verify_email_template.html?raw";
import { base } from "$app/paths";
import { format } from "date-fns";

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
  IsLoggedInSession,
  UpdateUserData,
  CreateNewInvitation,
  SendEmailWithTemplate,
  GetSiteLogoURL,
  UpdatePassword,
  CreateNewUser,
  GetAllUsers,
  GetUserByID,
  GetUserByEmail,
  ManualUpdateUserData,
  DeleteMonitorCompletelyUsingTag,
} from "$lib/server/controllers/controller.js";

import { INVITE_VERIFY_EMAIL } from "$lib/server/constants.js";
import { GetNowTimestampUTC } from "$lib/server/tool.js";

function AdminCan(role) {
  if (role !== "admin") {
    throw new Error("Only Admins can perform this action");
  }
}

function EditorCan(role) {
  if (role !== "editor") {
    throw new Error("Only Editors can perform this action");
  }
}
function MemberCan(role) {
  if (role !== "member") {
    throw new Error("Only Member can perform this action");
  }
}

function AdminEditorCan(role) {
  if (role !== "admin" && role !== "editor") {
    throw new Error("Only Admins and Editors can perform this action");
  }
}

export async function POST({ request, cookies }) {
  const payload = await request.json();
  let action = payload.action;
  let data = payload.data || {};
  let resp = {};

  let isLoggedIn = await IsLoggedInSession(cookies);
  if (!!isLoggedIn.error) {
    return json({ error: "User not logged in" }, { status: 401 });
  }

  let userDB = isLoggedIn.user;

  try {
    if (action == "updateUser") {
      data.userID = userDB.id;
      resp = await UpdateUserData(data);
    } else if (action == "manualUpdate") {
      await ManualUpdateUserData(userDB, data.id, data);
      resp = await GetUserByID(data.id);
    } else if (action == "updatePassword") {
      data.userID = userDB.id;
      resp = await UpdatePassword(data);
    } else if (action == "createNewUser") {
      await CreateNewUser(userDB, data);
      resp = await GetUserByEmail(data.email);
    } else if (action == "sendVerificationEmail") {
      data.invitation_type = INVITE_VERIFY_EMAIL;

      let toEmail = userDB.email;
      let toId = userDB.id;

      if (!!data.toId) {
        toId = data.toId;
        let user = await GetUserByID(toId);
        if (!!!user) {
          throw new Error("User not found");
        }
        toEmail = user.email;
      }

      data.invited_user_id = toId;
      data.invited_by_user_id = userDB.id;

      data.invitation_meta = JSON.stringify({
        header: "Email Verified Successfully",
        message: "Thanks for verifying your email",
      });
      //create timestamp with 1 hour expiry
      const expiryTimestamp = GetNowTimestampUTC() + 3600;
      const expiryDate = new Date(expiryTimestamp * 1000);
      data.invitation_expiry = format(expiryDate, "yyyy-MM-dd HH:mm:ss");

      resp = await CreateNewInvitation(data);
      let token = resp.invitation_token;
      let siteData = await GetAllSiteData();
      let emailData = {
        brand_name: siteData.siteName,
        logo_url: await GetSiteLogoURL(siteData.siteURL, siteData.logo, base),
        verification_url: siteData.siteURL + base + "/manage/invitation?token=" + token,
      };

      resp = await SendEmailWithTemplate(
        verifyEmailTemplate,
        emailData,
        toEmail,
        `[Important] Verify email for ${emailData.brand_name}`,
        `go to ${emailData.verification_url} to verify email`,
      );
    } else if (action === "storeSiteData") {
      AdminEditorCan(userDB.role);
      resp = await storeSiteData(data);
    } else if (action == "storeMonitorData") {
      AdminEditorCan(userDB.role);
      resp = await CreateUpdateMonitor(data);
    } else if (action == "getMonitors") {
      resp = await GetMonitors(data);
    } else if (action == "deleteMonitor") {
      AdminEditorCan(userDB.role);
      resp = await DeleteMonitorCompletelyUsingTag(data.tag);
    } else if (action == "createUpdateTrigger") {
      AdminEditorCan(userDB.role);
      resp = await CreateUpdateTrigger(data);
    } else if (action == "getTriggers") {
      resp = await GetAllTriggers(data);
    } else if (action == "updateMonitorTriggers") {
      AdminEditorCan(userDB.role);
      resp = await UpdateTriggerData(data);
    } else if (action == "getAllAlertsPaginated") {
      resp = await GetAllAlertsPaginated(data);
    } else if (action == "getAPIKeys") {
      resp = await GetAllAPIKeys();
    } else if (action == "createNewApiKey") {
      AdminEditorCan(userDB.role);
      resp = await CreateNewAPIKey(data);
    } else if (action == "updateApiKeyStatus") {
      AdminEditorCan(userDB.role);
      resp = await UpdateApiKeyStatus(data);
    } else if (action == "getIncidents") {
      resp = await GetIncidentsDashboard(data);
    } else if (action == "getIncident") {
      resp = await GetIncidentByIDDashboard(data);
      if (!!!resp) {
        throw new Error("Incident not found");
      }
    } else if (action == "createIncident") {
      AdminEditorCan(userDB.role);
      resp = await CreateIncident(data);
    } else if (action == "updateIncident") {
      AdminEditorCan(userDB.role);
      resp = await UpdateIncident(data.id, data);
    } else if (action == "addMonitor") {
      AdminEditorCan(userDB.role);
      resp = await AddIncidentMonitor(data.incident_id, data.monitor_tag, data.monitor_impact);
    } else if (action == "removeMonitor") {
      AdminEditorCan(userDB.role);
      resp = await RemoveIncidentMonitor(data.incident_id, data.monitor_tag);
    } else if (action == "getComments") {
      resp = await GetIncidentActiveComments(data.incident_id);
    } else if (action == "addComment") {
      AdminEditorCan(userDB.role);
      resp = await AddIncidentComment(data.incident_id, data.comment, data.state, data.commented_at);
    } else if (action == "deleteComment") {
      AdminEditorCan(userDB.role);
      resp = await UpdateCommentStatusByID(data.incident_id, data.comment_id, "INACTIVE");
    } else if (action == "updateComment") {
      AdminEditorCan(userDB.role);
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
