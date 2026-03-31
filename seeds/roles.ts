import type { Knex } from "knex";
import { permissions } from "../src/lib/allPerms.ts";

/**
 * Seeds the three readonly roles (admin, editor, member),
 * assigns permissions to each role in roles_permissions,
 * and migrates existing users.role → users_roles.
 *
 * Permission mapping derived from src/routes/(manage)/manage/api/+server.ts:
 *
 * admin  → all 25 permissions
 * editor → all except api_keys.delete (AdminCan-only)
 * member → all .read permissions only
 */

const readonlyRoles = [
  { id: "admin", role_name: "Administrator" },
  { id: "editor", role_name: "Editor" },
  { id: "member", role_name: "Member" },
];

const allPermissionIds = permissions.map((p) => p.id);
const readPermissionIds = allPermissionIds.filter((id) => id.endsWith(".read"));

const rolePermissions: Record<string, string[]> = {
  admin: allPermissionIds,
  editor: allPermissionIds.filter((id) => id !== "api_keys.delete"),
  member: readPermissionIds,
};

export async function seed(knex: Knex): Promise<void> {
  // 1. Ensure readonly roles exist
  for (const role of readonlyRoles) {
    const existing = await knex("roles").where("id", role.id).first();
    if (!existing) {
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

  // 2. Seed roles_permissions for readonly roles
  for (const [roleId, permissionIds] of Object.entries(rolePermissions)) {
    const existingPerms: Array<{ permissions_id: string }> = await knex("roles_permissions")
      .where("roles_id", roleId)
      .select("permissions_id");
    const existingSet = new Set(existingPerms.map((e) => e.permissions_id));

    // Insert missing permissions
    for (const permId of permissionIds) {
      if (!existingSet.has(permId)) {
        await knex("roles_permissions").insert({
          roles_id: roleId,
          permissions_id: permId,
          status: "ACTIVE",
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        });
      }
    }

    // Remove permissions no longer assigned to this role
    const desiredSet = new Set(permissionIds);
    const toRemove = existingPerms.filter((e) => !desiredSet.has(e.permissions_id)).map((e) => e.permissions_id);
    if (toRemove.length > 0) {
      await knex("roles_permissions").where("roles_id", roleId).whereIn("permissions_id", toRemove).del();
    }
  }

  // 3. Migrate existing users: read users.role → insert into users_roles
  const hasRoleColumn = await knex.schema.hasColumn("users", "role");
  if (hasRoleColumn) {
    const users: Array<{ id: number; role: string }> = await knex("users").select("id", "role");

    for (const user of users) {
      if (!user.role) continue;

      // Only migrate if a matching role exists
      const roleExists = await knex("roles").where("id", user.role).first();
      if (!roleExists) continue;

      // Skip if already assigned
      const existing = await knex("users_roles").where({ roles_id: user.role, users_id: user.id }).first();
      if (!existing) {
        await knex("users_roles").insert({
          roles_id: user.role,
          users_id: user.id,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        });
      }
    }
  }
}
