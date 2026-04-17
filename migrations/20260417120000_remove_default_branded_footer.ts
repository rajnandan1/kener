import { createHash } from "node:crypto";
import type { Knex } from "knex";

type SiteDataRow = {
  value: string;
};

function normalizeFooterHtml(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function getFooterHash(value: string): string {
  return createHash("sha256").update(normalizeFooterHtml(value)).digest("hex");
}

const LEGACY_BRANDED_FOOTER_HASHES = new Set([
  "5e3cf1d122faf7d674f81fafbb99fdc6095f018b4bcdee5c18e3bc7353c1b310",
  "4abe30bf5e73443770a13e9a3e26227f04f1e84311d3748b1691350d2004d63a",
]);

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable("site_data");
  if (!hasTable) return;

  const footerRow = await knex<SiteDataRow>("site_data").select("value").where({ key: "footerHTML" }).first();
  if (!footerRow?.value) return;

  if (!LEGACY_BRANDED_FOOTER_HASHES.has(getFooterHash(footerRow.value))) {
    return;
  }

  await knex("site_data").where({ key: "footerHTML" }).update({
    value: "",
    updated_at: knex.fn.now(),
  });
}

export async function down(_knex: Knex): Promise<void> {}