import seedPagesData from "../src/lib/server/db/seedPagesData.ts";
import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if the pages table is empty
  const pageCount = await knex("pages").count("id as CNT").first();

  if (pageCount && pageCount.CNT == 0) {
    // One transaction: if a write fails, no page is left behind, so the next start seeds again
    await knex.transaction(async (trx) => {
      // Insert seed pages
      for (const page of seedPagesData) {
        const [insertedPage] = await trx("pages")
          .insert({
            page_path: page.page_path,
            page_title: page.page_title,
            page_header: page.page_header,
            page_subheader: page.page_subheader,
            page_logo: page.page_logo,
            page_settings_json: page.page_settings_json,
            created_at: knex.fn.now(),
            updated_at: knex.fn.now(),
          })
          .returning("id");

        // Seeded pages are visible to everyone. seeds/access_groups.ts runs first and creates "public".
        if (await trx("access_groups").where({ id: "public" }).first()) {
          const pageId = typeof insertedPage === "object" ? insertedPage.id : insertedPage;
          await trx("page_access_groups").insert({ page_id: pageId, access_group_id: "public" });
        }

        // For the home page, add the default monitor (earth) if it exists
        if (page.page_path === "") {
          const earthMonitor = await trx("monitors").where({ tag: "earth" }).first();
          if (earthMonitor) {
            const pageId = typeof insertedPage === "object" ? insertedPage.id : insertedPage;
            await trx("pages_monitors").insert({
              page_id: pageId,
              monitor_tag: "earth",
              monitor_settings_json: "",
              position: 0,
              created_at: knex.fn.now(),
              updated_at: knex.fn.now(),
            });
          }

          const kenerMonitor = await trx("monitors").where({ tag: "kener" }).first();
          if (kenerMonitor) {
            const pageId = typeof insertedPage === "object" ? insertedPage.id : insertedPage;
            await trx("pages_monitors").insert({
              page_id: pageId,
              monitor_tag: "kener",
              monitor_settings_json: "",
              position: 1,
              created_at: knex.fn.now(),
              updated_at: knex.fn.now(),
            });
          }
        }
      }
    });
  }
}
