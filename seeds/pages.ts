import seedPagesData from "../src/lib/server/db/seedPagesData.ts";
import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if the pages table is empty
  const pageCount = await knex("pages").count("id as CNT").first();

  if (pageCount && pageCount.CNT == 0) {
    // Insert seed pages
    for (const page of seedPagesData) {
      const [insertedPage] = await knex("pages")
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

      // For the home page, add the default monitor (earth) if it exists
      if (page.page_path === "") {
        const earthMonitor = await knex("monitors").where({ tag: "earth" }).first();
        if (earthMonitor) {
          const pageId = typeof insertedPage === "object" ? insertedPage.id : insertedPage;
          await knex("pages_monitors").insert({
            page_id: pageId,
            monitor_tag: "earth",
            monitor_settings_json: "",
            created_at: knex.fn.now(),
            updated_at: knex.fn.now(),
          });
        }

        const kenerMonitor = await knex("monitors").where({ tag: "kener" }).first();
        if (kenerMonitor) {
          const pageId = typeof insertedPage === "object" ? insertedPage.id : insertedPage;
          await knex("pages_monitors").insert({
            page_id: pageId,
            monitor_tag: "kener",
            monitor_settings_json: "",
            created_at: knex.fn.now(),
            updated_at: knex.fn.now(),
          });
        }
      }
    }
  }
}
