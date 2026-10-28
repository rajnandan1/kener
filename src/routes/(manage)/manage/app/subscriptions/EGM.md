# Subscriptions Page

## Overview

This route serves `/manage/app/subscriptions`. It turns visitor subscriptions on or off, picks which events send email, and manages the subscribers. A subscriber is a person who gets email about incidents or maintenances. The subscriber data is in `subscriber_users`, `subscriber_methods`, and `user_subscriptions_v2`. The page has no `load` function. It reads and writes through the manage API: the `POST /manage/api` endpoint, which checks a permission for each action.

## Interface

- The page sends `getSubscriptionsConfig` (permission `settings.read`) to load the `subscriptionsSettings` site data key. The page has no Save button for the config. Each of the three config switches calls `handleConfigChange`, which sends `updateSubscriptionsConfig` (permission `settings.write`) with the whole config.
- The page sends `getSiteDataByKey` (permission `settings.read`) with the key `subMenuOptions`. The RSS switch saves `subMenuOptions.showRssFeed` with `storeSiteData` (permission `settings.write`).
- The subscriber table sends `getAdminSubscribers` (permission `subscribers.read`) with `page` and `limit`.
- The add form sends `adminAddSubscriber` (permission `subscribers.write`) with `email`, `incidents`, and `maintenances`.
- The switches on each row send `adminUpdateSubscriptionStatus` (permission `subscribers.write`) with `methodId`, `eventType` (`incidents` or `maintenances`), and `enabled`.
- Delete sends `adminDeleteSubscriber` (permission `subscribers.write`) with `methodId`.

## Invariants

- The layout guard in `src/routes/(manage)/+layout.server.ts` lets only users with `subscribers.read` open this route.
- The config shape is `{ enable, methods: { emails: { incidents, maintenances } } }`. When nothing is stored, the server returns `enable: false` with both event types on.
- The page shows a warning when the layout value `canSendEmail` is `false`, which means email is not set up.
- The add form needs an email that is not empty after trim.
- A row switch writes `incidents_enabled` or `maintenances_enabled` only after the response. It writes the new value on success and the old value on an error.
- Delete needs a confirmation in a dialog.
- `saveConfig` shows "Configuration saved" without reading the response, so it also shows it when the server returns an error.

## Side Effects

- The actions write `site_data` and the subscriber tables.

## Verification

- Run: `npm run check` (svelte-kit sync and the svelte-check type check).
- Run: `npm test` (the full suite). No test covers this directory directly.
