import { BaseRepository } from "./base.js";

export interface VaultRecord {
  id: number;
  secret_name: string;
  secret_value: string; // Encrypted value in DB
  created_at: Date;
  updated_at: Date;
}

export interface VaultInsert {
  secret_name: string;
  secret_value: string; // Should be encrypted before insert
}

export interface VaultUpdate {
  secret_name?: string;
  secret_value?: string; // Should be encrypted before update
}

/**
 * Repository for vault (secrets) operations
 * Note: Encryption/decryption should be handled at the controller level
 */
export class VaultRepository extends BaseRepository {
  /**
   * Get all vault secrets
   */
  async getAllSecrets(): Promise<VaultRecord[]> {
    return await this.knex("vault").orderBy("id", "asc");
  }

  /**
   * Get a secret by ID
   */
  async getSecretById(id: number): Promise<VaultRecord | undefined> {
    return await this.knex("vault").where({ id }).first();
  }

  /**
   * Get a secret by name
   */
  async getSecretByName(secretName: string): Promise<VaultRecord | undefined> {
    return await this.knex("vault").where({ secret_name: secretName }).first();
  }

  /**
   * Insert a new secret
   */
  async insertSecret(data: VaultInsert): Promise<number[]> {
    return await this.knex("vault").insert({
      secret_name: data.secret_name,
      secret_value: data.secret_value,
      created_at: this.knex.fn.now(),
      updated_at: this.knex.fn.now(),
    });
  }

  /**
   * Update a secret by ID
   */
  async updateSecretById(id: number, data: VaultUpdate): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };

    if (data.secret_name !== undefined) {
      updateData.secret_name = data.secret_name;
    }
    if (data.secret_value !== undefined) {
      updateData.secret_value = data.secret_value;
    }

    return await this.knex("vault").where({ id }).update(updateData);
  }

  /**
   * Update a secret by name
   */
  async updateSecretByName(secretName: string, data: VaultUpdate): Promise<number> {
    const updateData: Record<string, unknown> = {
      updated_at: this.knex.fn.now(),
    };

    if (data.secret_name !== undefined) {
      updateData.secret_name = data.secret_name;
    }
    if (data.secret_value !== undefined) {
      updateData.secret_value = data.secret_value;
    }

    return await this.knex("vault").where({ secret_name: secretName }).update(updateData);
  }

  /**
   * Delete a secret by ID
   */
  async deleteSecretById(id: number): Promise<number> {
    return await this.knex("vault").where({ id }).del();
  }

  /**
   * Delete a secret by name
   */
  async deleteSecretByName(secretName: string): Promise<number> {
    return await this.knex("vault").where({ secret_name: secretName }).del();
  }

  /**
   * Check if a secret name already exists
   */
  async secretNameExists(secretName: string, excludeId?: number): Promise<boolean> {
    let query = this.knex("vault").where({ secret_name: secretName });
    if (excludeId !== undefined) {
      query = query.andWhereNot({ id: excludeId });
    }
    const result = await query.first();
    return !!result;
  }

  /**
   * Get secrets count
   */
  async getSecretsCount(): Promise<number> {
    const result = await this.knex("vault").count("id as count").first();
    return Number(result?.count || 0);
  }
}
