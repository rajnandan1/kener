import type { Knex } from "knex";

// Maps the legacy users.role string to the new roles.id value.
// The old default was "user"; everything unmapped falls back to "member".
const ROLE_MAP: Record<string, string> = {
  admin: "admin",
  editor: "editor",
  member: "member",
  user: "member",
};

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("users", "role");
  if (!hasColumn) return;

  // 1. Ensure the three target roles exist so FK inserts succeed.
  //    Seeds will reconcile permissions later; we only need the rows.
  const rolesToEnsure = [
    { id: "admin", role_name: "Administrator" },
    { id: "editor", role_name: "Editor" },
    { id: "member", role_name: "Member" },
  ];
  for (const role of rolesToEnsure) {
    const exists = await knex("roles").where("id", role.id).first();
    if (!exists) {
      await knex("roles").insert({
        id: role.id,
        role_name: role.role_name,
        readonly: 1,
        status: "ACTIVE",
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      });
    }
  }

  // 2. Migrate users.role → users_roles
  const users: Array<{ id: number; role: string }> = await knex("users").select("id", "role");

  for (const user of users) {
    const newRoleId = ROLE_MAP[user.role] ?? "member";

    const alreadyAssigned = await knex("users_roles").where({ roles_id: newRoleId, users_id: user.id }).first();

    if (!alreadyAssigned) {
      await knex("users_roles").insert({
        roles_id: newRoleId,
        users_id: user.id,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      });
    }
  }

  // 3. Now safe to drop the column
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("role");
  });
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn("users", "role");
  if (!hasColumn) {
    await knex.schema.alterTable("users", (table) => {
      table.string("role").defaultTo("member");
    });
  }
}
