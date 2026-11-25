import type { Knex } from "knex";

/**
 * Makes sure the two built-in page access groups exist.
 *
 * public: pages in this group are visible to everyone, without signing in
 * admin:  roles in this group can see every page
 *
 * The migration that adds the tables creates them too. This seed brings them
 * back if they were removed, because page access checks rely on both IDs.
 * Kept free of imports on purpose: seeds run on plain Node at startup.
 */
const systemGroups = [
  {
    id: "public",
    group_name: "Public",
    description: "Pages in this group are visible to everyone, without signing in",
  },
  {
    id: "admin",
    group_name: "All pages",
    description: "Roles in this group can see every page",
  },
];

export async function seed(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable("access_groups"))) return;

  for (const group of systemGroups) {
    const existing = await knex("access_groups").where("id", group.id).first();
    if (!existing) {
      await knex("access_groups").insert({ ...group, is_system: 1 });
    }
  }
}
