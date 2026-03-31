/**
 * Permissions derived from src/routes/(manage)/manage/api/+server.ts actions.
 * Grouped by domain with read/write granularity.
 *
 * Mapping from actions → permissions:
 *
 * monitors.read      → getMonitors, getMonitoringDataPaginated
 * monitors.write     → storeMonitorData, updateMonitoringData, deleteMonitor, deleteMonitorData, cloneMonitor, testMonitor
 *
 * incidents.read     → getIncidents, getIncident, getComments
 * incidents.write    → createIncident, updateIncident, deleteIncident, addMonitor, removeMonitor, addComment, deleteComment, updateComment
 *
 * maintenances.read  → getMaintenances, getMaintenance, getMaintenanceEvents, getMaintenanceEvent, getMaintenanceMonitors
 * maintenances.write → createMaintenance, updateMaintenance, deleteMaintenance, createMaintenanceEvent, updateMaintenanceEvent, deleteMaintenanceEvent, addMonitorToMaintenance, removeMonitorFromMaintenance, updateMaintenanceMonitorImpact
 *
 * pages.read         → getPages
 * pages.write        → createPage, updatePage, deletePage, addMonitorToPage, removeMonitorFromPage, reorderPageMonitors
 *
 * triggers.read      → getTriggers
 * triggers.write     → createUpdateTrigger, updateMonitorTriggers, deleteTrigger, testTrigger
 *
 * alerts.read        → getMonitorAlertConfig, getMonitorAlertConfigById, getMonitorAlertConfigsByMonitorTag, getAlertConfigsPaginated, getAllAlertsPaginated
 * alerts.write       → createMonitorAlertConfig, updateMonitorAlertConfig, deleteMonitorAlertConfig, toggleMonitorAlertConfigStatus, deleteMonitorAlertV2, updateMonitorAlertV2Status
 *
 * api_keys.read      → getAPIKeys
 * api_keys.write     → createNewApiKey, updateApiKeyStatus
 * api_keys.delete    → deleteApiKey (admin-only today)
 *
 * users.read         → getUsers
 * users.write        → manualUpdate, createNewUser, resendInvitation, sendVerificationEmail
 *
 * settings.read      → getAllSiteData, getSiteDataByKey, getSubscriptionsConfig
 * settings.write     → storeSiteData, updateSubscriptionsConfig
 *
 * subscribers.read   → getSubscribersByMethod, getSubscriberWithSubscriptions, getSubscriberCountsByMethod, getAdminSubscribers
 * subscribers.write  → deleteUserSubscription, updateUserSubscriptionStatus, adminUpdateSubscriptionStatus, adminDeleteSubscriber, adminAddSubscriber
 *
 * email_templates.read  → getGeneralEmailTemplates, getGeneralEmailTemplateById
 * email_templates.write → updateGeneralEmailTemplate
 *
 * images.write       → uploadImage, deleteImage
 */
export const permissions: Array<{ id: string; permission_name: string }> = [
  // Monitors
  { id: "monitors.read", permission_name: "View monitors and monitoring data" },
  { id: "monitors.write", permission_name: "Create, update, delete, and clone monitors" },

  // Incidents
  { id: "incidents.read", permission_name: "View incidents and comments" },
  { id: "incidents.write", permission_name: "Create, update, and delete incidents and comments" },

  // Maintenances
  { id: "maintenances.read", permission_name: "View maintenances and events" },
  { id: "maintenances.write", permission_name: "Create, update, and delete maintenances and events" },

  // Pages
  { id: "pages.read", permission_name: "View pages" },
  { id: "pages.write", permission_name: "Create, update, and delete pages" },

  // Triggers
  { id: "triggers.read", permission_name: "View triggers" },
  { id: "triggers.write", permission_name: "Create, update, delete, and test triggers" },

  // Alerts
  { id: "alerts.read", permission_name: "View alert configurations and alert history" },
  { id: "alerts.write", permission_name: "Create, update, and delete alert configurations" },

  // API Keys
  { id: "api_keys.read", permission_name: "View API keys" },
  { id: "api_keys.write", permission_name: "Create and update API keys" },
  { id: "api_keys.delete", permission_name: "Delete API keys" },

  // Users
  { id: "users.read", permission_name: "View users" },
  { id: "users.write", permission_name: "Manage users, invitations, and verification" },

  // Settings (site data + subscriptions config)
  { id: "settings.read", permission_name: "View site settings and subscriptions config" },
  { id: "settings.write", permission_name: "Update site settings and subscriptions config" },

  // Subscribers
  { id: "subscribers.read", permission_name: "View subscribers" },
  { id: "subscribers.write", permission_name: "Manage subscribers and subscriptions" },

  // Email Templates
  { id: "email_templates.read", permission_name: "View email templates" },
  { id: "email_templates.write", permission_name: "Update email templates" },

  // Images
  { id: "images.write", permission_name: "Upload and delete images" },

  // Roles
  { id: "roles.read", permission_name: "View roles, permissions, and user assignments" },
  { id: "roles.write", permission_name: "Create, update, and delete roles" },
  { id: "roles.assign_permissions", permission_name: "Add and remove permissions from roles" },
  { id: "roles.assign_users", permission_name: "Add and remove users to and from roles" },
];

export const ACTION_PERMISSION_MAP: Record<string, string | null> = {
  // Self-actions — no permission needed beyond being logged in
  updateUser: null,
  updatePassword: null,
  sendVerificationEmail: null, // controller has its own self-vs-other check

  // Settings
  getAllSiteData: "settings.read",
  getSiteDataByKey: "settings.read",
  getSubscriptionsConfig: "settings.read",
  storeSiteData: "settings.write",
  updateSubscriptionsConfig: "settings.write",

  // Users
  getUsers: "users.read",
  manualUpdate: "users.write",
  createNewUser: "users.write",
  resendInvitation: "users.write",

  // Monitors
  getMonitors: "monitors.read",
  getMonitoringDataPaginated: "monitors.read",
  storeMonitorData: "monitors.write",
  updateMonitoringData: "monitors.write",
  deleteMonitor: "monitors.write",
  deleteMonitorData: "monitors.write",
  cloneMonitor: "monitors.write",
  testMonitor: "monitors.write",

  // Incidents
  getIncidents: "incidents.read",
  getIncident: "incidents.read",
  getComments: "incidents.read",
  createIncident: "incidents.write",
  updateIncident: "incidents.write",
  deleteIncident: "incidents.write",
  addMonitor: "incidents.write",
  removeMonitor: "incidents.write",
  addComment: "incidents.write",
  deleteComment: "incidents.write",
  updateComment: "incidents.write",

  // Maintenances
  getMaintenances: "maintenances.read",
  getMaintenance: "maintenances.read",
  getMaintenanceEvents: "maintenances.read",
  getMaintenanceEvent: "maintenances.read",
  getMaintenanceMonitors: "maintenances.read",
  createMaintenance: "maintenances.write",
  updateMaintenance: "maintenances.write",
  deleteMaintenance: "maintenances.write",
  createMaintenanceEvent: "maintenances.write",
  updateMaintenanceEvent: "maintenances.write",
  deleteMaintenanceEvent: "maintenances.write",
  addMonitorToMaintenance: "maintenances.write",
  removeMonitorFromMaintenance: "maintenances.write",
  updateMaintenanceMonitorImpact: "maintenances.write",

  // Pages
  getPages: "pages.read",
  createPage: "pages.write",
  updatePage: "pages.write",
  deletePage: "pages.write",
  addMonitorToPage: "pages.write",
  removeMonitorFromPage: "pages.write",
  reorderPageMonitors: "pages.write",

  // Triggers
  getTriggers: "triggers.read",
  createUpdateTrigger: "triggers.write",
  updateMonitorTriggers: "triggers.write",
  deleteTrigger: "triggers.write",
  testTrigger: "triggers.write",

  // Alerts
  getAllAlertsPaginated: "alerts.read",
  getMonitorAlertConfig: "alerts.read",
  getMonitorAlertConfigById: "alerts.read",
  getMonitorAlertConfigsByMonitorTag: "alerts.read",
  getAlertConfigsPaginated: "alerts.read",
  createMonitorAlertConfig: "alerts.write",
  updateMonitorAlertConfig: "alerts.write",
  deleteMonitorAlertConfig: "alerts.write",
  toggleMonitorAlertConfigStatus: "alerts.write",
  deleteMonitorAlertV2: "alerts.write",
  updateMonitorAlertV2Status: "alerts.write",

  // API Keys
  getAPIKeys: "api_keys.read",
  createNewApiKey: "api_keys.write",
  updateApiKeyStatus: "api_keys.write",
  deleteApiKey: "api_keys.delete",

  // Subscribers
  getSubscribersByMethod: "subscribers.read",
  getSubscriberWithSubscriptions: "subscribers.read",
  getSubscriberCountsByMethod: "subscribers.read",
  getAdminSubscribers: "subscribers.read",
  deleteUserSubscription: "subscribers.write",
  updateUserSubscriptionStatus: "subscribers.write",
  adminUpdateSubscriptionStatus: "subscribers.write",
  adminDeleteSubscriber: "subscribers.write",
  adminAddSubscriber: "subscribers.write",

  // Email Templates
  getGeneralEmailTemplates: "email_templates.read",
  getGeneralEmailTemplateById: "email_templates.read",
  updateGeneralEmailTemplate: "email_templates.write",

  // Images
  uploadImage: "images.write",
  deleteImage: "images.write",

  // Roles
  getRoles: "roles.read",
  getAllPermissions: "roles.read",
  getRolePermissions: "roles.read",
  getRoleUsers: "roles.read",
  createRole: "roles.write",
  updateRole: "roles.write",
  deleteRole: "roles.write",
  updateRolePermissions: "roles.assign_permissions",
  addUserToRole: "roles.assign_users",
  removeUserFromRole: "roles.assign_users",
};

export const ROUTE_PERMISSION_MAP: Record<string, string | null> = {
  // Monitors
  "/(manage)/manage/app/monitors": "monitors.read",
  "/(manage)/manage/app/monitors/[tag]": "monitors.read",
  "/(manage)/manage/app/monitoring-data": "monitors.read",

  // Incidents
  "/(manage)/manage/app/incidents": "incidents.read",
  "/(manage)/manage/app/incidents/[incident_id]": "incidents.read",

  // Maintenances
  "/(manage)/manage/app/maintenances": "maintenances.read",
  "/(manage)/manage/app/maintenances/[id]": "maintenances.read",

  // Pages
  "/(manage)/manage/app/pages": "pages.read",
  "/(manage)/manage/app/pages/[page_id]": "pages.read",

  // Triggers
  "/(manage)/manage/app/triggers": "triggers.read",
  "/(manage)/manage/app/triggers/[trigger_id]": "triggers.read",

  // Alerts
  "/(manage)/manage/app/alerts": "alerts.read",
  "/(manage)/manage/app/alerts/[alert_config_id]": "alerts.read",
  "/(manage)/manage/app/alerts/logs/[alert_config_id]": "alerts.read",

  // API Keys
  "/(manage)/manage/app/api-keys": "api_keys.read",

  // Users
  "/(manage)/manage/app/users": "users.read",

  // Settings
  "/(manage)/manage/app/site-configurations": "settings.read",
  "/(manage)/manage/app/customizations": "settings.read",
  "/(manage)/manage/app/internationalization": "settings.read",
  "/(manage)/manage/app/analytics-providers": "settings.read",
  "/(manage)/manage/app/badges": "settings.read",
  "/(manage)/manage/app/embed": "settings.read",
  "/(manage)/manage/app/vault": "settings.read",

  // Subscribers
  "/(manage)/manage/app/subscriptions": "subscribers.read",

  // Email Templates
  "/(manage)/manage/app/templates": "email_templates.read",

  // Roles
  "/(manage)/manage/app/roles": "roles.read",
};
