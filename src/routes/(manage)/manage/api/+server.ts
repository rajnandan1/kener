import { json } from "@sveltejs/kit";
import Service, { type MonitorWithType } from "$lib/server/services/service.js";
import { format } from "date-fns";
import sharp from "sharp";
import { nanoid } from "nanoid";
import db from "$lib/server/db/db";
import GC from "$lib/global-constants.js";
import {
  CreateUpdateMonitor,
  UpdateMonitoringData,
  InsertKeyValue,
  GetMonitors,
  CreateUpdateTrigger,
  GetAllTriggers,
  UpdateTriggerData,
  DeleteTrigger,
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
  SendEmailWithTemplate,
  GetSiteLogoURL,
  UpdatePassword,
  SendInvitationEmail,
  ResendInvitationEmail,
  GetUserPasswordHashById,
  GetAllUsersPaginatedDashboard,
  GetUserByIDDashboard,
  GetAllUsers,
  GetAllUsersPaginated,
  GetUsersCount,
  GetUserByID,
  GetUserByEmail,
  ManualUpdateUserData,
  DeleteMonitorCompletelyUsingTag,
  GetSiteDataByKey,
  GetMonitoringDataPaginated,
} from "$lib/server/controllers/controller.js";

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
import {
  CreateMonitorAlertConfig,
  UpdateMonitorAlertConfig,
  GetMonitorAlertConfigById,
  GetMonitorAlertConfigsByMonitorTag,
  DeleteMonitorAlertConfig,
  ToggleMonitorAlertConfigStatus,
  GetMonitorAlertsV2Paginated,
  GetMonitorAlertConfigsPaginated,
  DeleteMonitorAlertV2,
  UpdateMonitorAlertV2Status,
  type MonitorAlertConfigRecord,
  type MonitorAlertV2Record,
} from "$lib/server/controllers/monitorAlertConfigController.js";

import {
  GetSubscribersByMethod,
  GetSubscriberWithSubscriptionsV2,
  GetSubscriberCountsByMethod,
  DeleteUserSubscription,
  UpdateUserSubscriptionStatus,
  GetAdminSubscribersPaginated,
  AdminUpdateSubscriptionStatus,
  AdminDeleteSubscriber,
  AdminAddSubscriber,
} from "$lib/server/controllers/userSubscriptionsController.js";
import {
  GetAllSecrets,
  GetSecretById,
  CreateSecret,
  UpdateSecret,
  DeleteSecret,
} from "$lib/server/controllers/vaultController.js";
import {
  GetAllGeneralEmailTemplates,
  GetGeneralEmailTemplateById,
  UpdateGeneralEmailTemplate,
} from "$lib/server/controllers/generalTemplateController.js";
import type { SiteDataForNotification } from "$lib/server/notification/types";
import { alertToVariables, siteDataToVariables } from "$lib/server/notification/notification_utils";
import type { TriggerMeta } from "$lib/server/types/db.js";
import sendWebhook from "$lib/server/notification/webhook_notification.js";
import sendEmail from "$lib/server/notification/email_notification.js";
import sendDiscord from "$lib/server/notification/discord_notification.js";
import sendSlack from "$lib/server/notification/slack_notification.js";
import serverResolver from "$lib/server/resolver.js";

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
      resp = await GetUserByIDDashboard(data.id);
    } else if (action == "updatePassword") {
      data.userID = userDB.id;
      resp = await UpdatePassword(data);
    } else if (action == "createNewUser") {
      await SendInvitationEmail(data.email, data.role, data.name, userDB.role);
      resp = await GetUserByEmail(data.email);
    } else if (action == "resendInvitation") {
      AdminEditorCan(userDB.role);
      await ResendInvitationEmail(data.email, userDB.role);
      resp = { success: true };
    } else if (action == "getUsers") {
      const page = parseInt(String(data.page)) || 1;
      const limit = parseInt(String(data.limit)) || 10;
      const users = await GetAllUsersPaginatedDashboard({ page, limit });
      const totalResult = await GetUsersCount();
      const total = totalResult ? Number(totalResult.count) : 0;
      resp = { users, total };
    } else if (action === "storeSiteData") {
      AdminEditorCan(userDB.role);
      resp = await storeSiteData(data);
    } else if (action == "storeMonitorData") {
      AdminEditorCan(userDB.role);
      resp = await CreateUpdateMonitor(data);
    } else if (action == "updateMonitoringData") {
      data.type = GC.MANUAL;
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
    } else if (action == "deleteTrigger") {
      AdminEditorCan(userDB.role);
      resp = await DeleteTrigger(data.trigger_id);
    } else if (action == "getAllAlertsPaginated") {
      const page = parseInt(String(data.page)) || 1;
      const limit = parseInt(String(data.limit)) || 20;
      const filter: { alert_status?: "TRIGGERED" | "RESOLVED"; config_id?: number } = {};
      if (data.status && data.status !== "ALL") filter.alert_status = data.status as "TRIGGERED" | "RESOLVED";
      if (data.config_id) filter.config_id = parseInt(String(data.config_id));
      resp = await GetMonitorAlertsV2Paginated(page, limit, Object.keys(filter).length > 0 ? filter : undefined);
    } else if (action == "getMonitoringDataPaginated") {
      const page = parseInt(String(data.page)) || 1;
      const limit = parseInt(String(data.limit)) || 50;
      const filter: { monitor_tag?: string; start_time?: number; end_time?: number } = {};
      if (data.monitor_tag && data.monitor_tag !== "ALL") {
        filter.monitor_tag = data.monitor_tag;
      }
      if (data.start_time) {
        filter.start_time = parseInt(String(data.start_time));
      }
      if (data.end_time) {
        filter.end_time = parseInt(String(data.end_time));
      }
      resp = await GetMonitoringDataPaginated(page, limit, Object.keys(filter).length > 0 ? filter : undefined);
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
      const triggerMetaParsed = JSON.parse(trigger.trigger_meta) as TriggerMeta;
      const testAlert: MonitorAlertConfigRecord = {
        id: 1,
        monitor_tag: "test-monitor",
        alert_for: "STATUS",
        alert_value: "DOWN",
        failure_threshold: 1,
        success_threshold: 1,
        alert_description: "This is a test alert",
        create_incident: "NO",
        is_active: "YES",
        severity: "WARNING",
        created_at: new Date(),
        updated_at: new Date(),
      };
      const testAlertData: MonitorAlertV2Record = {
        id: 1,
        config_id: 1,
        alert_status: Math.random() > 0.5 ? "TRIGGERED" : "RESOLVED",
        incident_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const templateAlertVars = alertToVariables(testAlert, testAlertData, siteData.siteURL + serverResolver("/"));
      const templateSiteVars = siteDataToVariables(siteData);
      if (trigger.trigger_type === "webhook") {
        resp = await sendWebhook(
          triggerMetaParsed.webhook_body,
          { ...templateAlertVars, ...templateSiteVars },
          triggerMetaParsed.url,
          JSON.stringify(triggerMetaParsed.headers),
        );
      } else if (trigger.trigger_type === "email") {
        const toAddresses = triggerMetaParsed.to
          .trim()
          .split(",")
          .map((addr) => addr.trim())
          .filter((addr) => addr.length > 0);
        resp = await sendEmail(
          triggerMetaParsed.email_body,
          triggerMetaParsed.email_subject,
          { ...templateAlertVars, ...templateSiteVars },
          toAddresses,
          triggerMetaParsed.from,
        );
      } else if (trigger.trigger_type === "discord") {
        resp = await sendDiscord(
          triggerMetaParsed.discord_body,
          { ...templateAlertVars, ...templateSiteVars },
          triggerMetaParsed.url,
        );
      } else if (trigger.trigger_type === "slack") {
        resp = await sendSlack(
          triggerMetaParsed.slack_body,
          { ...templateAlertVars, ...templateSiteVars },
          triggerMetaParsed.url,
        );
      } else {
        throw new Error("Unsupported trigger type for testing");
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
    // ============ Monitor Alert Config Actions ============
    else if (action == "createMonitorAlertConfig") {
      AdminEditorCan(userDB.role);
      resp = await CreateMonitorAlertConfig(data);
    } else if (action == "updateMonitorAlertConfig") {
      AdminEditorCan(userDB.role);
      resp = await UpdateMonitorAlertConfig(data);
    } else if (action == "getMonitorAlertConfig" || action == "getMonitorAlertConfigById") {
      resp = await GetMonitorAlertConfigById(data.id);
      if (!resp) {
        throw new Error("Monitor alert config not found");
      }
    } else if (action == "getMonitorAlertConfigsByMonitorTag") {
      resp = await GetMonitorAlertConfigsByMonitorTag(data.monitor_tag);
    } else if (action == "deleteMonitorAlertConfig") {
      AdminEditorCan(userDB.role);
      await DeleteMonitorAlertConfig(data.id);
      resp = { success: true };
    } else if (action == "toggleMonitorAlertConfigStatus") {
      AdminEditorCan(userDB.role);
      resp = await ToggleMonitorAlertConfigStatus(data.id);
    } else if (action == "getAlertConfigsPaginated") {
      const page = parseInt(String(data.page)) || 1;
      const limit = parseInt(String(data.limit)) || 10;
      const filter: { monitor_tag?: string; is_active?: "YES" | "NO"; alert_for?: "STATUS" | "LATENCY" | "UPTIME" } =
        {};
      if (data.monitor_tag) filter.monitor_tag = data.monitor_tag;
      if (data.is_active) filter.is_active = data.is_active as "YES" | "NO";
      if (data.alert_for) filter.alert_for = data.alert_for as "STATUS" | "LATENCY" | "UPTIME";
      resp = await GetMonitorAlertConfigsPaginated(page, limit, Object.keys(filter).length > 0 ? filter : undefined);
    } else if (action == "deleteMonitorAlertV2") {
      AdminEditorCan(userDB.role);
      const deleteIncident = data.deleteIncident === true;
      // If deleteIncident is true, delete the incident first
      if (deleteIncident && data.incident_id) {
        await db.deleteIncident(data.incident_id);
      }
      resp = await DeleteMonitorAlertV2(data.id);
    } else if (action == "updateMonitorAlertV2Status") {
      AdminEditorCan(userDB.role);
      resp = await UpdateMonitorAlertV2Status(data.id, data.status);
    }

    // ============ User Subscriptions (Admin) ============
    else if (action == "getSubscribersByMethod") {
      const { method, page = 1, limit = 25 } = data;
      if (!method) {
        throw new Error("Method is required");
      }
      resp = await GetSubscribersByMethod(method, page, limit);
    } else if (action == "getSubscriberWithSubscriptions") {
      // V2: subscriberId is actually the method_id from subscriber_methods table
      const { subscriberId, method } = data;
      if (!subscriberId || !method) {
        throw new Error("subscriberId and method are required");
      }
      // Use V2 function which expects method_id
      const result = await GetSubscriberWithSubscriptionsV2(subscriberId);
      if (result) {
        // Map V2 result to expected format for compatibility with existing UI
        resp = {
          subscriber: {
            id: result.method.id,
            subscriber_send: result.method.method_value,
            subscriber_meta: result.user.email, // Store user email in meta for display
            subscriber_type: result.method.method_type,
            subscriber_status: result.method.status,
            created_at: result.method.created_at,
            updated_at: result.method.updated_at,
          },
          subscriptions: result.subscriptions.map((s) => ({
            id: s.id,
            subscriber_id: s.subscriber_method_id,
            subscription_method: result.method.method_type,
            event_type: s.event_type,
            status: s.status,
            created_at: s.created_at,
            updated_at: s.updated_at,
          })),
        };
      } else {
        resp = { subscriber: null, subscriptions: [] };
      }
    } else if (action == "getSubscriberCountsByMethod") {
      resp = await GetSubscriberCountsByMethod();
    } else if (action == "deleteUserSubscription") {
      AdminCan(userDB.role);
      const { subscriptionId } = data;
      if (!subscriptionId) {
        throw new Error("subscriptionId is required");
      }
      resp = await DeleteUserSubscription(subscriptionId);
    } else if (action == "updateUserSubscriptionStatus") {
      AdminCan(userDB.role);
      const { subscriptionId, status } = data;
      if (!subscriptionId || !status) {
        throw new Error("subscriptionId and status are required");
      }
      resp = await UpdateUserSubscriptionStatus(subscriptionId, status);
    }
    // ============ Email Template Config ============

    // ============ General Email Templates ============
    else if (action == "getGeneralEmailTemplates") {
      resp = await GetAllGeneralEmailTemplates();
    } else if (action == "getGeneralEmailTemplateById") {
      const { templateId } = data;
      if (!templateId) {
        throw new Error("Template ID is required");
      }
      resp = await GetGeneralEmailTemplateById(templateId);
      if (!resp) {
        throw new Error("Template not found");
      }
    } else if (action == "updateGeneralEmailTemplate") {
      AdminEditorCan(userDB.role);
      const { templateId, template_subject, template_html_body, template_text_body } = data;
      if (!templateId) {
        throw new Error("Template ID is required");
      }
      resp = await UpdateGeneralEmailTemplate(templateId, {
        template_subject,
        template_html_body,
        template_text_body,
      });
      if (!resp.success) {
        throw new Error(resp.error);
      }
    }
    // ============ Admin Subscribers Management ============
    else if (action == "getAdminSubscribers") {
      const page = parseInt(String(data.page)) || 1;
      const limit = parseInt(String(data.limit)) || 10;
      resp = await GetAdminSubscribersPaginated(page, limit);
    } else if (action == "adminUpdateSubscriptionStatus") {
      AdminEditorCan(userDB.role);
      const { methodId, eventType, enabled } = data;
      if (!methodId || !eventType) {
        throw new Error("Method ID and event type are required");
      }
      resp = await AdminUpdateSubscriptionStatus(methodId, eventType, enabled);
      if (!resp.success) {
        throw new Error(resp.error);
      }
    } else if (action == "adminDeleteSubscriber") {
      AdminEditorCan(userDB.role);
      const { methodId } = data;
      if (!methodId) {
        throw new Error("Method ID is required");
      }
      resp = await AdminDeleteSubscriber(methodId);
      if (!resp.success) {
        throw new Error(resp.error);
      }
    } else if (action == "adminAddSubscriber") {
      AdminEditorCan(userDB.role);
      const { email, incidents, maintenances } = data;
      if (!email) {
        throw new Error("Email is required");
      }
      resp = await AdminAddSubscriber(email, incidents ?? false, maintenances ?? false);
      if (!resp.success) {
        throw new Error(resp.error);
      }
    }
    // ============ Vault ============
    else if (action == "getVaultSecrets") {
      AdminCan(userDB.role);
      resp = await GetAllSecrets();
    } else if (action == "getVaultSecret") {
      AdminCan(userDB.role);
      const { id } = data;
      if (!id) {
        throw new Error("Secret ID is required");
      }
      resp = await GetSecretById(id);
      if (!resp) {
        throw new Error("Secret not found");
      }
    } else if (action == "createVaultSecret") {
      AdminCan(userDB.role);
      const { secret_name, secret_value } = data;
      resp = await CreateSecret(secret_name, secret_value);
      if (!resp.success) {
        throw new Error(resp.error);
      }
    } else if (action == "updateVaultSecret") {
      AdminCan(userDB.role);
      const { id, secret_name, secret_value } = data;
      if (!id) {
        throw new Error("Secret ID is required");
      }
      resp = await UpdateSecret(id, { secret_name, secret_value });
      if (!resp.success) {
        throw new Error(resp.error);
      }
    } else if (action == "deleteVaultSecret") {
      AdminCan(userDB.role);
      const { id } = data;
      if (!id) {
        throw new Error("Secret ID is required");
      }
      resp = await DeleteSecret(id);
      if (!resp.success) {
        throw new Error(resp.error);
      }
    } else if (action == "getSubscriptionsConfig") {
      AdminCan(userDB.role);
      let subscriptionsSettings = await GetSiteDataByKey("subscriptionsSettings");
      if (!!!subscriptionsSettings) {
        subscriptionsSettings = {
          enable: false,
          methods: {
            emails: {
              incidents: true,
              maintenances: true,
            },
          },
        };
      }
      resp = subscriptionsSettings;
    } else if (action == "updateSubscriptionsConfig") {
      AdminCan(userDB.role);
      resp = await InsertKeyValue("subscriptionsSettings", JSON.stringify(data));
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
