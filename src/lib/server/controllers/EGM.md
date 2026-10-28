# controllers

## Overview

This folder is Kener's server business layer. Routes, API handlers, queues, and schedulers call these functions. The functions then call the `db` object from `src/lib/server/db/db.ts`. The layer holds input checks, auth (passwords, JWT sessions, API keys, OIDC, captcha), secret masking, site settings, status page data, and the hand-off of subscriber notifications to `src/lib/server/queues/subscriberQueue.ts`.

## Interface

- `controller.ts` is a barrel file that re-exports `apiController`, `commonController`, `emailController`, `incidentController`, `monitorsController`, `oidcController`, `siteDataController`, `siteDataKeys`, `triggerController`, `userController`, `pagesController`, and `validators`. Import the other controllers by their own path.
- `monitorsController.ts` manages monitors and their data: `CreateMonitor`, `UpdateMonitor`, `CloneMonitor`, `DeleteMonitorCompletelyUsingTag`, `GetMonitorsParsed`, `InsertMonitoringData`, `RegisterHeartbeat`, `MaskMonitorSecrets`, `AttachSslCacheFields`, and `GetBadge`. The file has 37 exports in total.
- `incidentController.ts` manages incidents, comments, and affected monitors: `CreateIncident`, `UpdateIncident`, `AddIncidentComment`, `AddIncidentMonitor`, `CreateNewIncidentWithCommentAndMonitor`, `DeleteIncident`, `GetIncidentsPaginated`, and 16 more.
- `maintenanceController.ts` manages maintenances and their events: `CreateMaintenance`, `UpdateMaintenance`, `DeleteMaintenance`, `CreateMaintenanceEventWithNotification`, `UpdateMaintenanceEventStatus`, `UpdateMaintenanceEventStatuses`, and `isOneTimeRrule`. The file has 32 exports in total. A maintenance repeats on an iCalendar RRULE (a repeat rule string such as `FREQ=WEEKLY;BYDAY=SU`).
- `monitorAlertConfigController.ts` manages alert configs and alerts: `CreateMonitorAlertConfig`, `UpdateMonitorAlertConfig`, `DeleteMonitorAlertConfig`, `CreateMonitorAlertV2`, `UpdateMonitorAlertV2Status`, and `AddIncidentToAlert`. The file has 35 exports in total.
- `triggerController.ts` manages triggers, the saved alert destinations (email, webhook, Slack, Discord): `CreateUpdateTrigger`, `GetAllTriggers`, `GetTriggerByID`, `UpdateTriggerData`, `DeleteTrigger`, `MaskTriggerSecrets`, and `MaskAlertConfigTriggerSecrets`.
- `pagesController.ts` manages status pages and their monitors: `CreatePage`, `UpdatePage`, `DeletePage`, `GetAllPages`, `AddMonitorToPage`, `ReorderPageMonitors`, `RemoveMonitorFromPage`, `GetPageByPathWithMonitors`, and 5 more.
- `dashboardController.ts` builds status page data: `GetPageDashboardData`, `BuildNotificationPayload`, the `Get*ForMonitorList` event getters, the incident page getters `GetIncidentById`, `GetIncidentCommentsByIncidentId`, and `GetAffectedMonitorsByIncidentId`, and the types `PageDashboardData`, `PageNavItem`, and `NotificationPayload`.
- `layoutController.ts` exports `GetLayoutServerData`, which builds the root layout data from site settings, the session, and the user agent.
- `siteDataController.ts` reads and writes site settings: `InsertKeyValue`, `GetAllSiteData`, `GetSiteDataByKey`, `MaskSiteDataSecret`, `RestoreSiteDataSecret`, `HasRequiredEnv`, `IsSetupComplete`, and 6 more. `siteDataKeys.ts` exports `siteDataKeys`, the list of allowed setting keys, each with an `isValid` check and a `data_type`. `validators.ts` holds the checks, such as `IsValidURL`, `IsValidColors`, and `IsValidNav`.
- `userController.ts` manages users, roles, permissions, and invites: `CreateNewUser`, `CreateFirstUser`, `UpdatePassword`, `GetLoggedInSession`, `SendInvitationEmail`, `CreateRole`, `DeleteRole`, `CanSeeHiddenMonitors`, `RequirePermission`, and 23 more.
- `userSubscriptionsController.ts` manages subscribers: `SubscriberLogin`, `VerifySubscriberOTP`, `VerifySubscriberToken`, `UpdateSubscriberPreferences`, `AdminAddSubscriber`, `GetActiveEmailsForEventType`, and 10 more.
- `apiController.ts` manages API keys: `CreateNewAPIKey`, `GetAllAPIKeys`, `UpdateApiKeyStatus`, `DeleteApiKey`, and `VerifyAPIKey`.
- `commonController.ts` holds crypto and env helpers: `HashPassword`, `VerifyPassword`, `ValidatePassword`, `GenerateToken`, `GenerateTokenWithExpiry`, `VerifyToken`, `ForgotPasswordJWT`, `CreateHash`, `CreateMD5Hash`, `MaskString`, `CookieConfig`, `GetSMTPFromENV`, and `SecretKeyWarning`.
- `oidcController.ts` implements OIDC (OpenID Connect) single sign-on: `BuildAuthorizationUrl`, `HandleCallback`, `FindOrCreateOidcUser`, `GenerateOidcSession`, `TestOidcConnection`, `GetOidcSettings`, `ClearOidcConfigCache`, and the class `OidcLoginError`.
- `captchaController.ts` exports `GetActiveCaptchaProvider`, `GetPublicCaptchaConfig`, and `VerifyCaptchaToken` for hCaptcha, reCAPTCHA, and Turnstile.
- `emailController.ts` exports `SendEmailWithTemplate`, `IsResendSetup`, and `IsEmailSetup`. `generalTemplateController.ts` exports `GetAllGeneralEmailTemplates`, `GetGeneralEmailTemplateById`, and `UpdateGeneralEmailTemplate`.
- `imageController.ts` exports `uploadImage`, `ImageUploadError`, and `ImageUploadData`. `dockerController.ts` exports `ListDockerContainers` for the Docker monitor editor.

## Invariants

- `InsertKeyValue` throws for a key that is not in `siteDataKeys` and for a value that fails the key's `isValid` check, before it writes (`siteDataController.ts:116-129`). A new site setting must be added to `siteDataKeys.ts`, or nobody can save it.
- Secrets never leave the server in clear text. `MaskMonitorSecrets`, `MaskTriggerSecrets`, and `MaskSiteDataSecret` replace secret values with a mask on read. On save, an incoming mask is swapped back for the stored secret. The site setting secrets are `oidcSettings.client_secret` and the captcha `Secret Key` fields.
- `KENER_SECRET_KEY` must be set. `commonController.ts:36-45` throws without it, with no fallback. JWT sessions and API key hashes use this key, so a new value signs every user out and breaks every API key.
- A password needs at least 8 characters with a digit, a lowercase letter, and an uppercase letter (`commonController.ts:47-49`). Code hashes it with bcrypt only after `ValidatePassword` passes.
- An API key is `kener_` plus 64 hex characters. The database stores only its HMAC-SHA256 hash and a masked copy, and the plain key is shown once. `VerifyAPIKey` accepts only keys with status `ACTIVE`.
- A monitor tag must match `^[a-z0-9][a-z0-9_-]*[a-z0-9]$`, or be one character from `[a-z0-9]` (`monitorsController.ts:59-64`).
- A user can see hidden monitors only with the `monitors.read` permission (`CanSeeHiddenMonitors`, `userController.ts:677-678`). `RequirePermission` throws when the permission set lacks the permission id. The roles `admin`, `editor`, and `member` are reserved, and the owner always keeps the admin role.
- `page_path` is lowercased, spaces become hyphens, and characters outside `[a-z0-9_-]` are removed. The path must be unique. The home page (path `""`) cannot be deleted.
- Incident and maintenance `start_date_time` and `end_date_time` are Unix seconds. An incident needs a title and a start time, and its end time cannot come before its start time.
- Only incident comments notify incident subscribers (`incidentController.ts:460-470`). The push uses the dedup id `subscriber-incidents-<comment.id>`. The alerting queue must not notify subscribers itself, or an alert-driven incident notifies them twice. An event that is not global and has no visible monitor notifies nobody.
- `UpdateMaintenanceEventStatus` moves an event by hand only to `COMPLETED` (from `ONGOING`) or to `CANCELLED` (from `SCHEDULED`, `READY`, or `ONGOING`) (`maintenanceController.ts:506-518`). `UpdateMaintenanceEventStatuses` moves events on its own from `SCHEDULED` to `READY`, from `SCHEDULED` or `READY` to `ONGOING`, and from `ONGOING` to `COMPLETED`. An RRULE with `COUNT=1` marks a one-time maintenance.
- `uploadImage` accepts only PNG, JPEG, WebP, HEIC, and HEIF. It rejects SVG by content, and it enforces `GC.MAX_UPLOAD_BYTES` (`src/lib/global-constants.ts`), `GC.MAX_INPUT_PIXELS`, and `GC.MAX_IMAGE_DIMENSION`.
- OIDC allows an `http:` issuer only when `NODE_ENV` is `development`. It rejects an OIDC login whose email matches an existing local account.
- `VerifyCaptchaToken` passes when no captcha provider is on. It fails when a provider is on but lacks its keys, or when the token is missing.
- `dashboardController.ts`, `layoutController.ts`, `maintenanceController.ts`, `userController.ts`, and `userSubscriptionsController.ts` import from the `./controller.js` barrel. A change to the barrel can cause a circular import.

## Side Effects

- The controllers write almost every table through `db.*`: monitors and `monitoring_data`, incidents, maintenances, alert configs and alerts, triggers, pages, site data, users and roles, API keys, subscribers, images, and email templates.
- `incidentController.ts` and `maintenanceController.ts` add jobs to `subscriberQueue`. `monitorsController.ts` adds jobs to `alertingQueue` (`src/lib/server/queues/alertingQueue.ts`) after manual data writes and updates the Redis cache in `src/lib/server/cache/`.
- `userController.ts` and `userSubscriptionsController.ts` send email through `sendEmail` in `src/lib/server/notification/email_notification.ts` (invites, address checks, subscriber codes).
- Network calls: `captchaController.ts` posts to the provider's `siteverify` URL with a 5000 ms timeout. `oidcController.ts` calls the OIDC issuer through `openid-client`. `dockerController.ts` calls the Docker daemon. `SendEmailWithTemplate` in `emailController.ts` sends mail through SMTP or Resend, but no code in `src/` calls it.
- `commonController.ts` reads `KENER_SECRET_KEY`, the `SMTP_*` variables, `KENER_BASE_PATH`, and `ORIGIN`. `emailController.ts` reads `RESEND_API_KEY` and `RESEND_SENDER_EMAIL`. `siteDataController.ts` checks `ORIGIN`, `KENER_SECRET_KEY`, and `REDIS_URL`. `oidcController.ts` reads `NODE_ENV`.
- `imageController.ts` stores images as base64 in the `images` table and writes no files.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm run test:server -- "src/lib/server/controllers"`.
- The controllers read and write the database, so a change must also pass on PostgreSQL and MySQL, as the Database section of `CODING_STANDARDS.md` shows.
