import type { Knex } from "knex";

interface LegacyV3Subscriber {
  id: number;
  subscriber_send: string | null;
  subscriber_type: string | null;
  subscriber_status: string | null;
  subscriber_meta: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
}

interface LegacyV3Subscription {
  id: number;
  subscriber_id: number | null;
  subscriptions_status: string | null;
  subscriptions_monitors: string | null;
  subscriptions_meta: string | null;
}

// Kener V3 wrote "ALL" for "every monitor" (getSubscriptionsForMonitor matched
// subscriptions_monitors = 'ALL'); "_" is accepted as well.
const LEGACY_ALL_MONITORS = ["ALL", "_"];

function normalizeEmail(value: string | null | undefined): string {
  return (value || "").toLowerCase().trim();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeStatus(value: string | null | undefined): string {
  return (value || "").toUpperCase();
}

/**
 * Legacy rows store one monitor tag per subscription, but some deployments
 * stored a JSON array (or a comma separated list) in the same column.
 */
function parseMonitorValues(raw: string): string[] {
  const value = raw.trim();
  if (!value) return [];
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string").map((item) => item.trim());
      }
    } catch (_e) {
      /* not JSON, treat it as a single tag below */
    }
  }
  if (value.includes(",")) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [value];
}

async function insertReport(
  knex: Knex,
  source: string,
  sourceId: number | null,
  email: string | null,
  reason: string,
  rawData: unknown,
): Promise<void> {
  await knex("subscription_migration_report").insert({
    source,
    source_id: sourceId,
    subscriber_email: email,
    reason,
    raw_data: rawData === undefined ? null : JSON.stringify(rawData),
    created_at: knex.fn.now(),
  });
}

async function getVisibleMonitorTags(knex: Knex): Promise<string[]> {
  if (!(await knex.schema.hasTable("monitors"))) return [];
  const query = knex("monitors").select("tag").where("status", "ACTIVE");
  if (await knex.schema.hasColumn("monitors", "is_hidden")) {
    query.andWhere("is_hidden", "NO");
  }
  const rows = await query;
  return rows.map((row: { tag: string }) => row.tag).filter(Boolean);
}

async function findMonitorTag(knex: Knex, rawValue: string): Promise<string | null> {
  const value = rawValue.trim();
  if (!value) return null;

  const byTag = await knex("monitors").where("tag", value).first();
  if (byTag) return byTag.tag as string;

  // Older exports occasionally stored the display name instead of the tag.
  const byName = await knex("monitors").where("name", value);
  if (byName.length === 1) return byName[0].tag as string;

  return null;
}

async function ensureMonitorSubscription(
  knex: Knex,
  subscriberUserId: number,
  subscriberMethodId: number,
  monitorTag: string,
  status: string,
): Promise<void> {
  await knex("subscriber_monitor_subscriptions")
    .insert({
      subscriber_user_id: subscriberUserId,
      subscriber_method_id: subscriberMethodId,
      monitor_tag: monitorTag,
      status,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    })
    .onConflict(["subscriber_user_id", "subscriber_method_id", "monitor_tag"])
    .ignore();
}

/**
 * The previous subscription design stored one row per event type
 * ("incidents" / "maintenances") for every subscriber. Those subscribers
 * wanted every incident/maintenance on the status page, which is equivalent
 * to following every monitor that is visible on it.
 */
async function migrateV2EventSubscriptions(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("user_subscriptions_v2"))) return;

  const subscriptions = await knex("user_subscriptions_v2")
    .whereIn("event_type", ["incidents", "maintenances"])
    .andWhere("status", "ACTIVE");

  if (subscriptions.length === 0) return;

  const monitorTags = await getVisibleMonitorTags(knex);
  let mapped = 0;

  for (const subscription of subscriptions) {
    const user = await knex("subscriber_users").where("id", subscription.subscriber_user_id).first();
    const email = user?.email ?? null;

    if (monitorTags.length === 0) {
      await insertReport(
        knex,
        "v2_event_subscription",
        subscription.id,
        email,
        `No visible active monitor to map the "${subscription.event_type}" subscription to`,
        subscription,
      );
      continue;
    }

    for (const tag of monitorTags) {
      await ensureMonitorSubscription(
        knex,
        subscription.subscriber_user_id,
        subscription.subscriber_method_id,
        tag,
        "ACTIVE",
      );
      mapped++;
    }
  }

  console.log(
    `[subscription-migration] Mapped ${subscriptions.length} legacy event subscription(s) to ${mapped} monitor subscription(s).`,
  );
}

/**
 * Kener V3 kept subscribers in `subscribers` and one monitor per row in
 * `subscriptions`. The special value "_" meant every monitor. This runs on
 * databases upgraded from V3, where both tables are still present.
 */
async function migrateV3Subscribers(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("subscribers")) || !(await knex.schema.hasTable("subscriptions"))) {
    return;
  }

  const legacySubscribers = (await knex("subscribers").select("*")) as LegacyV3Subscriber[];
  if (legacySubscribers.length === 0) return;

  const monitorTags = await getVisibleMonitorTags(knex);
  let migratedSubscribers = 0;
  let migratedSubscriptions = 0;

  for (const legacy of legacySubscribers) {
    const email = normalizeEmail(legacy.subscriber_send);
    const subscriberType = normalizeEmail(legacy.subscriber_type);
    const legacyStatus = normalizeStatus(legacy.subscriber_status);

    if (subscriberType !== "email") {
      await insertReport(
        knex,
        "v3_subscriber",
        legacy.id,
        email || null,
        `Unsupported legacy subscriber type "${legacy.subscriber_type || ""}"`,
        legacy,
      );
      continue;
    }

    if (!email || !isEmail(email)) {
      await insertReport(
        knex,
        "v3_subscriber",
        legacy.id,
        email || null,
        "Legacy subscriber has no valid email address",
        legacy,
      );
      continue;
    }

    // Preserve an existing subscriber (for example one added through the V4
    // UI) rather than creating a duplicate for the same email address.
    let user = await knex("subscriber_users").where("email", email).first();
    if (!user) {
      const status = legacyStatus === "ACTIVE" ? "ACTIVE" : legacyStatus === "INACTIVE" ? "INACTIVE" : "PENDING";
      await knex("subscriber_users").insert({
        email,
        status,
        verification_code: null,
        verification_expires_at: null,
        created_at: legacy.created_at || knex.fn.now(),
        updated_at: legacy.updated_at || knex.fn.now(),
      });
      // Re-select by unique email so the code works on SQLite, PostgreSQL,
      // and MySQL (only some engines return the inserted id).
      user = await knex("subscriber_users").where("email", email).first();
    } else if (legacyStatus === "ACTIVE" && user.status !== "ACTIVE") {
      await knex("subscriber_users").where("id", user.id).update({
        status: "ACTIVE",
        updated_at: knex.fn.now(),
      });
      user.status = "ACTIVE";
    }

    if (!user) {
      await insertReport(
        knex,
        "v3_subscriber",
        legacy.id,
        email,
        "Could not create or find the subscriber record during migration",
        legacy,
      );
      continue;
    }

    let method = await knex("subscriber_methods")
      .where({ subscriber_user_id: user.id, method_type: "email", method_value: email })
      .first();
    if (!method) {
      await knex("subscriber_methods").insert({
        subscriber_user_id: user.id,
        method_type: "email",
        method_value: email,
        status: "ACTIVE",
        meta: null,
        created_at: legacy.created_at || knex.fn.now(),
        updated_at: legacy.updated_at || knex.fn.now(),
      });
      method = await knex("subscriber_methods")
        .where({ subscriber_user_id: user.id, method_type: "email", method_value: email })
        .first();
    }

    if (!method) {
      await insertReport(
        knex,
        "v3_subscriber",
        legacy.id,
        email,
        "Could not create or find the subscriber email method during migration",
        legacy,
      );
      continue;
    }

    migratedSubscribers++;

    const legacySubscriptions = (await knex("subscriptions")
      .where("subscriber_id", legacy.id)
      .select("*")) as LegacyV3Subscription[];

    for (const legacySubscription of legacySubscriptions) {
      const subscriptionStatus = normalizeStatus(legacySubscription.subscriptions_status) || "ACTIVE";
      const isAllMonitors = LEGACY_ALL_MONITORS.includes((legacySubscription.subscriptions_monitors || "").trim());
      const values = isAllMonitors ? monitorTags : parseMonitorValues(legacySubscription.subscriptions_monitors || "");

      if (values.length === 0) {
        await insertReport(
          knex,
          "v3_subscription",
          legacySubscription.id,
          email,
          isAllMonitors
            ? "Legacy subscription for all monitors cannot be mapped because no visible active monitors exist"
            : "Legacy subscription has no monitor value",
          legacySubscription,
        );
        continue;
      }

      for (const rawValue of values) {
        const monitorTag = await findMonitorTag(knex, rawValue);
        if (!monitorTag) {
          await insertReport(
            knex,
            "v3_subscription",
            legacySubscription.id,
            email,
            `Legacy subscription references a monitor that does not exist: "${rawValue}"`,
            legacySubscription,
          );
          continue;
        }

        await ensureMonitorSubscription(
          knex,
          user.id,
          method.id,
          monitorTag,
          subscriptionStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE",
        );
        migratedSubscriptions++;
      }
    }
  }

  // Subscriptions whose subscriber row disappeared are still worth surfacing.
  const subscriberIds = new Set(legacySubscribers.map((subscriber) => subscriber.id));
  const orphanSubscriptions = (await knex("subscriptions").select("*")) as LegacyV3Subscription[];
  for (const orphan of orphanSubscriptions) {
    if (orphan.subscriber_id !== null && !subscriberIds.has(orphan.subscriber_id)) {
      await insertReport(
        knex,
        "v3_subscription",
        orphan.id,
        null,
        `Legacy subscription references missing subscriber id ${orphan.subscriber_id}`,
        orphan,
      );
    }
  }

  console.log(
    `[subscription-migration] Migrated ${migratedSubscribers} V3 subscriber(s) and ${migratedSubscriptions} monitor subscription(s).`,
  );
}

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("subscriber_monitor_subscriptions"))) {
    await knex.schema.createTable("subscriber_monitor_subscriptions", (table) => {
      table.increments("id").primary();
      table.integer("subscriber_user_id").unsigned().notNullable();
      table.integer("subscriber_method_id").unsigned().notNullable();
      table.string("monitor_tag", 255).notNullable();
      table.string("status", 20).notNullable().defaultTo("ACTIVE");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.index(["subscriber_user_id"], "sub_monitor_user_index");
      table.index(["subscriber_method_id"], "sub_monitor_method_index");
      table.index(["monitor_tag"], "sub_monitor_tag_index");
      table.index(["status"], "sub_monitor_status_index");
      table.unique(["subscriber_user_id", "subscriber_method_id", "monitor_tag"], {
        indexName: "sub_monitor_user_method_tag_unique",
      });
    });
  }

  try {
    await knex.schema.alterTable("subscriber_monitor_subscriptions", (table) => {
      table.foreign("subscriber_user_id").references("id").inTable("subscriber_users").onDelete("CASCADE");
    });
  } catch (_e) {
    /* foreign key already exists */
  }
  try {
    await knex.schema.alterTable("subscriber_monitor_subscriptions", (table) => {
      table.foreign("subscriber_method_id").references("id").inTable("subscriber_methods").onDelete("CASCADE");
    });
  } catch (_e) {
    /* foreign key already exists */
  }
  try {
    await knex.schema.alterTable("subscriber_monitor_subscriptions", (table) => {
      table.foreign("monitor_tag").references("tag").inTable("monitors").onDelete("CASCADE");
    });
  } catch (_e) {
    /* foreign key already exists */
  }

  if (!(await knex.schema.hasTable("subscription_migration_report"))) {
    await knex.schema.createTable("subscription_migration_report", (table) => {
      table.increments("id").primary();
      table.string("source", 50).notNullable();
      table.integer("source_id").nullable();
      table.string("subscriber_email", 255).nullable();
      table.text("reason").notNullable();
      table.text("raw_data").nullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.index(["source"], "sub_migration_report_source_index");
    });
  }

  await migrateV2EventSubscriptions(knex);
  await migrateV3Subscribers(knex);

  const reportCount = await knex("subscription_migration_report").count("id as count").first();
  const unmapped = Number(reportCount?.count || 0);
  if (unmapped > 0) {
    console.warn(
      `[subscription-migration] ${unmapped} legacy subscriber/subscription row(s) could not be mapped. See the subscription_migration_report table for manual review.`,
    );
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("subscription_migration_report");
  await knex.schema.dropTableIfExists("subscriber_monitor_subscriptions");
}
