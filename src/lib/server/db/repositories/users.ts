import { BaseRepository, type CountResult } from "./base.js";
import type {
  UserRecordInsert,
  UserRecordPublic,
  ApiKeyRecord,
  ApiKeyRecordInsert,
  RoleRecord,
  RolePermissionRecord,
} from "../../types/db.js";
import { GetDbType } from "../../tool.js";

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

    const insertData = {
      email: data.email,
      name: data.name,
      password_hash: data.password_hash,
      is_owner: data.is_owner || "NO",
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    };

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

  async updateUserRoles(id: number, roleIds: string[]): Promise<void> {
    await this.knex("users_roles").where("users_id", id).delete();
    if (roleIds.length > 0) {
      const inserts = roleIds.map((roleId) => ({
        users_id: id,
        roles_id: roleId,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      }));
      await this.knex("users_roles").insert(inserts);
    }
    await this.knex("users").where({ id }).update({ updated_at: this.knex.fn.now() });
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
        "users.created_at",
        "users.updated_at",
        "users_roles.roles_id",
      );
    const enriched = await this.enrichManyWithRoleIds(rows);
    return enriched.map((u, i) => ({ ...u, roles_id: rows[i].roles_id }));
  }

  async addUserToRole(roleId: string, userId: number): Promise<void> {
    await this.knex("users_roles").insert({
      roles_id: roleId,
      users_id: userId,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async removeUserFromRole(roleId: string, userId: number): Promise<number> {
    return await this.knex("users_roles").where({ roles_id: roleId, users_id: userId }).delete();
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
}
