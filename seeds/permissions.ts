import type { Knex } from "knex";
import { permissions } from "../src/lib/allPerms.ts";

export async function seed(knex: Knex): Promise<void> {
  const permissionIds = new Set(permissions.map((p) => p.id));

  // Get all existing permissions
  const existing: Array<{ id: string }> = await knex("permissions").select("id");
  const existingIds = new Set(existing.map((e) => e.id));

  // Insert missing permissions
  for (const perm of permissions) {
    if (!existingIds.has(perm.id)) {
      await knex("permissions").insert({
        id: perm.id,
        permission_name: perm.permission_name,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      });
    }
  }

  // Delete permissions that are no longer in the seed list
  const toDelete = existing.filter((e) => !permissionIds.has(e.id)).map((e) => e.id);
  if (toDelete.length > 0) {
    await knex("permissions").whereIn("id", toDelete).del();
  }
}
