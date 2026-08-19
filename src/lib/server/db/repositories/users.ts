import type { Knex } from "knex";
import { BaseRepository, type CountResult } from "./base.js";
import type {
  UserRecordInsert,
  UserRecordPublic,
  ApiKeyRecord,
  ApiKeyRecordInsert,
  RoleRecord,
  RolePermissionRecord,
  UserRoleRecord,
  OidcGroupRoleMappingRecord,
  OidcGroupRoleMappingInsert,
} from "../../types/db.js";
import { GetDbType } from "../../tool.js";
import GC from "../../../global-constants.js";

/** Parse the users.oidc_role_ids JSON column; null for NULL or anything that is not a string array. */
function parseOidcRoleIds(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(String(value));
    if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) return null;
    return parsed;
  } catch {
    return null;
  }
}

const sameStringSet = (a: string[], b: string[]): boolean =>
  [...new Set(a)].sort().join("\n") === [...new Set(b)].sort().join("\n");

/**
 * Repository for users, API keys operations
 */
export class UsersRepository extends BaseRepository {
  // ============ Users ============

  async getUsersCount(): Promise<CountResult | undefined> {
    return await this.knex("users").count("* as count").first<CountResult>();
  }

  private readonly userColumns = [
    "id",
    "email",
    "name",
    "is_active",
    "is_verified",
    "is_owner",
    "auth_provider",
    "oidc_issuer",
    "oidc_sub",
    "created_at",
    "updated_at",
  ] as const;

  private async enrichWithRoleIds(user: Record<string, unknown>): Promise<UserRecordPublic> {
    const roleIds = await this.getUserRoleIds(user.id as number);
    return { ...user, role_ids: roleIds } as UserRecordPublic;
  }

  private async enrichManyWithRoleIds(users: Record<string, unknown>[]): Promise<UserRecordPublic[]> {
    if (users.length === 0) return [];
    const userIds = users.map((u) => u.id as number);
    const roleRows = await this.knex("users_roles")
      .join("roles", "users_roles.roles_id", "roles.id")
      .whereIn("users_roles.users_id", userIds)
      .where("roles.status", "ACTIVE")
      .select("users_roles.users_id as users_id", "roles.id as role_id");
    const roleMap = new Map<number, string[]>();
    for (const row of roleRows) {
      const list = roleMap.get(row.users_id) || [];
      list.push(row.role_id);
      roleMap.set(row.users_id, list);
    }
    return users.map((u) => ({ ...u, role_ids: roleMap.get(u.id as number) || [] }) as UserRecordPublic);
  }

  async getUserByEmail(email: string): Promise<UserRecordPublic | undefined> {
    const row = await this.knex("users")
      .select(...this.userColumns)
      .where("email", email)
      .first();
    if (!row) return undefined;
    return await this.enrichWithRoleIds(row);
  }

  async getUserPasswordHashById(id: number): Promise<{ password_hash: string } | undefined> {
    return await this.knex("users").select("password_hash").where("id", id).first();
  }

  async getUserPasswordHashesByIds(ids: number[]): Promise<{ id: number; password_hash: string }[]> {
    if (ids.length === 0) return [];
    return await this.knex("users").select("id", "password_hash").whereIn("id", ids);
  }

  async getUserById(id: number): Promise<UserRecordPublic | undefined> {
    const row = await this.knex("users")
      .select(...this.userColumns)
      .where("id", id)
      .first();
    if (!row) return undefined;
    return await this.enrichWithRoleIds(row);
  }

  async insertUser(data: UserRecordInsert): Promise<number[]> {
    const dbType = GetDbType();

    const insertData: Record<string, unknown> = {
      email: data.email,
      name: data.name,
      password_hash: data.password_hash,
      is_owner: data.is_owner || "NO",
      auth_provider: data.auth_provider || GC.AUTH_PROVIDER_LOCAL,
      oidc_issuer: data.oidc_issuer ?? null,
      oidc_sub: data.oidc_sub ?? null,
      oidc_role_ids: data.oidc_role_ids ? JSON.stringify(data.oidc_role_ids) : null,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };
    if (data.is_active !== undefined) insertData.is_active = data.is_active;
    if (data.is_verified !== undefined) insertData.is_verified = data.is_verified;

    let userId: number;
    if (dbType === "postgresql") {
      const [row] = await this.knex("users").insert(insertData).returning("id");
      userId = typeof row === "object" ? (row as { id: number }).id : (row as number);
    } else {
      const result = await this.knex("users").insert(insertData);
      userId = result[0];
    }

    if (data.role_ids && data.role_ids.length > 0) {
      const roleInserts = data.role_ids.map((roleId) => ({
        users_id: userId,
        roles_id: roleId,
      }));
      await this.knex("users_roles").insert(roleInserts);
    }
    return [userId];
  }

  async updateUserPassword(data: { id: number; password_hash: string }): Promise<number> {
    return await this.knex("users").where({ id: data.id }).update({
      password_hash: data.password_hash,
      updated_at: this.knex.fn.now(),
    });
  }

  async getAllUsers(): Promise<UserRecordPublic[]> {
    const rows = await this.knex("users")
      .select(...this.userColumns)
      .orderBy("created_at", "desc");
    return await this.enrichManyWithRoleIds(rows);
  }

  async getUsersPaginated(page: number, limit: number, filter?: { is_active?: number }): Promise<UserRecordPublic[]> {
    const query = this.knex("users")
      .select(...this.userColumns)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit);
    if (filter?.is_active !== undefined) {
      query.where("is_active", filter.is_active);
    }
    const rows = await query;
    return await this.enrichManyWithRoleIds(rows);
  }

  async getTotalUsers(filter?: { is_active?: number }): Promise<CountResult | undefined> {
    const query = this.knex("users").count("* as count");
    if (filter?.is_active !== undefined) {
      query.where("is_active", filter.is_active);
    }
    return await query.first<CountResult>();
  }

  async updateUserName(id: number, name: string): Promise<number> {
    return await this.knex("users").where({ id }).update({
      name,
      updated_at: this.knex.fn.now(),
    });
  }

  async updateUserProfile(id: number, data: { name?: string; email?: string }): Promise<number> {
    const updateData: Record<string, unknown> = { updated_at: this.knex.fn.now() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    return await this.knex("users").where({ id }).update(updateData);
  }

  /**
   * Serialize every writer of a user's role assignments (admin UI and OIDC sync)
   * on the user's row: `SELECT … FOR UPDATE` on PostgreSQL/MySQL. On SQLite it
   * compiles to a plain SELECT, which is enough — knex runs SQLite on a single
   * connection, so transactions cannot interleave there in the first place.
   * Every role writer takes this lock first, before touching users_roles, so the
   * lock order is uniform and a stale read can never overwrite a newer write.
   */
  private async lockUserRow(trx: Knex.Transaction, id: number): Promise<void> {
    await trx("users").select("id").where({ id }).forUpdate();
  }

  /** Delete-all-then-reinsert inside the caller's transaction. */
  private async replaceUserRoles(trx: Knex.Transaction, id: number, roleIds: string[]): Promise<void> {
    await trx("users_roles").where("users_id", id).delete();
    if (roleIds.length > 0) {
      const inserts = roleIds.map((roleId) => ({
        users_id: id,
        roles_id: roleId,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      }));
      await trx("users_roles").insert(inserts);
    }
  }

  /** Replace the user's role set. Atomic: a failing insert never leaves the user without roles. */
  async updateUserRoles(id: number, roleIds: string[]): Promise<void> {
    await this.knex.transaction(async (trx) => {
      await this.lockUserRow(trx, id);
      await this.replaceUserRoles(trx, id, roleIds);
      await trx("users").where({ id }).update({ updated_at: trx.fn.now() });
    });
  }

  /**
   * Apply an OIDC role sync. `oidc_role_ids` is what the provider grants now
   * (mapped roles, or the default role); `protect` are roles that must never be
   * removed (the owner's admin). Inside one transaction, after locking the
   * user's row, the method reads the current assignments and the roles the
   * previous sync granted (`oidc_role_ids` provenance), then
   *  - removes only roles the previous sync granted that are no longer granted,
   *  - adds only granted roles that are not assigned yet,
   *  - records the new grant set.
   * Roles the sync did not grant are never touched, and because the reads happen
   * under the same lock the admin mutators take, a manual change made while a
   * login is in flight is honoured rather than clobbered. Returns the delta it
   * applied; a no-op writes nothing.
   */
  async applyOidcRoleSync(
    id: number,
    data: { oidc_role_ids: string[]; protect: string[] },
  ): Promise<{ add: string[]; remove: string[] }> {
    return await this.knex.transaction(async (trx) => {
      await this.lockUserRow(trx, id);
      const assignedRows = await trx("users_roles").where("users_id", id).distinct("roles_id as id").select();
      const assigned = new Set<string>(assignedRows.map((r: { id: string }) => r.id));
      const userRow = await trx("users").select("oidc_role_ids").where({ id }).first();
      const previouslyGranted = parseOidcRoleIds(userRow?.oidc_role_ids) ?? [];

      const wanted = new Set<string>([...data.oidc_role_ids, ...data.protect]);
      const remove = previouslyGranted.filter((rid) => !wanted.has(rid) && assigned.has(rid));
      const add = [...wanted].filter((rid) => !assigned.has(rid));
      const grantsChanged = !sameStringSet(previouslyGranted, data.oidc_role_ids);
      if (remove.length === 0 && add.length === 0 && !grantsChanged) return { add, remove };

      if (remove.length > 0) {
        await trx("users_roles").where("users_id", id).whereIn("roles_id", remove).delete();
      }
      if (add.length > 0) {
        await trx("users_roles")
          .insert(
            add.map((roleId) => ({
              users_id: id,
              roles_id: roleId,
              created_at: trx.fn.now(),
              updated_at: trx.fn.now(),
            })),
          )
          .onConflict(["roles_id", "users_id"])
          .ignore();
      }
      await trx("users")
        .where({ id })
        .update({ oidc_role_ids: JSON.stringify(data.oidc_role_ids), updated_at: trx.fn.now() });
      return { add, remove };
    });
  }

  /**
   * Role ids the last OIDC sync granted to the user (provenance). `null` when the
   * user was never synced (or the stored value is unreadable) — callers then treat
   * every current assignment as manual.
   */
  async getUserOidcRoleIds(userId: number): Promise<string[] | null> {
    const row = await this.knex("users").select("oidc_role_ids").where({ id: userId }).first();
    return row ? parseOidcRoleIds(row.oidc_role_ids) : null;
  }

  async updateUserIsActive(id: number, is_active: number): Promise<number> {
    return await this.knex("users").where({ id }).update({
      is_active,
      updated_at: this.knex.fn.now(),
    });
  }

  async updateUserPasswordById(data: { id: number; password_hash: string }): Promise<number> {
    return await this.knex("users").where({ id: data.id }).update({
      password_hash: data.password_hash,
      updated_at: this.knex.fn.now(),
    });
  }

  async updateIsVerified(id: number, is_verified: number): Promise<number> {
    return await this.knex("users").where({ id }).update({
      is_verified: is_verified,
      updated_at: this.knex.fn.now(),
    });
  }

  // ============ API Keys ============

  async createNewApiKey(data: ApiKeyRecordInsert): Promise<number[]> {
    return await this.knex("api_keys").insert({
      name: data.name,
      hashed_key: data.hashed_key,
      masked_key: data.masked_key,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async updateApiKeyStatus(data: { id: number; status: string }): Promise<number> {
    return await this.knex("api_keys").where({ id: data.id }).update({
      status: data.status,
      updated_at: this.knex.fn.now(),
    });
  }

  async deleteApiKey(id: number): Promise<number> {
    return await this.knex("api_keys").where({ id }).delete();
  }

  async getApiKeyByHashedKey(hashed_key: string): Promise<ApiKeyRecord | undefined> {
    return await this.knex("api_keys").where("hashed_key", hashed_key).first();
  }

  async getAllApiKeys(): Promise<ApiKeyRecord[]> {
    return await this.knex("api_keys").orderBy("id", "desc");
  }

  // ============ Invitations ============

  // ============ Roles ============

  async getRoleById(id: string): Promise<RoleRecord | undefined> {
    return await this.knex("roles").where("id", id).first();
  }

  async getAllRoles(): Promise<RoleRecord[]> {
    return await this.knex("roles").orderBy("created_at", "asc");
  }

  async insertRole(data: { id: string; role_name: string; readonly?: number }): Promise<void> {
    await this.knex("roles").insert({
      id: data.id,
      role_name: data.role_name,
      readonly: data.readonly ?? 0,
      status: "ACTIVE",
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async updateRole(id: string, data: { role_name?: string; status?: string }): Promise<number> {
    const updateData: Record<string, unknown> = { updated_at: this.knex.fn.now() };
    if (data.role_name !== undefined) updateData.role_name = data.role_name;
    if (data.status !== undefined) updateData.status = data.status;
    return await this.knex("roles").where("id", id).update(updateData);
  }

  async deleteRole(id: string): Promise<number> {
    return await this.knex("roles").where("id", id).delete();
  }

  async getUsersCountByRoleId(roleId: string): Promise<number> {
    const result = await this.knex("users_roles").where("roles_id", roleId).count("* as count").first<CountResult>();
    return result ? Number(result.count) : 0;
  }

  async migrateUsersRole(fromRoleId: string, toRoleId: string): Promise<void> {
    // Find users who already have the target role to avoid duplicate PK
    const usersWithTarget = this.knex("users_roles").where("roles_id", toRoleId).select("users_id");

    // Update users who don't already have the target role
    await this.knex("users_roles").where("roles_id", fromRoleId).whereNotIn("users_id", usersWithTarget).update({
      roles_id: toRoleId,
      updated_at: this.knex.fn.now(),
    });

    // Delete remaining assignments (users who already had the target role)
    await this.knex("users_roles").where("roles_id", fromRoleId).delete();
  }

  // ============ Role Permissions ============

  async getRolePermissions(roleId: string): Promise<RolePermissionRecord[]> {
    return await this.knex("roles_permissions").where("roles_id", roleId);
  }

  async getAllPermissions(): Promise<Array<{ id: string; permission_name: string }>> {
    return await this.knex("permissions").select("id", "permission_name").orderBy("id", "asc");
  }

  async addRolePermission(roleId: string, permissionId: string): Promise<void> {
    await this.knex("roles_permissions").insert({
      roles_id: roleId,
      permissions_id: permissionId,
      status: "ACTIVE",
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async removeRolePermission(roleId: string, permissionId: string): Promise<number> {
    return await this.knex("roles_permissions").where({ roles_id: roleId, permissions_id: permissionId }).delete();
  }

  // ============ Role Users ============

  async getUsersByRoleId(roleId: string): Promise<Array<UserRecordPublic & { roles_id: string }>> {
    const rows = await this.knex("users_roles")
      .join("users", "users_roles.users_id", "users.id")
      .where("users_roles.roles_id", roleId)
      .select(
        "users.id",
        "users.email",
        "users.name",
        "users.is_active",
        "users.is_verified",
        "users.is_owner",
        "users.auth_provider",
        "users.oidc_issuer",
        "users.oidc_sub",
        "users.created_at",
        "users.updated_at",
        "users_roles.roles_id",
      );
    const enriched = await this.enrichManyWithRoleIds(rows);
    return enriched.map((u, i) => ({ ...u, roles_id: rows[i].roles_id }));
  }

  async addUserToRole(roleId: string, userId: number): Promise<void> {
    await this.knex.transaction(async (trx) => {
      await this.lockUserRow(trx, userId);
      await trx("users_roles").insert({
        roles_id: roleId,
        users_id: userId,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
    });
  }

  async removeUserFromRole(roleId: string, userId: number): Promise<number> {
    return await this.knex.transaction(async (trx): Promise<number> => {
      await this.lockUserRow(trx, userId);
      return await trx("users_roles").where({ roles_id: roleId, users_id: userId }).delete();
    });
  }

  async getUserRoleIds(userId: number): Promise<string[]> {
    const rows = await this.knex("users_roles")
      .join("roles", function () {
        this.on("users_roles.roles_id", "roles.id");
      })
      .where("users_roles.users_id", userId)
      .where("roles.status", "ACTIVE")
      .distinct("roles.id as id")
      .select();
    return rows.map((r: { id: string }) => r.id);
  }

  /** Every role id assigned to the user in users_roles, regardless of role status. */
  async getUserAssignedRoleIds(userId: number): Promise<string[]> {
    const rows = await this.knex("users_roles").where("users_id", userId).distinct("roles_id as id").select();
    return rows.map((r: { id: string }) => r.id);
  }

  async getUserPermissionIds(userId: number): Promise<string[]> {
    const knex = this.knex;
    const rows = await knex("users_roles")
      .join("roles", function () {
        this.on("users_roles.roles_id", "roles.id").andOn("roles.status", knex.raw("?", ["ACTIVE"]));
      })
      .join("roles_permissions", function () {
        this.on("roles_permissions.roles_id", "roles.id").andOn("roles_permissions.status", knex.raw("?", ["ACTIVE"]));
      })
      .where("users_roles.users_id", userId)
      .distinct("roles_permissions.permissions_id as id")
      .select();
    return rows.map((r: { id: string }) => r.id);
  }

  // ============ OIDC ============

  /** The account linked to this (issuer, sub) pair — a subject alone is not an identity. */
  async getUserByOidcIdentity(issuer: string, oidcSub: string): Promise<UserRecordPublic | undefined> {
    const row = await this.knex("users")
      .select(...this.userColumns)
      .where({ oidc_issuer: issuer, oidc_sub: oidcSub })
      .first();
    if (!row) return undefined;
    return await this.enrichWithRoleIds(row);
  }

  // ============ OIDC Group-Role Mappings ============

  async getAllOidcGroupRoleMappings(): Promise<OidcGroupRoleMappingRecord[]> {
    return await this.knex("oidc_group_role_mappings").orderBy("oidc_group", "asc");
  }

  async getOidcGroupRoleMappingByGroup(oidcGroup: string): Promise<OidcGroupRoleMappingRecord | undefined> {
    return await this.knex("oidc_group_role_mappings").where("oidc_group", oidcGroup).first();
  }

  /** Insert or update in one statement (oidc_group is unique); created_at survives an update. */
  async upsertOidcGroupRoleMapping(data: OidcGroupRoleMappingInsert): Promise<void> {
    await this.knex("oidc_group_role_mappings")
      .insert({
        oidc_group: data.oidc_group,
        role_id: data.role_id,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      })
      .onConflict("oidc_group")
      .merge(["role_id", "updated_at"]);
  }

  async deleteOidcGroupRoleMapping(id: number): Promise<number> {
    return await this.knex("oidc_group_role_mappings").where({ id }).delete();
  }

  async getOidcRoleIdsForGroups(oidcGroups: string[]): Promise<string[]> {
    if (oidcGroups.length === 0) return [];
    const rows = await this.knex("oidc_group_role_mappings")
      .whereIn("oidc_group", oidcGroups)
      .join("roles", "oidc_group_role_mappings.role_id", "roles.id")
      .where("roles.status", "ACTIVE")
      .distinct("roles.id as id")
      .select();
    return rows.map((r: { id: string }) => r.id);
  }
}
