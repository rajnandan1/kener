import { json } from "@sveltejs/kit";
import Notification from "$lib/server/notification/notif.js";
import Service, { type MonitorWithType } from "$lib/server/services/service.js";
import verifyEmailTemplate from "$lib/server/templates/verify_email";
import { format } from "date-fns";
import sharp from "sharp";
import { nanoid } from "nanoid";
import db from "$lib/server/db/db";

import {
  CreateUpdateMonitor,
  UpdateMonitoringData,
  InsertKeyValue,
  GetMonitors,
  CreateUpdateTrigger,
  UpdateSubscriptionTriggerStatus,
  GetAllTriggers,
  UpdateTriggerData,
  GetSubscriptionTriggerByEmail,
  CreateSubscriptionTrigger,
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
  GetAllUsersPaginated,
  GetUsersCount,
  GetUserByID,
  GetUserByEmail,
  ManualUpdateUserData,
  DeleteMonitorCompletelyUsingTag,
  GetSubscribersPaginated,
  UpdateSubscriptionStatus,
} from "$lib/server/controllers/controller.js";

import { INVITE_VERIFY_EMAIL, MANUAL } from "$lib/server/constants.js";
import { GetNowTimestampUTC } from "$lib/server/tool.js";
import {
  CreatePage,
  GetAllPages,
  GetPageById,
  UpdatePage,
  DeletePage,
  AddMonitorToPage,
  RemoveMonitorFromPage,
  GetPageMonitors,
} from "$lib/server/controllers/pagesController.js";
import {
  CreateMaintenance,
  GetMaintenanceWithEvents,
  GetMaintenancesDashboard,
  UpdateMaintenance,
  DeleteMaintenance,
  CreateMaintenanceEvent,
  GetMaintenanceEventById,
  GetMaintenanceEventsByMaintenanceId,
  UpdateMaintenanceEvent,
  DeleteMaintenanceEvent,
  AddMonitorToMaintenance,
  RemoveMonitorFromMaintenance,
  GetMaintenanceMonitors,
  UpdateMaintenanceMonitorImpact,
} from "$lib/server/controllers/maintenanceController.js";
import type { AlertData, SiteDataForNotification } from "$lib/server/notification/variables";

function AdminCan(role: string) {
  if (role !== "admin") {
    throw new Error("Only Admins can perform this action");
  }
}

function EditorCan(role: string) {
  if (role !== "editor") {
    throw new Error("Only Editors can perform this action");
  }
}
function MemberCan(role: string) {
  if (role !== "member") {
    throw new Error("Only Member can perform this action");
  }
}

function AdminEditorCan(role: string) {
  if (role !== "admin" && role !== "editor") {
    throw new Error("Only Admins and Editors can perform this action");
  }
}

export async function POST({ request, cookies }) {
  const payload = await request.json();
  let action = payload.action;
  let data = payload.data || {};
  let resp: any = {};

  let isLoggedIn = await IsLoggedInSession(cookies);
  if (!!isLoggedIn.error || !isLoggedIn.user) {
    return json({ error: "User not logged in" }, { status: 401 });
  }

  let userDB = isLoggedIn.user;

  try {
    if (action == "updateUser") {
      data.userID = userDB.id;
      resp = await UpdateUserData(data);
    } else if (action == "getAllSiteData") {
      resp = await GetAllSiteData();
    } else if (action == "manualUpdate") {
      await ManualUpdateUserData(userDB, data.id, data);
      resp = await GetUserByID(data.id);
    } else if (action == "updatePassword") {
      data.userID = userDB.id;
      resp = await UpdatePassword(data);
    } else if (action == "createNewUser") {
      await CreateNewUser(userDB, data);
      resp = await GetUserByEmail(data.email);
    } else if (action == "getUsers") {
      const page = parseInt(String(data.page)) || 1;
      const limit = parseInt(String(data.limit)) || 10;
      const users = await GetAllUsersPaginated({ page, limit });
      const totalResult = await GetUsersCount();
      const total = totalResult ? Number(totalResult.count) : 0;
      resp = { users, total };
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
        brand_name: siteData.siteName || "Kener",
        logo_url: "",
        verification_url: siteData.siteURL + "/manage/invitation?token=" + token,
      };
      if (siteData.logo) {
        emailData.logo_url = await GetSiteLogoURL(siteData.siteURL, siteData.logo, "/");
      }

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
    } else if (action == "updateMonitoringData") {
      data.type = MANUAL;
      resp = await UpdateMonitoringData(data);
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
      const trigger = await GetTriggerByID(data.trigger_id);

      const siteData = await GetAllSiteData();
      if (!trigger || !siteData) {
        throw new Error("Trigger not found");
      }
      const siteDataForNotification: SiteDataForNotification = {
        siteURL: siteData.siteURL,
        siteName: siteData.siteName || "Kener",
        logo: siteData.logo || "",
        colors: {
          UP: siteData.colors.UP || "#28a745",
          DOWN: siteData.colors.DOWN || "#dc3545",
          DEGRADED: siteData.colors.DEGRADED || "#ffc107",
          MAINTENANCE: siteData.colors.MAINTENANCE || "#17a2b8",
        },
      };
      const notificationClient = new Notification(trigger, siteDataForNotification);
      const testObj: AlertData = {
        id: "test",
        alert_name: "Test Alert " + (Math.floor(Math.random() * 100) % 2 === 0 ? "DOWN" : "DEGRADED"),
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
      //check if resp is error
      if (resp.error) {
        throw new Error(resp.error);
      }
    } else if (action == "testMonitor") {
      let monitorID = data.monitor_id;
      let monitors = await GetMonitorsParsed({ id: monitorID });
      let monitor = monitors[0];
      if (monitor.monitor_type === "NONE") {
        throw new Error("Tests can't be run on monitor type NONE");
      }
      const monitorReducedType: MonitorWithType = {
        tag: monitor.tag,
        monitor_type: monitor.monitor_type,
        type_data: monitor.type_data,
        cron: monitor.cron ? monitor.cron : undefined,
      };
      const serviceClient = new Service(monitorReducedType);
      resp = await serviceClient.execute();
    } else if (action == "createSubscriptionTrigger") {
      resp = await CreateSubscriptionTrigger(data);
    } else if (action == "getSubscriptionTrigger") {
      resp = await GetSubscriptionTriggerByEmail();
    } else if (action == "getSubscribers") {
      resp = await GetSubscribersPaginated(data);
    } else if (action == "updateSubscriptionStatus") {
      resp = await UpdateSubscriptionStatus(data.id, data.status);
    } else if (action == "updateSubscriptionTriggerStatus") {
      resp = await UpdateSubscriptionTriggerStatus(data.id, data.status);
    } else if (action == "uploadImage") {
      AdminEditorCan(userDB.role);
      resp = await uploadImage(data);
    } else if (action == "deleteImage") {
      AdminEditorCan(userDB.role);
      resp = await db.deleteImage(data.id);
    } else if (action == "getPages") {
      const pages = await GetAllPages();
      // Fetch monitors for each page
      const pagesWithMonitors = await Promise.all(
        pages.map(async (page) => {
          const monitors = await GetPageMonitors(page.id);
          return { ...page, monitors };
        }),
      );
      resp = pagesWithMonitors;
    } else if (action == "createPage") {
      AdminEditorCan(userDB.role);
      resp = await CreatePage(data);
    } else if (action == "updatePage") {
      AdminEditorCan(userDB.role);
      const { id, ...updateData } = data;
      resp = await UpdatePage(id, updateData);
    } else if (action == "deletePage") {
      AdminEditorCan(userDB.role);
      await DeletePage(data.id);
      resp = { success: true };
    } else if (action == "addMonitorToPage") {
      AdminEditorCan(userDB.role);
      await AddMonitorToPage(data.page_id, data.monitor_tag);
      resp = { success: true };
    } else if (action == "removeMonitorFromPage") {
      AdminEditorCan(userDB.role);
      await RemoveMonitorFromPage(data.page_id, data.monitor_tag);
      resp = { success: true };
    }
    // ============ Maintenance Actions ============
    else if (action == "getMaintenances") {
      resp = await GetMaintenancesDashboard(data);
    } else if (action == "getMaintenance") {
      resp = await GetMaintenanceWithEvents(data.id);
      if (!resp) {
        throw new Error("Maintenance not found");
      }
    } else if (action == "createMaintenance") {
      AdminEditorCan(userDB.role);
      resp = await CreateMaintenance(data);
    } else if (action == "updateMaintenance") {
      AdminEditorCan(userDB.role);
      const { id, ...updateData } = data;
      await UpdateMaintenance(id, updateData);
      resp = { success: true };
    } else if (action == "deleteMaintenance") {
      AdminEditorCan(userDB.role);
      await DeleteMaintenance(data.id);
      resp = { success: true };
    } else if (action == "getMaintenanceEvents") {
      resp = await GetMaintenanceEventsByMaintenanceId(data.maintenance_id);
    } else if (action == "getMaintenanceEvent") {
      resp = await GetMaintenanceEventById(data.id);
      if (!resp) {
        throw new Error("Maintenance event not found");
      }
    } else if (action == "createMaintenanceEvent") {
      AdminEditorCan(userDB.role);
      resp = await CreateMaintenanceEvent(data);
    } else if (action == "updateMaintenanceEvent") {
      AdminEditorCan(userDB.role);
      const { id, ...updateData } = data;
      await UpdateMaintenanceEvent(id, updateData);
      resp = { success: true };
    } else if (action == "deleteMaintenanceEvent") {
      AdminEditorCan(userDB.role);
      await DeleteMaintenanceEvent(data.id);
      resp = { success: true };
    } else if (action == "addMonitorToMaintenance") {
      AdminEditorCan(userDB.role);
      await AddMonitorToMaintenance(data.maintenance_id, data.monitor_tag);
      resp = { success: true };
    } else if (action == "removeMonitorFromMaintenance") {
      AdminEditorCan(userDB.role);
      await RemoveMonitorFromMaintenance(data.maintenance_id, data.monitor_tag);
      resp = { success: true };
    } else if (action == "getMaintenanceMonitors") {
      resp = await GetMaintenanceMonitors(data.maintenance_id);
    } else if (action == "updateMaintenanceMonitorImpact") {
      AdminEditorCan(userDB.role);
      await UpdateMaintenanceMonitorImpact(data.maintenance_id, data.monitor_tag, data.monitor_impact);
      resp = { success: true };
    }
  } catch (error: unknown) {
    console.log(error);
    const message = error instanceof Error ? error.message : String(error);
    resp = { error: message };
    return json(resp, { status: 500 });
  }
  return json(resp, { status: 200 });
}
async function storeSiteData(data: { [x: string]: any }) {
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const element = data[key];
      await InsertKeyValue(key, element);
    }
  }
  return { success: true };
}

interface ImageUploadData {
  base64: string; // base64 encoded image data (without data URI prefix)
  mimeType: string;
  fileName?: string;
  maxWidth?: number;
  maxHeight?: number;
  prefix?: string; // prefix for the ID (e.g., "logo_", "favicon_")
}

async function uploadImage(data: ImageUploadData): Promise<{ id: string; url: string }> {
  const { base64, mimeType, fileName, maxWidth = 256, maxHeight = 256, prefix = "img_" } = data;

  if (!base64) {
    throw new Error("Image data is required");
  }

  const allowedMimeTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new Error(`Invalid image type. Allowed types: ${allowedMimeTypes.join(", ")}`);
  }

  // Decode base64 to buffer
  const imageBuffer = Buffer.from(base64, "base64");

  let processedBuffer: Buffer;
  let finalMimeType = mimeType;
  let width: number | undefined;
  let height: number | undefined;

  // Process with sharp (except SVG which we keep as-is)
  if (mimeType === "image/svg+xml") {
    processedBuffer = imageBuffer;
    // For SVG, we don't have width/height info easily, keep as null
  } else {
    // Resize image maintaining aspect ratio
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    // Calculate new dimensions maintaining aspect ratio
    let newWidth = metadata.width || maxWidth;
    let newHeight = metadata.height || maxHeight;

    if (newWidth > maxWidth || newHeight > maxHeight) {
      const ratio = Math.min(maxWidth / newWidth, maxHeight / newHeight);
      newWidth = Math.round(newWidth * ratio);
      newHeight = Math.round(newHeight * ratio);
    }

    width = newWidth;
    height = newHeight;

    // Resize and convert to PNG for consistency (except keep JPEG as JPEG)
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
      processedBuffer = await image.resize(newWidth, newHeight, { fit: "inside" }).jpeg({ quality: 85 }).toBuffer();
      finalMimeType = "image/jpeg";
    } else {
      processedBuffer = await image.resize(newWidth, newHeight, { fit: "inside" }).png().toBuffer();
      finalMimeType = "image/png";
    }
  }

  // Generate ID with prefix and nanoid
  const id = `${prefix}${nanoid(16)}`;

  // Convert processed image back to base64
  const processedBase64 = processedBuffer.toString("base64");

  // Store in database
  await db.insertImage({
    id,
    data: processedBase64,
    mime_type: finalMimeType,
    original_name: fileName || null,
    width: width || null,
    height: height || null,
    size: processedBuffer.length,
  });

  return {
    id,
    url: `/assets/images/${id}`,
  };
}
