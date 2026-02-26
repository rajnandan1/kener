import { BaseRepository, type CountResult } from "./base.js";
import type { UserRecordInsert, UserRecordPublic, ApiKeyRecord, ApiKeyRecordInsert } from "../../types/db.js";

/**
 * Repository for users, API keys operations
 */
export class UsersRepository extends BaseRepository {
  // ============ Users ============

  async getUsersCount(): Promise<CountResult | undefined> {
    return await this.knex("users").count("* as count").first<CountResult>();
  }

  async getUserByEmail(email: string): Promise<UserRecordPublic | undefined> {
    return await this.knex("users")
      .select("id", "email", "name", "is_active", "is_verified", "is_owner", "role", "created_at", "updated_at")
      .where("email", email)
      .first();
  }

  async getUserPasswordHashById(id: number): Promise<{ password_hash: string } | undefined> {
    return await this.knex("users").select("password_hash").where("id", id).first();
  }

  async getUserPasswordHashesByIds(ids: number[]): Promise<{ id: number; password_hash: string }[]> {
    if (ids.length === 0) return [];
    return await this.knex("users").select("id", "password_hash").whereIn("id", ids);
  }

  async getUserById(id: number): Promise<UserRecordPublic | undefined> {
    return await this.knex("users")
      .select("id", "email", "name", "is_active", "is_verified", "is_owner", "role", "created_at", "updated_at")
      .where("id", id)
      .first();
  }

  async insertUser(data: UserRecordInsert): Promise<number[]> {
    return await this.knex("users").insert({
      email: data.email,
      name: data.name,
      password_hash: data.password_hash,
      role: data.role,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  async updateUserPassword(data: { id: number; password_hash: string }): Promise<number> {
    return await this.knex("users").where({ id: data.id }).update({
      password_hash: data.password_hash,
      updated_at: this.knex.fn.now(),
    });
  }

  async getAllUsers(): Promise<UserRecordPublic[]> {
    return await this.knex("users")
      .select("id", "email", "name", "role", "is_active", "is_verified", "is_owner", "created_at", "updated_at")
      .orderBy("created_at", "desc");
  }

  async getUsersPaginated(page: number, limit: number): Promise<UserRecordPublic[]> {
    return await this.knex("users")
      .select("id", "email", "name", "role", "is_active", "is_verified", "is_owner", "created_at", "updated_at")
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset((page - 1) * limit);
  }

  async getTotalUsers(): Promise<CountResult | undefined> {
    return await this.knex("users").count("* as count").first<CountResult>();
  }

  async updateUserName(id: number, name: string): Promise<number> {
    return await this.knex("users").where({ id }).update({
      name,
      updated_at: this.knex.fn.now(),
    });
  }

  async updateUserRole(id: number, role: string): Promise<number> {
    return await this.knex("users").where({ id }).update({
      role,
      updated_at: this.knex.fn.now(),
    });
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
}
