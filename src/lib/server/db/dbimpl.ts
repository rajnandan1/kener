import Knex from "knex";
import type { Knex as KnexType } from "knex";

// Import all repositories
import { MonitoringRepository } from "./repositories/monitoring.js";
import { MonitorsRepository } from "./repositories/monitors.js";
import { AlertsRepository } from "./repositories/alerts.js";
import { UsersRepository } from "./repositories/users.js";
import { SiteDataRepository } from "./repositories/site-data.js";
import { IncidentsRepository } from "./repositories/incidents.js";
import { SubscribersRepository } from "./repositories/subscribers.js";
import { ImagesRepository } from "./repositories/images.js";
import { PagesRepository } from "./repositories/pages.js";
import { MaintenancesRepository } from "./repositories/maintenances.js";
import { MonitorAlertConfigRepository } from "./repositories/monitorAlertConfig.js";

// Re-export types from base
export type { MonitorFilter, TriggerFilter, IncidentFilter, CountResult } from "./repositories/base.js";

// Re-export all db types for convenience
export type * from "../types/db.js";

/**
 * DbImpl - Main database implementation that composes all domain repositories
 *
 * This class delegates all operations to domain-specific repositories while
 * maintaining backward compatibility with existing code.
 */
class DbImpl {
  private knex: KnexType;

  // Domain repositories
  private monitoring!: MonitoringRepository;
  private monitors!: MonitorsRepository;
  private alerts!: AlertsRepository;
  private users!: UsersRepository;
  private siteData!: SiteDataRepository;
  private incidents!: IncidentsRepository;
  private subscribers!: SubscribersRepository;
  private images!: ImagesRepository;
  private pages!: PagesRepository;
  private maintenances!: MaintenancesRepository;
  private monitorAlertConfig!: MonitorAlertConfigRepository;

  // Method bindings - declared with definite assignment assertion
  // ============ Monitoring Data ============
  insertMonitoringData!: MonitoringRepository["insertMonitoringData"];
  getMonitoringData!: MonitoringRepository["getMonitoringData"];
  getMonitoringDataAll!: MonitoringRepository["getMonitoringDataAll"];
  getLatestMonitoringData!: MonitoringRepository["getLatestMonitoringData"];
  getLatestMonitoringDataN!: MonitoringRepository["getLatestMonitoringDataN"];
  getMonitoringDataAt!: MonitoringRepository["getMonitoringDataAt"];
  getLatestMonitoringDataAllActive!: MonitoringRepository["getLatestMonitoringDataAllActive"];
  getLastHeartbeat!: MonitoringRepository["getLastHeartbeat"];
  getAggregatedMonitoringData!: MonitoringRepository["getAggregatedMonitoringData"];
  getLastStatusBefore!: MonitoringRepository["getLastStatusBefore"];
  getLastStatusBeforeAll!: MonitoringRepository["getLastStatusBeforeAll"];
  getDataGroupByDayAlternative!: MonitoringRepository["getDataGroupByDayAlternative"];
  getLastStatusBeforeCombined!: MonitoringRepository["getLastStatusBeforeCombined"];
  background!: MonitoringRepository["background"];
  consecutivelyStatusFor!: MonitoringRepository["consecutivelyStatusFor"];
  updateMonitoringData!: MonitoringRepository["updateMonitoringData"];
  deleteMonitorDataByTag!: MonitoringRepository["deleteMonitorDataByTag"];
  getStatusCountsByInterval!: MonitoringRepository["getStatusCountsByInterval"];

  // ============ Monitors ============
  getMonitorsByTags!: MonitorsRepository["getMonitorsByTags"];
  getMonitorsByTag!: MonitorsRepository["getMonitorsByTag"];
  insertMonitor!: MonitorsRepository["insertMonitor"];
  updateMonitor!: MonitorsRepository["updateMonitor"];
  updateMonitorTrigger!: MonitorsRepository["updateMonitorTrigger"];
  getMonitors!: MonitorsRepository["getMonitors"];
  getMonitorByTag!: MonitorsRepository["getMonitorByTag"];
  deleteMonitorsByTag!: MonitorsRepository["deleteMonitorsByTag"];

  // ============ Alerts ============
  insertAlert!: AlertsRepository["insertAlert"];
  alertExistsIncident!: AlertsRepository["alertExistsIncident"];
  alertExists!: AlertsRepository["alertExists"];
  getActiveAlertIncident!: AlertsRepository["getActiveAlertIncident"];
  getAllActiveAlertIncidents!: AlertsRepository["getAllActiveAlertIncidents"];
  getActiveAlert!: AlertsRepository["getActiveAlert"];
  getMonitorAlertsPaginated!: AlertsRepository["getMonitorAlertsPaginated"];
  getMonitorAlertsCount!: AlertsRepository["getMonitorAlertsCount"];
  updateAlertStatus!: AlertsRepository["updateAlertStatus"];
  incrementAlertHealthChecks!: AlertsRepository["incrementAlertHealthChecks"];
  addIncidentNumberToAlert!: AlertsRepository["addIncidentNumberToAlert"];
  deleteMonitorAlertsByTag!: AlertsRepository["deleteMonitorAlertsByTag"];

  // ============ Triggers ============
  createNewTrigger!: AlertsRepository["createNewTrigger"];
  updateTrigger!: AlertsRepository["updateTrigger"];
  getTriggers!: AlertsRepository["getTriggers"];
  getTriggerByID!: AlertsRepository["getTriggerByID"];

  // ============ Users ============
  getUsersCount!: UsersRepository["getUsersCount"];
  getUserByEmail!: UsersRepository["getUserByEmail"];
  getUserPasswordHashById!: UsersRepository["getUserPasswordHashById"];
  getUserById!: UsersRepository["getUserById"];
  insertUser!: UsersRepository["insertUser"];
  updateUserPassword!: UsersRepository["updateUserPassword"];
  getAllUsers!: UsersRepository["getAllUsers"];
  getUsersPaginated!: UsersRepository["getUsersPaginated"];
  getTotalUsers!: UsersRepository["getTotalUsers"];
  updateUserName!: UsersRepository["updateUserName"];
  updateUserRole!: UsersRepository["updateUserRole"];
  updateUserIsActive!: UsersRepository["updateUserIsActive"];
  updateUserPasswordById!: UsersRepository["updateUserPasswordById"];
  updateIsVerified!: UsersRepository["updateIsVerified"];

  // ============ API Keys ============
  createNewApiKey!: UsersRepository["createNewApiKey"];
  updateApiKeyStatus!: UsersRepository["updateApiKeyStatus"];
  getApiKeyByHashedKey!: UsersRepository["getApiKeyByHashedKey"];
  getAllApiKeys!: UsersRepository["getAllApiKeys"];

  // ============ Invitations ============
  insertInvitation!: UsersRepository["insertInvitation"];
  updateInvitationStatusToVoid!: UsersRepository["updateInvitationStatusToVoid"];
  invitationExists!: UsersRepository["invitationExists"];
  updateInvitationStatusToAccepted!: UsersRepository["updateInvitationStatusToAccepted"];
  getActiveInvitationByToken!: UsersRepository["getActiveInvitationByToken"];

  // ============ Site Data ============
  insertOrUpdateSiteData!: SiteDataRepository["insertOrUpdateSiteData"];
  getAllSiteData!: SiteDataRepository["getAllSiteData"];
  getSiteData!: SiteDataRepository["getSiteData"];
  getSiteDataByKey!: SiteDataRepository["getSiteDataByKey"];
  getAllSiteDataAnalytics!: SiteDataRepository["getAllSiteDataAnalytics"];

  // ============ Incidents ============
  getIncidentsPaginated!: IncidentsRepository["getIncidentsPaginated"];
  createIncident!: IncidentsRepository["createIncident"];
  getIncidentsPaginatedDesc!: IncidentsRepository["getIncidentsPaginatedDesc"];
  getRecentUpdatedIncidents!: IncidentsRepository["getRecentUpdatedIncidents"];
  getPreviousIncidentId!: IncidentsRepository["getPreviousIncidentId"];
  getIncidentsBetween!: IncidentsRepository["getIncidentsBetween"];
  getIncidentsCount!: IncidentsRepository["getIncidentsCount"];
  getIncidentsCountByTypeAndDateRange!: IncidentsRepository["getIncidentsCountByTypeAndDateRange"];
  updateIncident!: IncidentsRepository["updateIncident"];
  setIncidentEndTimeToNull!: IncidentsRepository["setIncidentEndTimeToNull"];
  getIncidentById!: IncidentsRepository["getIncidentById"];
  getIncidentsByIds!: IncidentsRepository["getIncidentsByIds"];
  getIncidentsByMonitorTag!: IncidentsRepository["getIncidentsByMonitorTag"];
  getIncidentsByMonitorTagRealtime!: IncidentsRepository["getIncidentsByMonitorTagRealtime"];
  getMaintenanceByMonitorTagRealtime!: IncidentsRepository["getMaintenanceByMonitorTagRealtime"];
  getOngoingMaintenances!: IncidentsRepository["getOngoingMaintenances"];
  getUpcomingMaintenances!: IncidentsRepository["getUpcomingMaintenances"];
  getLastMaintenance!: IncidentsRepository["getLastMaintenance"];
  getOngoingIncidents!: IncidentsRepository["getOngoingIncidents"];
  getLastIncident!: IncidentsRepository["getLastIncident"];
  getOngoingMaintenancesByMonitorTags!: IncidentsRepository["getOngoingMaintenancesByMonitorTags"];
  getUpcomingMaintenancesByMonitorTags!: IncidentsRepository["getUpcomingMaintenancesByMonitorTags"];
  getLastMaintenanceByMonitorTags!: IncidentsRepository["getLastMaintenanceByMonitorTags"];
  getOngoingIncidentsByMonitorTags!: IncidentsRepository["getOngoingIncidentsByMonitorTags"];
  getOngoingIncidentsForMonitorList!: IncidentsRepository["getOngoingIncidentsForMonitorList"];
  getResolvedIncidentsForMonitorList!: IncidentsRepository["getResolvedIncidentsForMonitorList"];
  getIncidentsForEventsByDateRange!: IncidentsRepository["getIncidentsForEventsByDateRange"];
  getIncidentsForEventsByDateRangeMonitor!: IncidentsRepository["getIncidentsForEventsByDateRangeMonitor"];
  getLastIncidentByMonitorTags!: IncidentsRepository["getLastIncidentByMonitorTags"];
  getIncidentsCountByTypeAndDateRangeAndMonitorTags!: IncidentsRepository["getIncidentsCountByTypeAndDateRangeAndMonitorTags"];

  // ============ Incident Monitors ============
  insertIncidentMonitor!: IncidentsRepository["insertIncidentMonitor"];
  getIncidentMonitorsByIncidentID!: IncidentsRepository["getIncidentMonitorsByIncidentID"];
  removeIncidentMonitor!: IncidentsRepository["removeIncidentMonitor"];
  insertIncidentMonitorWithMerge!: IncidentsRepository["insertIncidentMonitorWithMerge"];
  deleteIncidentMonitorsByTag!: IncidentsRepository["deleteIncidentMonitorsByTag"];

  // ============ Incident Comments ============
  insertIncidentComment!: IncidentsRepository["insertIncidentComment"];
  getIncidentComments!: IncidentsRepository["getIncidentComments"];
  getActiveIncidentComments!: IncidentsRepository["getActiveIncidentComments"];
  getIncidentCommentByIDAndIncident!: IncidentsRepository["getIncidentCommentByIDAndIncident"];
  updateIncidentCommentByID!: IncidentsRepository["updateIncidentCommentByID"];
  updateIncidentCommentStatusByID!: IncidentsRepository["updateIncidentCommentStatusByID"];
  getIncidentCommentByID!: IncidentsRepository["getIncidentCommentByID"];

  // ============ Subscribers ============
  insertSubscriber!: SubscribersRepository["insertSubscriber"];
  updateSubscriberMeta!: SubscribersRepository["updateSubscriberMeta"];
  updateSubscriberStatus!: SubscribersRepository["updateSubscriberStatus"];
  deleteSubscriberById!: SubscribersRepository["deleteSubscriberById"];
  getAllActiveSubscribers!: SubscribersRepository["getAllActiveSubscribers"];
  getSubscriberByDetails!: SubscribersRepository["getSubscriberByDetails"];
  getSubscribersByType!: SubscribersRepository["getSubscribersByType"];
  getSubscriberById!: SubscribersRepository["getSubscriberById"];
  getSubscribersPaginated!: SubscribersRepository["getSubscribersPaginated"];
  getSubscribersCount!: SubscribersRepository["getSubscribersCount"];

  // ============ Subscriptions ============
  insertSubscription!: SubscribersRepository["insertSubscription"];
  removeAllDataFromSubscriptions!: SubscribersRepository["removeAllDataFromSubscriptions"];
  getSubscriptionsBySubscriberId!: SubscribersRepository["getSubscriptionsBySubscriberId"];
  updateSubscriptionStatus!: SubscribersRepository["updateSubscriptionStatus"];
  getSubscriptionsForMonitor!: SubscribersRepository["getSubscriptionsForMonitor"];
  getSubscriptionsPaginated!: SubscribersRepository["getSubscriptionsPaginated"];
  getTotalSubscriptionCount!: SubscribersRepository["getTotalSubscriptionCount"];
  getSubscriberEmails!: SubscribersRepository["getSubscriberEmails"];

  // ============ Subscription Triggers ============
  insertSubscriptionTrigger!: SubscribersRepository["insertSubscriptionTrigger"];
  getSubscriptionTriggerById!: SubscribersRepository["getSubscriptionTriggerById"];
  getAllSubscriptionTriggers!: SubscribersRepository["getAllSubscriptionTriggers"];
  getSubscriptionTriggerByType!: SubscribersRepository["getSubscriptionTriggerByType"];
  updateSubscriptionTrigger!: SubscribersRepository["updateSubscriptionTrigger"];
  updateSubscriptionTriggerStatus!: SubscribersRepository["updateSubscriptionTriggerStatus"];
  deleteSubscriptionTriggerByType!: SubscribersRepository["deleteSubscriptionTriggerByType"];
  deleteSubscriptionTriggerById!: SubscribersRepository["deleteSubscriptionTriggerById"];

  // ============ Images ============
  insertImage!: ImagesRepository["insertImage"];
  getImageById!: ImagesRepository["getImageById"];
  deleteImage!: ImagesRepository["deleteImage"];
  getAllImages!: ImagesRepository["getAllImages"];

  // ============ Pages ============
  createPage!: PagesRepository["createPage"];
  getPageById!: PagesRepository["getPageById"];
  getPageByPath!: PagesRepository["getPageByPath"];
  getAllPages!: PagesRepository["getAllPages"];
  updatePage!: PagesRepository["updatePage"];
  deletePage!: PagesRepository["deletePage"];

  // ============ Page Monitors ============
  addMonitorToPage!: PagesRepository["addMonitorToPage"];
  removeMonitorFromPage!: PagesRepository["removeMonitorFromPage"];
  getPageMonitors!: PagesRepository["getPageMonitors"];
  getPageMonitorsExcludeHidden!: PagesRepository["getPageMonitorsExcludeHidden"];
  getPagesByMonitorTag!: PagesRepository["getPagesByMonitorTag"];
  updatePageMonitorSettings!: PagesRepository["updatePageMonitorSettings"];
  monitorExistsOnPage!: PagesRepository["monitorExistsOnPage"];
  deletePageMonitorsByTag!: PagesRepository["deletePageMonitorsByTag"];

  // ============ Maintenances ============
  createMaintenance!: MaintenancesRepository["createMaintenance"];
  getMaintenanceById!: MaintenancesRepository["getMaintenanceById"];
  getAllMaintenances!: MaintenancesRepository["getAllMaintenances"];
  getMaintenancesPaginated!: MaintenancesRepository["getMaintenancesPaginated"];
  getMaintenancesCount!: MaintenancesRepository["getMaintenancesCount"];
  updateMaintenance!: MaintenancesRepository["updateMaintenance"];
  deleteMaintenance!: MaintenancesRepository["deleteMaintenance"];

  // ============ Maintenance Monitors ============
  addMonitorToMaintenance!: MaintenancesRepository["addMonitorToMaintenance"];
  addMonitorsToMaintenance!: MaintenancesRepository["addMonitorsToMaintenance"];
  addMonitorsToMaintenanceWithStatus!: MaintenancesRepository["addMonitorsToMaintenanceWithStatus"];
  removeMonitorFromMaintenance!: MaintenancesRepository["removeMonitorFromMaintenance"];
  removeAllMonitorsFromMaintenance!: MaintenancesRepository["removeAllMonitorsFromMaintenance"];
  getMaintenanceMonitors!: MaintenancesRepository["getMaintenanceMonitors"];
  getMaintenancesForMonitor!: MaintenancesRepository["getMaintenancesForMonitor"];
  deleteMaintenanceMonitorsByTag!: MaintenancesRepository["deleteMaintenanceMonitorsByTag"];
  updateMonitorImpactInMaintenanceMonitors!: MaintenancesRepository["updateMonitorImpactInMaintenanceMonitors"];

  // ============ Maintenance Events ============
  createMaintenanceEvent!: MaintenancesRepository["createMaintenanceEvent"];
  getMaintenanceEventById!: MaintenancesRepository["getMaintenanceEventById"];
  getMaintenanceEventsByMaintenanceId!: MaintenancesRepository["getMaintenanceEventsByMaintenanceId"];
  getMaintenanceEventsByMaintenanceIdWithLimits!: MaintenancesRepository["getMaintenanceEventsByMaintenanceIdWithLimits"];
  getMaintenanceEvents!: MaintenancesRepository["getMaintenanceEvents"];
  getActiveMaintenanceEvents!: MaintenancesRepository["getActiveMaintenanceEvents"];
  getMaintenanceEventsForMonitor!: MaintenancesRepository["getMaintenanceEventsForMonitor"];
  updateMaintenanceEvent!: MaintenancesRepository["updateMaintenanceEvent"];
  updateMaintenanceEventStatus!: MaintenancesRepository["updateMaintenanceEventStatus"];
  deleteMaintenanceEvent!: MaintenancesRepository["deleteMaintenanceEvent"];
  getOngoingMaintenanceEventsByMonitorTags!: MaintenancesRepository["getOngoingMaintenanceEventsByMonitorTags"];
  getUpcomingMaintenanceEventsByMonitorTags!: MaintenancesRepository["getUpcomingMaintenanceEventsByMonitorTags"];

  // ============ Maintenance Events for Monitor List ============
  getOngoingMaintenanceEventsForMonitorList!: MaintenancesRepository["getOngoingMaintenanceEventsForMonitorList"];
  getPastMaintenanceEventsForMonitorList!: MaintenancesRepository["getPastMaintenanceEventsForMonitorList"];
  getUpcomingMaintenanceEventsForMonitorList!: MaintenancesRepository["getUpcomingMaintenanceEventsForMonitorList"];
  getMaintenanceEventsForEventsByDateRange!: MaintenancesRepository["getMaintenanceEventsForEventsByDateRange"];
  getMaintenanceEventsForEventsByDateRangeMonitor!: MaintenancesRepository["getMaintenanceEventsForEventsByDateRangeMonitor"];

  // ============ Monitor Alert Config ============
  insertMonitorAlertConfig!: MonitorAlertConfigRepository["insertMonitorAlertConfig"];
  updateMonitorAlertConfig!: MonitorAlertConfigRepository["updateMonitorAlertConfig"];
  getMonitorAlertConfigById!: MonitorAlertConfigRepository["getMonitorAlertConfigById"];
  getMonitorAlertConfigs!: MonitorAlertConfigRepository["getMonitorAlertConfigs"];
  getMonitorAlertConfigsByMonitorTag!: MonitorAlertConfigRepository["getMonitorAlertConfigsByMonitorTag"];
  getActiveMonitorAlertConfigs!: MonitorAlertConfigRepository["getActiveMonitorAlertConfigs"];
  getActiveMonitorAlertConfigsByMonitorTag!: MonitorAlertConfigRepository["getActiveMonitorAlertConfigsByMonitorTag"];
  deleteMonitorAlertConfig!: MonitorAlertConfigRepository["deleteMonitorAlertConfig"];
  deleteMonitorAlertConfigsByMonitorTag!: MonitorAlertConfigRepository["deleteMonitorAlertConfigsByMonitorTag"];
  getMonitorAlertConfigsCount!: MonitorAlertConfigRepository["getMonitorAlertConfigsCount"];

  // ============ Monitor Alert Config Triggers ============
  addTriggerToMonitorAlertConfig!: MonitorAlertConfigRepository["addTriggerToMonitorAlertConfig"];
  addTriggersToMonitorAlertConfig!: MonitorAlertConfigRepository["addTriggersToMonitorAlertConfig"];
  removeTriggerFromMonitorAlertConfig!: MonitorAlertConfigRepository["removeTriggerFromMonitorAlertConfig"];
  removeAllTriggersFromMonitorAlertConfig!: MonitorAlertConfigRepository["removeAllTriggersFromMonitorAlertConfig"];
  getMonitorAlertConfigTriggers!: MonitorAlertConfigRepository["getMonitorAlertConfigTriggers"];
  getMonitorAlertConfigTriggerIds!: MonitorAlertConfigRepository["getMonitorAlertConfigTriggerIds"];
  replaceMonitorAlertConfigTriggers!: MonitorAlertConfigRepository["replaceMonitorAlertConfigTriggers"];
  getMonitorAlertConfigWithTriggers!: MonitorAlertConfigRepository["getMonitorAlertConfigWithTriggers"];
  getMonitorAlertConfigsWithTriggersByMonitorTag!: MonitorAlertConfigRepository["getMonitorAlertConfigsWithTriggersByMonitorTag"];
  getActiveMonitorAlertConfigsWithTriggers!: MonitorAlertConfigRepository["getActiveMonitorAlertConfigsWithTriggers"];
  isTriggerUsedInMonitorAlertConfig!: MonitorAlertConfigRepository["isTriggerUsedInMonitorAlertConfig"];
  getMonitorAlertConfigsByTriggerId!: MonitorAlertConfigRepository["getMonitorAlertConfigsByTriggerId"];

  // ============ Monitor Alerts V2 ============
  insertMonitorAlertV2!: MonitorAlertConfigRepository["insertMonitorAlertV2"];
  updateMonitorAlertV2!: MonitorAlertConfigRepository["updateMonitorAlertV2"];
  updateMonitorAlertV2Status!: MonitorAlertConfigRepository["updateMonitorAlertV2Status"];
  getMonitorAlertV2ById!: MonitorAlertConfigRepository["getMonitorAlertV2ById"];
  getMonitorAlertsV2!: MonitorAlertConfigRepository["getMonitorAlertsV2"];
  getMonitorAlertsV2ByConfigId!: MonitorAlertConfigRepository["getMonitorAlertsV2ByConfigId"];
  hasTriggeredAlertForConfig!: MonitorAlertConfigRepository["hasTriggeredAlertForConfig"];
  getActiveAlertForConfig!: MonitorAlertConfigRepository["getActiveAlertForConfig"];
  getAllTriggeredAlerts!: MonitorAlertConfigRepository["getAllTriggeredAlerts"];
  deleteMonitorAlertV2!: MonitorAlertConfigRepository["deleteMonitorAlertV2"];
  deleteMonitorAlertsV2ByConfigId!: MonitorAlertConfigRepository["deleteMonitorAlertsV2ByConfigId"];
  getMonitorAlertV2WithConfig!: MonitorAlertConfigRepository["getMonitorAlertV2WithConfig"];
  getAllTriggeredAlertsWithConfig!: MonitorAlertConfigRepository["getAllTriggeredAlertsWithConfig"];
  addIncidentToAlert!: MonitorAlertConfigRepository["addIncidentToAlert"];
  getAlertsByIncidentId!: MonitorAlertConfigRepository["getAlertsByIncidentId"];
  getMonitorAlertsV2Count!: MonitorAlertConfigRepository["getMonitorAlertsV2Count"];

  constructor(opts: KnexType.Config) {
    this.knex = Knex(opts);

    // Initialize repositories
    this.monitoring = new MonitoringRepository(this.knex);
    this.monitors = new MonitorsRepository(this.knex);
    this.alerts = new AlertsRepository(this.knex);
    this.users = new UsersRepository(this.knex);
    this.siteData = new SiteDataRepository(this.knex);
    this.incidents = new IncidentsRepository(this.knex);
    this.subscribers = new SubscribersRepository(this.knex);
    this.images = new ImagesRepository(this.knex);
    this.pages = new PagesRepository(this.knex);
    this.maintenances = new MaintenancesRepository(this.knex);
    this.monitorAlertConfig = new MonitorAlertConfigRepository(this.knex);

    // Bind methods after repositories are initialized
    this.bindMonitoringMethods();
    this.bindMonitorsMethods();
    this.bindAlertsMethods();
    this.bindUsersMethods();
    this.bindSiteDataMethods();
    this.bindIncidentsMethods();
    this.bindSubscribersMethods();
    this.bindImagesMethods();
    this.bindPagesMethods();
    this.bindMaintenancesMethods();
    this.bindMonitorAlertConfigMethods();

    this.init();
  }

  private bindMonitoringMethods(): void {
    this.insertMonitoringData = this.monitoring.insertMonitoringData.bind(this.monitoring);
    this.getMonitoringData = this.monitoring.getMonitoringData.bind(this.monitoring);
    this.getMonitoringDataAll = this.monitoring.getMonitoringDataAll.bind(this.monitoring);
    this.getLatestMonitoringData = this.monitoring.getLatestMonitoringData.bind(this.monitoring);
    this.getLatestMonitoringDataN = this.monitoring.getLatestMonitoringDataN.bind(this.monitoring);
    this.getMonitoringDataAt = this.monitoring.getMonitoringDataAt.bind(this.monitoring);
    this.getLatestMonitoringDataAllActive = this.monitoring.getLatestMonitoringDataAllActive.bind(this.monitoring);
    this.getLastHeartbeat = this.monitoring.getLastHeartbeat.bind(this.monitoring);
    this.getAggregatedMonitoringData = this.monitoring.getAggregatedMonitoringData.bind(this.monitoring);
    this.getLastStatusBefore = this.monitoring.getLastStatusBefore.bind(this.monitoring);
    this.getLastStatusBeforeAll = this.monitoring.getLastStatusBeforeAll.bind(this.monitoring);
    this.getDataGroupByDayAlternative = this.monitoring.getDataGroupByDayAlternative.bind(this.monitoring);
    this.getLastStatusBeforeCombined = this.monitoring.getLastStatusBeforeCombined.bind(this.monitoring);
    this.background = this.monitoring.background.bind(this.monitoring);
    this.consecutivelyStatusFor = this.monitoring.consecutivelyStatusFor.bind(this.monitoring);
    this.updateMonitoringData = this.monitoring.updateMonitoringData.bind(this.monitoring);
    this.deleteMonitorDataByTag = this.monitoring.deleteMonitorDataByTag.bind(this.monitoring);
    this.getStatusCountsByInterval = this.monitoring.getStatusCountsByInterval.bind(this.monitoring);
  }

  private bindMonitorsMethods(): void {
    this.getMonitorsByTags = this.monitors.getMonitorsByTags.bind(this.monitors);
    this.getMonitorsByTag = this.monitors.getMonitorsByTag.bind(this.monitors);
    this.insertMonitor = this.monitors.insertMonitor.bind(this.monitors);
    this.updateMonitor = this.monitors.updateMonitor.bind(this.monitors);
    this.updateMonitorTrigger = this.monitors.updateMonitorTrigger.bind(this.monitors);
    this.getMonitors = this.monitors.getMonitors.bind(this.monitors);
    this.getMonitorByTag = this.monitors.getMonitorByTag.bind(this.monitors);
    this.deleteMonitorsByTag = this.monitors.deleteMonitorsByTag.bind(this.monitors);
  }

  private bindAlertsMethods(): void {
    this.insertAlert = this.alerts.insertAlert.bind(this.alerts);
    this.alertExistsIncident = this.alerts.alertExistsIncident.bind(this.alerts);
    this.alertExists = this.alerts.alertExists.bind(this.alerts);
    this.getActiveAlertIncident = this.alerts.getActiveAlertIncident.bind(this.alerts);
    this.getAllActiveAlertIncidents = this.alerts.getAllActiveAlertIncidents.bind(this.alerts);
    this.getActiveAlert = this.alerts.getActiveAlert.bind(this.alerts);
    this.getMonitorAlertsPaginated = this.alerts.getMonitorAlertsPaginated.bind(this.alerts);
    this.getMonitorAlertsCount = this.alerts.getMonitorAlertsCount.bind(this.alerts);
    this.updateAlertStatus = this.alerts.updateAlertStatus.bind(this.alerts);
    this.incrementAlertHealthChecks = this.alerts.incrementAlertHealthChecks.bind(this.alerts);
    this.addIncidentNumberToAlert = this.alerts.addIncidentNumberToAlert.bind(this.alerts);
    this.deleteMonitorAlertsByTag = this.alerts.deleteMonitorAlertsByTag.bind(this.alerts);
    this.createNewTrigger = this.alerts.createNewTrigger.bind(this.alerts);
    this.updateTrigger = this.alerts.updateTrigger.bind(this.alerts);
    this.getTriggers = this.alerts.getTriggers.bind(this.alerts);
    this.getTriggerByID = this.alerts.getTriggerByID.bind(this.alerts);
  }

  private bindUsersMethods(): void {
    this.getUsersCount = this.users.getUsersCount.bind(this.users);
    this.getUserByEmail = this.users.getUserByEmail.bind(this.users);
    this.getUserPasswordHashById = this.users.getUserPasswordHashById.bind(this.users);
    this.getUserById = this.users.getUserById.bind(this.users);
    this.insertUser = this.users.insertUser.bind(this.users);
    this.updateUserPassword = this.users.updateUserPassword.bind(this.users);
    this.getAllUsers = this.users.getAllUsers.bind(this.users);
    this.getUsersPaginated = this.users.getUsersPaginated.bind(this.users);
    this.getTotalUsers = this.users.getTotalUsers.bind(this.users);
    this.updateUserName = this.users.updateUserName.bind(this.users);
    this.updateUserRole = this.users.updateUserRole.bind(this.users);
    this.updateUserIsActive = this.users.updateUserIsActive.bind(this.users);
    this.updateUserPasswordById = this.users.updateUserPasswordById.bind(this.users);
    this.updateIsVerified = this.users.updateIsVerified.bind(this.users);
    this.createNewApiKey = this.users.createNewApiKey.bind(this.users);
    this.updateApiKeyStatus = this.users.updateApiKeyStatus.bind(this.users);
    this.getApiKeyByHashedKey = this.users.getApiKeyByHashedKey.bind(this.users);
    this.getAllApiKeys = this.users.getAllApiKeys.bind(this.users);
    this.insertInvitation = this.users.insertInvitation.bind(this.users);
    this.updateInvitationStatusToVoid = this.users.updateInvitationStatusToVoid.bind(this.users);
    this.invitationExists = this.users.invitationExists.bind(this.users);
    this.updateInvitationStatusToAccepted = this.users.updateInvitationStatusToAccepted.bind(this.users);
    this.getActiveInvitationByToken = this.users.getActiveInvitationByToken.bind(this.users);
  }

  private bindSiteDataMethods(): void {
    this.insertOrUpdateSiteData = this.siteData.insertOrUpdateSiteData.bind(this.siteData);
    this.getAllSiteData = this.siteData.getAllSiteData.bind(this.siteData);
    this.getSiteData = this.siteData.getSiteData.bind(this.siteData);
    this.getSiteDataByKey = this.siteData.getSiteDataByKey.bind(this.siteData);
    this.getAllSiteDataAnalytics = this.siteData.getAllSiteDataAnalytics.bind(this.siteData);
  }

  private bindIncidentsMethods(): void {
    this.getIncidentsPaginated = this.incidents.getIncidentsPaginated.bind(this.incidents);
    this.createIncident = this.incidents.createIncident.bind(this.incidents);
    this.getIncidentsPaginatedDesc = this.incidents.getIncidentsPaginatedDesc.bind(this.incidents);
    this.getRecentUpdatedIncidents = this.incidents.getRecentUpdatedIncidents.bind(this.incidents);
    this.getPreviousIncidentId = this.incidents.getPreviousIncidentId.bind(this.incidents);
    this.getIncidentsBetween = this.incidents.getIncidentsBetween.bind(this.incidents);
    this.getIncidentsCount = this.incidents.getIncidentsCount.bind(this.incidents);
    this.getIncidentsCountByTypeAndDateRange = this.incidents.getIncidentsCountByTypeAndDateRange.bind(this.incidents);
    this.updateIncident = this.incidents.updateIncident.bind(this.incidents);
    this.setIncidentEndTimeToNull = this.incidents.setIncidentEndTimeToNull.bind(this.incidents);
    this.getIncidentById = this.incidents.getIncidentById.bind(this.incidents);
    this.getIncidentsByIds = this.incidents.getIncidentsByIds.bind(this.incidents);
    this.getIncidentsByMonitorTag = this.incidents.getIncidentsByMonitorTag.bind(this.incidents);
    this.getIncidentsByMonitorTagRealtime = this.incidents.getIncidentsByMonitorTagRealtime.bind(this.incidents);
    this.getMaintenanceByMonitorTagRealtime = this.incidents.getMaintenanceByMonitorTagRealtime.bind(this.incidents);
    this.getOngoingMaintenances = this.incidents.getOngoingMaintenances.bind(this.incidents);
    this.getUpcomingMaintenances = this.incidents.getUpcomingMaintenances.bind(this.incidents);
    this.getLastMaintenance = this.incidents.getLastMaintenance.bind(this.incidents);
    this.getOngoingIncidents = this.incidents.getOngoingIncidents.bind(this.incidents);
    this.getLastIncident = this.incidents.getLastIncident.bind(this.incidents);
    this.getOngoingMaintenancesByMonitorTags = this.incidents.getOngoingMaintenancesByMonitorTags.bind(this.incidents);
    this.getUpcomingMaintenancesByMonitorTags = this.incidents.getUpcomingMaintenancesByMonitorTags.bind(
      this.incidents,
    );
    this.getLastMaintenanceByMonitorTags = this.incidents.getLastMaintenanceByMonitorTags.bind(this.incidents);
    this.getOngoingIncidentsByMonitorTags = this.incidents.getOngoingIncidentsByMonitorTags.bind(this.incidents);
    this.getOngoingIncidentsForMonitorList = this.incidents.getOngoingIncidentsForMonitorList.bind(this.incidents);
    this.getResolvedIncidentsForMonitorList = this.incidents.getResolvedIncidentsForMonitorList.bind(this.incidents);
    this.getIncidentsForEventsByDateRange = this.incidents.getIncidentsForEventsByDateRange.bind(this.incidents);
    this.getIncidentsForEventsByDateRangeMonitor = this.incidents.getIncidentsForEventsByDateRangeMonitor.bind(
      this.incidents,
    );
    this.getLastIncidentByMonitorTags = this.incidents.getLastIncidentByMonitorTags.bind(this.incidents);
    this.getIncidentsCountByTypeAndDateRangeAndMonitorTags =
      this.incidents.getIncidentsCountByTypeAndDateRangeAndMonitorTags.bind(this.incidents);
    this.insertIncidentMonitor = this.incidents.insertIncidentMonitor.bind(this.incidents);
    this.getIncidentMonitorsByIncidentID = this.incidents.getIncidentMonitorsByIncidentID.bind(this.incidents);
    this.removeIncidentMonitor = this.incidents.removeIncidentMonitor.bind(this.incidents);
    this.insertIncidentMonitorWithMerge = this.incidents.insertIncidentMonitorWithMerge.bind(this.incidents);
    this.deleteIncidentMonitorsByTag = this.incidents.deleteIncidentMonitorsByTag.bind(this.incidents);
    this.insertIncidentComment = this.incidents.insertIncidentComment.bind(this.incidents);
    this.getIncidentComments = this.incidents.getIncidentComments.bind(this.incidents);
    this.getActiveIncidentComments = this.incidents.getActiveIncidentComments.bind(this.incidents);
    this.getIncidentCommentByIDAndIncident = this.incidents.getIncidentCommentByIDAndIncident.bind(this.incidents);
    this.updateIncidentCommentByID = this.incidents.updateIncidentCommentByID.bind(this.incidents);
    this.updateIncidentCommentStatusByID = this.incidents.updateIncidentCommentStatusByID.bind(this.incidents);
    this.getIncidentCommentByID = this.incidents.getIncidentCommentByID.bind(this.incidents);
  }

  private bindSubscribersMethods(): void {
    this.insertSubscriber = this.subscribers.insertSubscriber.bind(this.subscribers);
    this.updateSubscriberMeta = this.subscribers.updateSubscriberMeta.bind(this.subscribers);
    this.updateSubscriberStatus = this.subscribers.updateSubscriberStatus.bind(this.subscribers);
    this.deleteSubscriberById = this.subscribers.deleteSubscriberById.bind(this.subscribers);
    this.getAllActiveSubscribers = this.subscribers.getAllActiveSubscribers.bind(this.subscribers);
    this.getSubscriberByDetails = this.subscribers.getSubscriberByDetails.bind(this.subscribers);
    this.getSubscribersByType = this.subscribers.getSubscribersByType.bind(this.subscribers);
    this.getSubscriberById = this.subscribers.getSubscriberById.bind(this.subscribers);
    this.getSubscribersPaginated = this.subscribers.getSubscribersPaginated.bind(this.subscribers);
    this.getSubscribersCount = this.subscribers.getSubscribersCount.bind(this.subscribers);
    this.insertSubscription = this.subscribers.insertSubscription.bind(this.subscribers);
    this.removeAllDataFromSubscriptions = this.subscribers.removeAllDataFromSubscriptions.bind(this.subscribers);
    this.getSubscriptionsBySubscriberId = this.subscribers.getSubscriptionsBySubscriberId.bind(this.subscribers);
    this.updateSubscriptionStatus = this.subscribers.updateSubscriptionStatus.bind(this.subscribers);
    this.getSubscriptionsForMonitor = this.subscribers.getSubscriptionsForMonitor.bind(this.subscribers);
    this.getSubscriptionsPaginated = this.subscribers.getSubscriptionsPaginated.bind(this.subscribers);
    this.getTotalSubscriptionCount = this.subscribers.getTotalSubscriptionCount.bind(this.subscribers);
    this.getSubscriberEmails = this.subscribers.getSubscriberEmails.bind(this.subscribers);
    this.insertSubscriptionTrigger = this.subscribers.insertSubscriptionTrigger.bind(this.subscribers);
    this.getSubscriptionTriggerById = this.subscribers.getSubscriptionTriggerById.bind(this.subscribers);
    this.getAllSubscriptionTriggers = this.subscribers.getAllSubscriptionTriggers.bind(this.subscribers);
    this.getSubscriptionTriggerByType = this.subscribers.getSubscriptionTriggerByType.bind(this.subscribers);
    this.updateSubscriptionTrigger = this.subscribers.updateSubscriptionTrigger.bind(this.subscribers);
    this.updateSubscriptionTriggerStatus = this.subscribers.updateSubscriptionTriggerStatus.bind(this.subscribers);
    this.deleteSubscriptionTriggerByType = this.subscribers.deleteSubscriptionTriggerByType.bind(this.subscribers);
    this.deleteSubscriptionTriggerById = this.subscribers.deleteSubscriptionTriggerById.bind(this.subscribers);
  }

  private bindImagesMethods(): void {
    this.insertImage = this.images.insertImage.bind(this.images);
    this.getImageById = this.images.getImageById.bind(this.images);
    this.deleteImage = this.images.deleteImage.bind(this.images);
    this.getAllImages = this.images.getAllImages.bind(this.images);
  }

  private bindPagesMethods(): void {
    this.createPage = this.pages.createPage.bind(this.pages);
    this.getPageById = this.pages.getPageById.bind(this.pages);
    this.getPageByPath = this.pages.getPageByPath.bind(this.pages);
    this.getAllPages = this.pages.getAllPages.bind(this.pages);
    this.updatePage = this.pages.updatePage.bind(this.pages);
    this.deletePage = this.pages.deletePage.bind(this.pages);
    this.addMonitorToPage = this.pages.addMonitorToPage.bind(this.pages);
    this.removeMonitorFromPage = this.pages.removeMonitorFromPage.bind(this.pages);
    this.getPageMonitors = this.pages.getPageMonitors.bind(this.pages);
    this.getPageMonitorsExcludeHidden = this.pages.getPageMonitorsExcludeHidden.bind(this.pages);
    this.getPagesByMonitorTag = this.pages.getPagesByMonitorTag.bind(this.pages);
    this.updatePageMonitorSettings = this.pages.updatePageMonitorSettings.bind(this.pages);
    this.monitorExistsOnPage = this.pages.monitorExistsOnPage.bind(this.pages);
    this.deletePageMonitorsByTag = this.pages.deletePageMonitorsByTag.bind(this.pages);
  }

  private bindMaintenancesMethods(): void {
    this.createMaintenance = this.maintenances.createMaintenance.bind(this.maintenances);
    this.getMaintenanceById = this.maintenances.getMaintenanceById.bind(this.maintenances);
    this.getAllMaintenances = this.maintenances.getAllMaintenances.bind(this.maintenances);
    this.getMaintenancesPaginated = this.maintenances.getMaintenancesPaginated.bind(this.maintenances);
    this.getMaintenancesCount = this.maintenances.getMaintenancesCount.bind(this.maintenances);
    this.updateMaintenance = this.maintenances.updateMaintenance.bind(this.maintenances);
    this.deleteMaintenance = this.maintenances.deleteMaintenance.bind(this.maintenances);
    this.addMonitorToMaintenance = this.maintenances.addMonitorToMaintenance.bind(this.maintenances);
    this.addMonitorsToMaintenance = this.maintenances.addMonitorsToMaintenance.bind(this.maintenances);
    this.addMonitorsToMaintenanceWithStatus = this.maintenances.addMonitorsToMaintenanceWithStatus.bind(
      this.maintenances,
    );
    this.removeMonitorFromMaintenance = this.maintenances.removeMonitorFromMaintenance.bind(this.maintenances);
    this.removeAllMonitorsFromMaintenance = this.maintenances.removeAllMonitorsFromMaintenance.bind(this.maintenances);
    this.getMaintenanceMonitors = this.maintenances.getMaintenanceMonitors.bind(this.maintenances);
    this.getMaintenancesForMonitor = this.maintenances.getMaintenancesForMonitor.bind(this.maintenances);
    this.deleteMaintenanceMonitorsByTag = this.maintenances.deleteMaintenanceMonitorsByTag.bind(this.maintenances);
    this.updateMonitorImpactInMaintenanceMonitors = this.maintenances.updateMonitorImpactInMaintenanceMonitors.bind(
      this.maintenances,
    );
    this.createMaintenanceEvent = this.maintenances.createMaintenanceEvent.bind(this.maintenances);
    this.getMaintenanceEventById = this.maintenances.getMaintenanceEventById.bind(this.maintenances);
    this.getMaintenanceEventsByMaintenanceId = this.maintenances.getMaintenanceEventsByMaintenanceId.bind(
      this.maintenances,
    );
    this.getMaintenanceEventsByMaintenanceIdWithLimits =
      this.maintenances.getMaintenanceEventsByMaintenanceIdWithLimits.bind(this.maintenances);
    this.getMaintenanceEvents = this.maintenances.getMaintenanceEvents.bind(this.maintenances);
    this.getActiveMaintenanceEvents = this.maintenances.getActiveMaintenanceEvents.bind(this.maintenances);
    this.getMaintenanceEventsForMonitor = this.maintenances.getMaintenanceEventsForMonitor.bind(this.maintenances);
    this.updateMaintenanceEvent = this.maintenances.updateMaintenanceEvent.bind(this.maintenances);
    this.updateMaintenanceEventStatus = this.maintenances.updateMaintenanceEventStatus.bind(this.maintenances);
    this.deleteMaintenanceEvent = this.maintenances.deleteMaintenanceEvent.bind(this.maintenances);
    this.getOngoingMaintenanceEventsByMonitorTags = this.maintenances.getOngoingMaintenanceEventsByMonitorTags.bind(
      this.maintenances,
    );
    this.getUpcomingMaintenanceEventsByMonitorTags = this.maintenances.getUpcomingMaintenanceEventsByMonitorTags.bind(
      this.maintenances,
    );
    this.getOngoingMaintenanceEventsForMonitorList = this.maintenances.getOngoingMaintenanceEventsForMonitorList.bind(
      this.maintenances,
    );
    this.getPastMaintenanceEventsForMonitorList = this.maintenances.getPastMaintenanceEventsForMonitorList.bind(
      this.maintenances,
    );
    this.getUpcomingMaintenanceEventsForMonitorList = this.maintenances.getUpcomingMaintenanceEventsForMonitorList.bind(
      this.maintenances,
    );
    this.getMaintenanceEventsForEventsByDateRange = this.maintenances.getMaintenanceEventsForEventsByDateRange.bind(
      this.maintenances,
    );
    this.getMaintenanceEventsForEventsByDateRangeMonitor =
      this.maintenances.getMaintenanceEventsForEventsByDateRangeMonitor.bind(this.maintenances);
  }

  private bindMonitorAlertConfigMethods(): void {
    // Monitor Alert Config CRUD
    this.insertMonitorAlertConfig = this.monitorAlertConfig.insertMonitorAlertConfig.bind(this.monitorAlertConfig);
    this.updateMonitorAlertConfig = this.monitorAlertConfig.updateMonitorAlertConfig.bind(this.monitorAlertConfig);
    this.getMonitorAlertConfigById = this.monitorAlertConfig.getMonitorAlertConfigById.bind(this.monitorAlertConfig);
    this.getMonitorAlertConfigs = this.monitorAlertConfig.getMonitorAlertConfigs.bind(this.monitorAlertConfig);
    this.getMonitorAlertConfigsByMonitorTag = this.monitorAlertConfig.getMonitorAlertConfigsByMonitorTag.bind(
      this.monitorAlertConfig,
    );
    this.getActiveMonitorAlertConfigs = this.monitorAlertConfig.getActiveMonitorAlertConfigs.bind(
      this.monitorAlertConfig,
    );
    this.getActiveMonitorAlertConfigsByMonitorTag =
      this.monitorAlertConfig.getActiveMonitorAlertConfigsByMonitorTag.bind(this.monitorAlertConfig);
    this.deleteMonitorAlertConfig = this.monitorAlertConfig.deleteMonitorAlertConfig.bind(this.monitorAlertConfig);
    this.deleteMonitorAlertConfigsByMonitorTag = this.monitorAlertConfig.deleteMonitorAlertConfigsByMonitorTag.bind(
      this.monitorAlertConfig,
    );
    this.getMonitorAlertConfigsCount = this.monitorAlertConfig.getMonitorAlertConfigsCount.bind(
      this.monitorAlertConfig,
    );

    // Monitor Alert Config Triggers
    this.addTriggerToMonitorAlertConfig = this.monitorAlertConfig.addTriggerToMonitorAlertConfig.bind(
      this.monitorAlertConfig,
    );
    this.addTriggersToMonitorAlertConfig = this.monitorAlertConfig.addTriggersToMonitorAlertConfig.bind(
      this.monitorAlertConfig,
    );
    this.removeTriggerFromMonitorAlertConfig = this.monitorAlertConfig.removeTriggerFromMonitorAlertConfig.bind(
      this.monitorAlertConfig,
    );
    this.removeAllTriggersFromMonitorAlertConfig = this.monitorAlertConfig.removeAllTriggersFromMonitorAlertConfig.bind(
      this.monitorAlertConfig,
    );
    this.getMonitorAlertConfigTriggers = this.monitorAlertConfig.getMonitorAlertConfigTriggers.bind(
      this.monitorAlertConfig,
    );
    this.getMonitorAlertConfigTriggerIds = this.monitorAlertConfig.getMonitorAlertConfigTriggerIds.bind(
      this.monitorAlertConfig,
    );
    this.replaceMonitorAlertConfigTriggers = this.monitorAlertConfig.replaceMonitorAlertConfigTriggers.bind(
      this.monitorAlertConfig,
    );

    // Composite operations
    this.getMonitorAlertConfigWithTriggers = this.monitorAlertConfig.getMonitorAlertConfigWithTriggers.bind(
      this.monitorAlertConfig,
    );
    this.getMonitorAlertConfigsWithTriggersByMonitorTag =
      this.monitorAlertConfig.getMonitorAlertConfigsWithTriggersByMonitorTag.bind(this.monitorAlertConfig);
    this.getActiveMonitorAlertConfigsWithTriggers =
      this.monitorAlertConfig.getActiveMonitorAlertConfigsWithTriggers.bind(this.monitorAlertConfig);
    this.isTriggerUsedInMonitorAlertConfig = this.monitorAlertConfig.isTriggerUsedInMonitorAlertConfig.bind(
      this.monitorAlertConfig,
    );
    this.getMonitorAlertConfigsByTriggerId = this.monitorAlertConfig.getMonitorAlertConfigsByTriggerId.bind(
      this.monitorAlertConfig,
    );

    // Monitor Alerts V2
    this.insertMonitorAlertV2 = this.monitorAlertConfig.insertMonitorAlertV2.bind(this.monitorAlertConfig);
    this.updateMonitorAlertV2 = this.monitorAlertConfig.updateMonitorAlertV2.bind(this.monitorAlertConfig);
    this.updateMonitorAlertV2Status = this.monitorAlertConfig.updateMonitorAlertV2Status.bind(this.monitorAlertConfig);
    this.getMonitorAlertV2ById = this.monitorAlertConfig.getMonitorAlertV2ById.bind(this.monitorAlertConfig);
    this.getMonitorAlertsV2 = this.monitorAlertConfig.getMonitorAlertsV2.bind(this.monitorAlertConfig);
    this.getMonitorAlertsV2ByConfigId = this.monitorAlertConfig.getMonitorAlertsV2ByConfigId.bind(
      this.monitorAlertConfig,
    );
    this.hasTriggeredAlertForConfig = this.monitorAlertConfig.hasTriggeredAlertForConfig.bind(this.monitorAlertConfig);
    this.getActiveAlertForConfig = this.monitorAlertConfig.getActiveAlertForConfig.bind(this.monitorAlertConfig);
    this.getAllTriggeredAlerts = this.monitorAlertConfig.getAllTriggeredAlerts.bind(this.monitorAlertConfig);
    this.deleteMonitorAlertV2 = this.monitorAlertConfig.deleteMonitorAlertV2.bind(this.monitorAlertConfig);
    this.deleteMonitorAlertsV2ByConfigId = this.monitorAlertConfig.deleteMonitorAlertsV2ByConfigId.bind(
      this.monitorAlertConfig,
    );
    this.getMonitorAlertV2WithConfig = this.monitorAlertConfig.getMonitorAlertV2WithConfig.bind(
      this.monitorAlertConfig,
    );
    this.getAllTriggeredAlertsWithConfig = this.monitorAlertConfig.getAllTriggeredAlertsWithConfig.bind(
      this.monitorAlertConfig,
    );
    this.addIncidentToAlert = this.monitorAlertConfig.addIncidentToAlert.bind(this.monitorAlertConfig);
    this.getAlertsByIncidentId = this.monitorAlertConfig.getAlertsByIncidentId.bind(this.monitorAlertConfig);
    this.getMonitorAlertsV2Count = this.monitorAlertConfig.getMonitorAlertsV2Count.bind(this.monitorAlertConfig);
  }

  async init(): Promise<void> {}

  async close(): Promise<void> {
    return await this.knex.destroy();
  }
}

export default DbImpl;
