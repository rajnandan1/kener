import type { Knex } from "knex";

// Copies the subscribers from before monitor subscriptions into subscriber_monitors, once:
// - Kener 3 (`subscribers`, `subscriptions`): each subscription names a monitor tag, or ALL.
// - Kener 4.0–4.1 (`user_subscriptions_v2`): a subscriber followed all incidents and/or all maintenances.
//   With no monitor to go on, they get every public monitor, and the report marks them ASSUMED.
// The legacy tables are only read, never changed. Each legacy subscriber gets a row in
// subscriber_migration_report; outcome REVIEW holds what could not be copied, for an admin to look at
// in Manage → Subscriptions. A last row (source "run", outcome COMPLETE) marks the copy as done.
//
// Self-contained on purpose: a migration runs on plain Node and may import only leaf files.

const REPORT = "subscriber_migration_report";
const CHUNK = 100;
// Same pattern as ValidateEmail in src/lib/server/tool.ts.
const EMAIL =
  /^(?:(?:[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+\.)*[a-zA-Z0-9!#$%&'*+\-/=?^_`{|}~]+)@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|(?:\[(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\.(?!$)|$)){4}\]))$/;

type Outcome = "MIGRATED" | "ASSUMED" | "REVIEW";

interface ReportRow {
  source: "v3" | "v4";
  // subscribers.id for v3; subscriber_methods.id for v4
  legacy_id: number | null;
  email: string | null;
  outcome: Outcome;
  monitors_added: number;
  details: string;
}

interface MonitorRow {
  tag: string;
  status: string;
  is_hidden: string;
}

interface Context {
  knex: Knex;
  monitors: Map<string, MonitorRow>;
  publicTags: string[];
}

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable(REPORT)) {
    if (await knex(REPORT).where({ source: "run", outcome: "COMPLETE" }).first()) return;
    // An earlier run stopped part way (MySQL commits CREATE TABLE on its own, so the table outlives
    // the rolled-back copy). The copy below finds what exists, so it can start over.
    await knex(REPORT).del();
  } else {
    await knex.schema.createTable(REPORT, (table) => {
      table.increments("id").primary();
      table.string("source", 20).notNullable();
      table.integer("legacy_id").nullable();
      table.string("email", 255).nullable();
      table.string("outcome", 20).notNullable();
      table.integer("monitors_added").notNullable().defaultTo(0);
      table.text("details").nullable();
      table.timestamp("reviewed_at").nullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.index(["outcome"], "sub_migration_report_outcome_index");
    });
  }

  const monitorRows: MonitorRow[] = await knex("monitors").select("tag", "status", "is_hidden");
  const ctx: Context = {
    knex,
    monitors: new Map(monitorRows.map((m) => [m.tag, m])),
    publicTags: monitorRows
      .filter((m) => m.status === "ACTIVE" && m.is_hidden !== "YES")
      .map((m) => m.tag)
      .sort(),
  };
  // Read before copying anything: a subscriber who already picked monitors keeps that choice.
  const pickedMethodIds = new Set<number>(
    (await knex("subscriber_monitors").distinct("subscriber_method_id").pluck("subscriber_method_id")).map(Number),
  );

  const report: ReportRow[] = [];
  if ((await knex.schema.hasTable("subscribers")) && (await knex.schema.hasTable("subscriptions"))) {
    report.push(...(await copyKener3(ctx)));
  }
  if (await knex.schema.hasTable("user_subscriptions_v2")) {
    report.push(...(await copyKener4Events(ctx, pickedMethodIds)));
  }

  for (let i = 0; i < report.length; i += CHUNK) {
    await knex(REPORT).insert(report.slice(i, i + CHUNK).map((row) => ({ ...row, created_at: knex.fn.now() })));
  }
  const count = (outcome: Outcome) => report.filter((r) => r.outcome === outcome).length;
  const summary = {
    v3: report.filter((r) => r.source === "v3").length,
    v4: report.filter((r) => r.source === "v4").length,
    migrated: count("MIGRATED"),
    assumed: count("ASSUMED"),
    review: count("REVIEW"),
  };
  await knex(REPORT).insert({
    source: "run",
    outcome: "COMPLETE",
    monitors_added: report.reduce((sum, r) => sum + r.monitors_added, 0),
    details: JSON.stringify(summary),
    created_at: knex.fn.now(),
  });

  if (report.length > 0) {
    console.log(
      `[subscriber migration] Copied ${summary.v3} Kener 3 and ${summary.v4} Kener 4.0–4.1 subscribers: ` +
        `${summary.assumed} now follow all public monitors, ${summary.review} need review in Manage → Subscriptions.`,
    );
    const review = report.filter((r) => r.outcome === "REVIEW");
    for (const row of review.slice(0, 50)) {
      console.warn(`[subscriber migration] Review ${row.email ?? `#${row.legacy_id}`}: ${row.details}`);
    }
    if (review.length > 50) console.warn(`[subscriber migration] …and ${review.length - 50} more to review.`);
  }
}

export async function down(): Promise<void> {
  // Nothing to undo safely: the copied subscriptions may have changed since. The report table stays,
  // so running up again copies nothing twice.
}

async function copyKener3(ctx: Context): Promise<ReportRow[]> {
  const { knex } = ctx;
  const subscribers: Array<{
    id: number;
    subscriber_send: string;
    subscriber_type: string;
    subscriber_status: string;
  }> = await knex("subscribers").select("id", "subscriber_send", "subscriber_type", "subscriber_status").orderBy("id");
  const subscriptions: Array<{
    id: number;
    subscriber_id: number;
    subscriptions_status: string;
    subscriptions_monitors: string;
  }> = await knex("subscriptions")
    .select("id", "subscriber_id", "subscriptions_status", "subscriptions_monitors")
    .orderBy("id");

  const bySubscriber = new Map<number, typeof subscriptions>();
  for (const s of subscriptions) {
    const id = Number(s.subscriber_id);
    bySubscriber.set(id, [...(bySubscriber.get(id) ?? []), s]);
  }

  const report: ReportRow[] = [];
  const seenEmails = new Set<string>();
  for (const subscriber of subscribers) {
    const own = bySubscriber.get(Number(subscriber.id)) ?? [];
    bySubscriber.delete(Number(subscriber.id));
    const email = String(subscriber.subscriber_send ?? "")
      .trim()
      .toLowerCase();
    const row = (outcome: Outcome, notes: string[], monitorsAdded = 0): ReportRow => ({
      source: "v3",
      legacy_id: Number(subscriber.id),
      email: email || null,
      outcome,
      monitors_added: monitorsAdded,
      details: notes.join("; "),
    });
    const kept = own.map((s) => `"${s.subscriptions_monitors}"`).join(", ") || "none";

    if (subscriber.subscriber_type !== "email") {
      report.push(
        row("REVIEW", [
          `Kener 3 subscriber of type "${subscriber.subscriber_type}": only email can be copied; monitors ${kept}`,
        ]),
      );
      continue;
    }
    if (!EMAIL.test(email)) {
      report.push(row("REVIEW", [`Not a valid email address, so not copied; monitors ${kept}`]));
      continue;
    }

    const notes: string[] = [];
    let review = false;
    const known = subscriber.subscriber_status === "ACTIVE" || subscriber.subscriber_status === "PENDING";
    const status = known ? (subscriber.subscriber_status as "ACTIVE" | "PENDING") : "INACTIVE";
    if (!known) {
      review = true;
      notes.push(`Kener 3 status "${subscriber.subscriber_status}" is unknown`);
    }
    if (seenEmails.has(email)) notes.push("Merged with an earlier Kener 3 subscriber of the same email");
    seenEmails.add(email);

    const tags: string[] = [];
    for (const s of own) {
      const value = String(s.subscriptions_monitors ?? "").trim();
      if (s.subscriptions_status !== "ACTIVE") {
        review = true;
        notes.push(`Subscription to "${value}" was turned off in Kener 3, so not copied`);
      } else if (value === "ALL") {
        tags.push(...ctx.publicTags);
        notes.push(`ALL became the ${ctx.publicTags.length} public monitors; monitors added later are not included`);
        if (ctx.publicTags.length === 0) review = true;
      } else if (ctx.monitors.has(value)) {
        tags.push(value);
        const monitor = ctx.monitors.get(value)!;
        if (monitor.is_hidden === "YES" || monitor.status !== "ACTIVE") {
          review = true;
          notes.push(
            `Monitor "${value}" is ${monitor.is_hidden === "YES" ? "hidden" : "inactive"}: no mail while it stays so`,
          );
        }
      } else {
        review = true;
        notes.push(`Monitor "${value}" no longer exists, so not copied`);
      }
    }
    if (own.length === 0) notes.push("Had no subscriptions in Kener 3");

    const { methodId, userId, userStatus } = await findOrCreateSubscriber(
      knex,
      email,
      status,
      notes,
      () => (review = true),
    );
    if (userStatus === "PENDING") {
      notes.push("Never confirmed their email: no mail until they sign in from the status page");
    } else if (userStatus === "INACTIVE") {
      notes.push("Account is turned off: no mail until an admin adds this email again in Manage → Subscriptions");
    }
    const added = await addMonitors(knex, userId, methodId, tags);
    report.push(row(review ? "REVIEW" : "MIGRATED", notes, added));
  }

  // Subscriptions whose subscriber row is gone: nothing to copy them to, so they are reported.
  for (const [subscriberId, orphans] of bySubscriber) {
    report.push({
      source: "v3",
      legacy_id: subscriberId,
      email: null,
      outcome: "REVIEW",
      monitors_added: 0,
      details: `Subscriptions to ${orphans.map((s) => `"${s.subscriptions_monitors}"`).join(", ")} belong to no Kener 3 subscriber, so not copied`,
    });
  }
  return report;
}

async function copyKener4Events(ctx: Context, pickedMethodIds: Set<number>): Promise<ReportRow[]> {
  const { knex } = ctx;
  const rows: Array<{ id: number; subscriber_method_id: number; event_type: string; status: string }> = await knex(
    "user_subscriptions_v2",
  )
    .select("id", "subscriber_method_id", "event_type", "status")
    .whereIn("event_type", ["incidents", "maintenances"])
    .orderBy("id");
  const byMethod = new Map<number, typeof rows>();
  for (const r of rows) {
    const id = Number(r.subscriber_method_id);
    byMethod.set(id, [...(byMethod.get(id) ?? []), r]);
  }

  const report: ReportRow[] = [];
  for (const [methodId, own] of byMethod) {
    const method = await knex("subscriber_methods").where("id", methodId).first();
    const row = (outcome: Outcome, details: string, monitorsAdded = 0): ReportRow => ({
      source: "v4",
      legacy_id: methodId,
      email: method?.method_value ?? null,
      outcome,
      monitors_added: monitorsAdded,
      details,
    });
    if (!method) {
      report.push(row("REVIEW", "Incident and maintenance subscriptions belong to no subscriber, so not copied"));
      continue;
    }
    const followed = [...new Set(own.filter((r) => r.status === "ACTIVE").map((r) => r.event_type))].sort();
    if (followed.length === 0) {
      report.push(row("MIGRATED", "Had turned off incident and maintenance mail, so no monitors were added"));
    } else if (pickedMethodIds.has(methodId)) {
      report.push(row("MIGRATED", "Had already picked monitors after upgrading, so left as is"));
    } else if (ctx.publicTags.length === 0) {
      report.push(row("REVIEW", `Followed all ${followed.join(" and ")}, but there were no public monitors to follow`));
    } else {
      const added = await addMonitors(knex, Number(method.subscriber_user_id), methodId, ctx.publicTags);
      report.push(
        row(
          "ASSUMED",
          `Followed all ${followed.join(" and ")}: now follows the ${ctx.publicTags.length} public monitors, ` +
            "so also gets their status changes; monitors added later are not included",
          added,
        ),
      );
    }
  }
  return report;
}

// One subscriber per email: an existing Kener 4 account is reused, never duplicated.
async function findOrCreateSubscriber(
  knex: Knex,
  email: string,
  status: "ACTIVE" | "PENDING" | "INACTIVE",
  notes: string[],
  flagReview: () => void,
): Promise<{ userId: number; methodId: number; userStatus: string }> {
  let userId: number;
  let userStatus: string = status;
  const user = await knex("subscriber_users").where("email", email).first();
  if (!user) {
    userId = await insertReturningId(knex, "subscriber_users", {
      email,
      status,
      verification_code: null,
      verification_expires_at: null,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });
  } else {
    userId = Number(user.id);
    userStatus = user.status;
    if (user.status === "PENDING" && status === "ACTIVE") {
      await knex("subscriber_users").where("id", userId).update({ status: "ACTIVE", updated_at: knex.fn.now() });
      userStatus = "ACTIVE";
      notes.push("Account was waiting for its email to be confirmed; Kener 3 had confirmed it");
    } else if (user.status === "INACTIVE" && status !== "INACTIVE") {
      flagReview();
    }
  }

  const method = await knex("subscriber_methods")
    .where({ subscriber_user_id: userId, method_type: "email", method_value: email })
    .first();
  if (method) {
    if (method.status !== "ACTIVE") {
      flagReview();
      notes.push("Email is turned off in Kener 4 and was left off");
    }
    return { userId, methodId: Number(method.id), userStatus };
  }
  const methodId = await insertReturningId(knex, "subscriber_methods", {
    subscriber_user_id: userId,
    method_type: "email",
    method_value: email,
    status: "ACTIVE",
    meta: null,
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });
  return { userId, methodId, userStatus };
}

// Adds the monitors the method does not follow yet, and returns how many.
async function addMonitors(knex: Knex, userId: number, methodId: number, tags: string[]): Promise<number> {
  const existing = new Set<string>(
    await knex("subscriber_monitors").where("subscriber_method_id", methodId).pluck("monitor_tag"),
  );
  const toAdd = [...new Set(tags)].filter((tag) => !existing.has(tag));
  for (let i = 0; i < toAdd.length; i += CHUNK) {
    await knex("subscriber_monitors")
      .insert(
        toAdd.slice(i, i + CHUNK).map((tag) => ({
          subscriber_user_id: userId,
          subscriber_method_id: methodId,
          monitor_tag: tag,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        })),
      )
      .onConflict(["subscriber_method_id", "monitor_tag"])
      .ignore();
  }
  return toAdd.length;
}

async function insertReturningId(knex: Knex, table: string, row: Record<string, unknown>): Promise<number> {
  const client = String(knex.client.config.client);
  if (client === "mysql" || client === "mysql2") {
    const [id] = await knex(table).insert(row);
    return Number(id);
  }
  const [result] = await knex(table).insert(row, ["id"]);
  return Number(typeof result === "object" ? result.id : result);
}
